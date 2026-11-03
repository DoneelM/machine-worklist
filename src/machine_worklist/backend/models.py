from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel
from .. import __version__


class VersionOut(BaseModel):
    version: str

    @classmethod
    def from_metadata(cls):
        return cls(version=__version__)


Status = Literal["open", "claimed", "resolved"]
Driver = Literal["vibration", "defects", "yield"]


class ActionState(BaseModel):
    status: Status = "open"
    owner: str | None = None
    note: str | None = None
    updated_at: datetime | None = None


class RiskDriver(BaseModel):
    feature: str
    label: str
    value: float | str
    percentile: float | None = None  # within machine type on the scored day
    contribution: float  # what-if: risk minus risk with this feature at a typical value; positive pushes risk up


class WorklistItem(BaseModel):
    machine_id: str
    plant: str
    line: str
    machine_type: str
    attention_score: float
    top_driver: Driver
    vib_trend: float
    defects_per_1k: float
    yield_shortfall: float
    serious_defects: int
    critical_defects: int
    risk_7d: float | None = None  # model probability of being in the fleet's worst 10% next week
    risk_lift: float | None = None  # risk_7d / fleet average today
    risk_rank: int | None = None
    drivers: list[RiskDriver] = []
    action: ActionState


class WorklistOut(BaseModel):
    as_of: datetime
    risk_scored_for: date | None = None
    actions_enabled: bool
    items: list[WorklistItem]


class FiltersOut(BaseModel):
    plants: list[str]
    machine_types: list[str]


class DailyPoint(BaseModel):
    day: date
    vibration_mm_s: float
    temperature_c: float
    units_planned: int
    units_produced: int
    critical_defects: int
    major_defects: int
    minor_defects: int


class LogEntry(BaseModel):
    action: str
    actor: str | None
    note: str | None
    created_at: datetime


class MachineDetailOut(BaseModel):
    item: WorklistItem
    vib_recent: float
    vib_baseline: float
    temp_recent: float
    units_planned: int
    units_produced: int
    daily: list[DailyPoint]
    history: list[LogEntry]


class ActionIn(BaseModel):
    action: Literal["claim", "note", "resolve", "found_issue", "false_alarm", "reopen"]
    note: str | None = None


class ModelEvalOut(BaseModel):
    """Rule vs model on the held-out weeks (notebooks/train_failure_risk.py)."""

    model_version: str
    label: str
    train_end: date
    test_start: date
    test_end: date
    crew_capacity: int
    base_rate: float
    model_auc: float
    rule_auc: float
    model_precision_at_20: float
    rule_precision_at_20: float
