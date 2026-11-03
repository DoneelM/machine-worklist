import json

from databricks.sdk.errors import DatabricksError
from typing import Literal

from databricks.sdk.service.iam import User as UserOut
from fastapi import HTTPException

from . import actions, genie
from .core import Dependencies, create_router
from .core._config import logger
from .models import (
    ActionIn,
    ActionState,
    AskIn,
    AskOut,
    FiltersOut,
    MachineDetailOut,
    ModelEvalOut,
    VersionOut,
    WorklistItem,
    WorklistOut,
)
from .warehouse import query

router = create_router()

ITEM_COLS = (
    "machine_id, plant, line, machine_type, attention_score, top_driver, vib_trend, temp_change, "
    "defects_per_1k, yield_shortfall, serious_defects, critical_defects, risk_7d, risk_lift, risk_rank, drivers"
)
# machine_risk_7d is written by notebooks/train_failure_risk.py; LEFT JOIN so the list still works before scoring.
SOURCE = "{s}.machine_attention a LEFT JOIN {s}.machine_risk_7d r USING (machine_id)"
ORDER = {"risk": "risk_7d DESC NULLS LAST, attention_score DESC", "score": "attention_score DESC"}


def _item(row: dict, states: dict) -> WorklistItem:
    state = states.get(row["machine_id"])
    drivers = json.loads(row.pop("drivers") or "[]")
    return WorklistItem(**row, drivers=drivers, action=ActionState(**state) if state else ActionState())


@router.get("/version", response_model=VersionOut, operation_id="version")
async def version():
    return VersionOut.from_metadata()


@router.get("/current-user", response_model=UserOut, operation_id="currentUser")
def me(user_ws: Dependencies.UserClient):
    return user_ws.current_user.me()


@router.get("/filters", response_model=FiltersOut, operation_id="getFilters")
def filters(ws: Dependencies.Client, config: Dependencies.Config):
    rows = query(
        ws,
        config.warehouse_id,
        f"SELECT collect_set(plant) plants, collect_set(machine_type) types FROM {config.data_schema}.machine_attention",
    )
    return FiltersOut(
        plants=sorted(json.loads(rows[0]["plants"])), machine_types=sorted(json.loads(rows[0]["types"]))
    )


@router.get("/worklist", response_model=WorklistOut, operation_id="getWorklist")
def worklist(
    ws: Dependencies.Client,
    config: Dependencies.Config,
    plant: str = "",
    machine_type: str = "",
    sort: Literal["score", "risk"] = "score",  # the rule leads; the model is a second opinion
):
    rows = query(
        ws,
        config.warehouse_id,
        f"SELECT {ITEM_COLS}, as_of, scored_for_day FROM {SOURCE.format(s=config.data_schema)} "
        "WHERE (:plant = '' OR plant = :plant) AND (:mtype = '' OR machine_type = :mtype) "
        f"ORDER BY {ORDER[sort]}",
        {"plant": plant, "mtype": machine_type},
    )
    states = actions.statuses(ws)
    as_of = rows[0]["as_of"] if rows else None
    scored_for = next((r["scored_for_day"] for r in rows if r["scored_for_day"]), None)
    for r in rows:
        r.pop("as_of", None)
        r.pop("scored_for_day", None)
    return WorklistOut(
        as_of=as_of or "1970-01-01T00:00:00",
        risk_scored_for=scored_for,
        actions_enabled=actions.enabled(),
        items=[_item(r, states) for r in rows],
    )


@router.get("/model-eval", response_model=ModelEvalOut | None, operation_id="getModelEval")
def model_eval(ws: Dependencies.Client, config: Dependencies.Config):
    try:
        rows = query(ws, config.warehouse_id, f"SELECT * FROM {config.data_schema}.failure_risk_eval LIMIT 1")
    except RuntimeError:  # not trained yet
        return None
    return ModelEvalOut(**rows[0]) if rows else None


@router.get("/machines/{machine_id}", response_model=MachineDetailOut, operation_id="getMachine")
def machine(machine_id: str, ws: Dependencies.Client, config: Dependencies.Config):
    rows = query(
        ws,
        config.warehouse_id,
        f"SELECT {ITEM_COLS}, vib_recent, vib_baseline, temp_recent, temp_baseline, units_planned, units_produced "
        f"FROM {SOURCE.format(s=config.data_schema)} WHERE machine_id = :id",
        {"id": machine_id},
    )
    if not rows:
        raise HTTPException(404, f"Machine {machine_id} not found")
    daily = query(
        ws,
        config.warehouse_id,
        f"SELECT * FROM {config.data_schema}.machine_daily WHERE machine_id = :id ORDER BY day",
        {"id": machine_id},
    )
    row = rows[0]
    extra = {k: row.pop(k) for k in ("vib_recent", "vib_baseline", "temp_recent", "temp_baseline", "units_planned", "units_produced")}
    states = actions.statuses(ws) if actions.enabled() else {}
    return MachineDetailOut(
        item=_item(row, states),
        **extra,
        daily=daily,
        history=actions.history(ws, machine_id),
    )


@router.post("/machines/{machine_id}/actions", response_model=ActionState, operation_id="applyAction")
def apply_action(
    machine_id: str,
    body: ActionIn,
    ws: Dependencies.Client,
    config: Dependencies.Config,
    headers: Dependencies.Headers,
):
    if not actions.enabled():
        raise HTTPException(503, "Actions need the Lakebase database, which is only bound in the deployed app.")
    if body.action == "note" and not (body.note or "").strip():
        raise HTTPException(422, "A note can't be empty.")
    actor = headers.user_email or headers.user_name
    # Snapshot the model's risk alongside the outcome, so found_issue / false_alarm become future training labels.
    risk = None
    if body.action in ("found_issue", "false_alarm"):
        rows = query(
            ws,
            config.warehouse_id,
            f"SELECT risk_7d FROM {config.data_schema}.machine_risk_7d WHERE machine_id = :id",
            {"id": machine_id},
        )
        risk = float(rows[0]["risk_7d"]) if rows and rows[0]["risk_7d"] is not None else None
    return ActionState(**actions.apply(ws, machine_id, body.action, actor, body.note, risk))


@router.post("/ask", response_model=AskOut, operation_id="askData")
def ask_data(body: AskIn, ws: Dependencies.Client, config: Dependencies.Config):
    if not config.genie_space_id:
        raise HTTPException(503, "The Genie space isn't configured (MACHINE_WORKLIST_GENIE_SPACE_ID).")
    question = body.question.strip()
    if not question:
        raise HTTPException(422, "Ask a question first.")
    # Genie runs as the app's identity (CAN_RUN on the space via the genie-space app resource).
    # Asking as the signed-in user needs the 'genie' user-authorization scope, which this workspace
    # doesn't grant to apps: user tokens get "403 Invalid scope, required scopes: genie".
    try:
        return genie.ask(ws, config.genie_space_id, question[:1000], body.conversation_id)
    except TimeoutError:
        raise HTTPException(504, "Genie took more than 2 minutes. Try a narrower question.")
    except DatabricksError as e:
        logger.error("Genie failed: %s", str(e)[:2000])
        raise HTTPException(502, f"Genie couldn't answer: {str(e).splitlines()[0][:200]}")
