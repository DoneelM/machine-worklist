"""Read-only queries against the Delta tables via the SQL warehouse."""

from __future__ import annotations

from typing import Any

from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import StatementParameterListItem, StatementState


def query(
    ws: WorkspaceClient, warehouse_id: str, sql: str, params: dict[str, str] | None = None
) -> list[dict[str, Any]]:
    resp = ws.statement_execution.execute_statement(
        warehouse_id=warehouse_id,
        statement=sql,
        parameters=[StatementParameterListItem(name=k, value=v) for k, v in (params or {}).items()],
        wait_timeout="30s",
    )
    state = resp.status.state if resp.status else None
    if state != StatementState.SUCCEEDED:
        msg = resp.status.error.message if resp.status and resp.status.error else state
        raise RuntimeError(f"Query failed: {msg}")
    columns = (resp.manifest.schema.columns if resp.manifest and resp.manifest.schema else None) or []
    cols = [c.name or "" for c in columns]
    rows = (resp.result.data_array if resp.result else None) or []
    return [dict(zip(cols, r)) for r in rows]
