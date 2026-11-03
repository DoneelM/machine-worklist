"""Claim / note / resolve actions, stored in Lakebase (Postgres).

The app's service principal creates and owns the `worklist` schema on first use.
When Lakebase isn't bound (e.g. local dev without PGHOST), actions are disabled.
"""

from __future__ import annotations

import os
import threading
import time
from typing import Any, cast

import psycopg
from psycopg import sql
from psycopg.rows import dict_row
from databricks.sdk import WorkspaceClient

_lock = threading.Lock()
_token: tuple[str, float] | None = None
_ready = False

DDL = """
CREATE SCHEMA IF NOT EXISTS worklist;
CREATE TABLE IF NOT EXISTS worklist.machine_actions (
  machine_id  text PRIMARY KEY,
  status      text NOT NULL CHECK (status IN ('open', 'claimed', 'resolved')),
  owner       text,
  note        text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS worklist.action_log (
  id          bigserial PRIMARY KEY,
  machine_id  text NOT NULL,
  action      text NOT NULL,
  actor       text,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE worklist.action_log ADD COLUMN IF NOT EXISTS risk_7d double precision;
CREATE INDEX IF NOT EXISTS action_log_machine ON worklist.action_log (machine_id, created_at DESC);
"""


def enabled() -> bool:
    return bool(os.environ.get("PGHOST") and os.environ.get("LAKEBASE_ENDPOINT"))


def _password(ws: WorkspaceClient) -> str:
    global _token
    if _token is None or time.time() > _token[1]:
        cred = ws.postgres.generate_database_credential(endpoint=os.environ["LAKEBASE_ENDPOINT"])
        _token = (cred.token or "", time.time() + 40 * 60)  # tokens last 1h; refresh early
    return _token[0]


def _connect(ws: WorkspaceClient) -> psycopg.Connection[dict[str, Any]]:
    global _ready
    conn = cast("psycopg.Connection[dict[str, Any]]", psycopg.connect(
        host=os.environ["PGHOST"],
        port=int(os.environ.get("PGPORT", "5432")),
        dbname=os.environ.get("PGDATABASE", "databricks_postgres"),
        user=os.environ["PGUSER"],
        password=_password(ws),
        sslmode="require",
        row_factory=cast(Any, dict_row),  # ty can't infer psycopg's generic row type
    ))
    if not _ready:
        with _lock:
            if not _ready:
                conn.execute(DDL)
                conn.commit()
                _grant_readers(conn)
                _ready = True
    return conn


def _grant_readers(conn: psycopg.Connection[dict[str, Any]]) -> None:
    """Read-only access for people who want to query the tables themselves.

    Only the schema owner (this app's service principal) can grant, so it happens here.
    WORKLIST_READ_ROLES is a comma-separated list of Lakebase Postgres roles (usually emails).
    """
    for role in filter(None, (r.strip() for r in os.environ.get("WORKLIST_READ_ROLES", "").split(","))):
        q = sql.Identifier(role)
        try:
            conn.execute(sql.SQL("GRANT USAGE ON SCHEMA worklist TO {}").format(q))
            conn.execute(sql.SQL("GRANT SELECT ON ALL TABLES IN SCHEMA worklist TO {}").format(q))
            conn.execute(sql.SQL("ALTER DEFAULT PRIVILEGES IN SCHEMA worklist GRANT SELECT ON TABLES TO {}").format(q))
            conn.commit()
        except psycopg.Error as e:  # e.g. the role doesn't exist on this branch; never block the app
            conn.rollback()
            print(f"worklist: couldn't grant read to {role}: {e}")


def statuses(ws: WorkspaceClient) -> dict[str, dict[str, Any]]:
    if not enabled():
        return {}
    with _connect(ws) as conn:
        rows = conn.execute("SELECT machine_id, status, owner, note, updated_at FROM worklist.machine_actions").fetchall()
    return {r["machine_id"]: r for r in rows}


def history(ws: WorkspaceClient, machine_id: str) -> list[dict[str, Any]]:
    if not enabled():
        return []
    with _connect(ws) as conn:
        return conn.execute(
            "SELECT action, actor, note, created_at FROM worklist.action_log "
            "WHERE machine_id = %s ORDER BY created_at DESC LIMIT 20",
            (machine_id,),
        ).fetchall()


def apply(
    ws: WorkspaceClient, machine_id: str, action: str, actor: str | None, note: str | None, risk_7d: float | None = None
) -> dict[str, Any]:
    """Upsert on machine_id, so a repeated click can't create duplicate state rows.

    found_issue / false_alarm resolve the machine and log the outcome with the model's risk at that moment.
    """
    status = {
        "claim": "claimed", "resolve": "resolved", "found_issue": "resolved", "false_alarm": "resolved", "reopen": "open",
    }.get(action)
    with _connect(ws) as conn:
        if status:
            row = conn.execute(
                """
                INSERT INTO worklist.machine_actions (machine_id, status, owner, note, updated_at)
                VALUES (%(m)s, %(s)s, %(o)s, %(n)s, now())
                ON CONFLICT (machine_id) DO UPDATE SET
                  status = EXCLUDED.status,
                  owner = CASE WHEN EXCLUDED.status = 'open' THEN NULL ELSE EXCLUDED.owner END,
                  note = COALESCE(EXCLUDED.note, worklist.machine_actions.note),
                  updated_at = now()
                RETURNING machine_id, status, owner, note, updated_at
                """,
                {"m": machine_id, "s": status, "o": actor, "n": note},
            ).fetchone()
        else:  # note only
            row = conn.execute(
                """
                INSERT INTO worklist.machine_actions (machine_id, status, note, updated_at)
                VALUES (%(m)s, 'open', %(n)s, now())
                ON CONFLICT (machine_id) DO UPDATE SET note = EXCLUDED.note, updated_at = now()
                RETURNING machine_id, status, owner, note, updated_at
                """,
                {"m": machine_id, "n": note},
            ).fetchone()
        conn.execute(
            "INSERT INTO worklist.action_log (machine_id, action, actor, note, risk_7d) VALUES (%s, %s, %s, %s, %s)",
            (machine_id, action, actor, note, risk_7d),
        )
        conn.commit()
    assert row is not None
    return row
