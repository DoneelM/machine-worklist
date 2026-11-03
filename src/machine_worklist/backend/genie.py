"""'Ask the data': a thin wrapper over the Genie Conversation API.

Runs as the signed-in user (OBO), so Genie only sees data that person can read.
The space is defined in genie/build_space.py; its id comes from MACHINE_WORKLIST_GENIE_SPACE_ID.
"""

from __future__ import annotations

from datetime import timedelta

from databricks.sdk import WorkspaceClient

from .models import AskOut, AskTable

MAX_ROWS = 50  # the panel is narrow; Genie's own UI is there for bigger results


def ask(ws: WorkspaceClient, space_id: str, question: str, conversation_id: str | None) -> AskOut:
    g = ws.genie
    wait = timedelta(seconds=120)
    msg = (
        g.create_message_and_wait(space_id, conversation_id, question, timeout=wait)
        if conversation_id
        else g.start_conversation_and_wait(space_id, question, timeout=wait)
    )
    out = AskOut(
        conversation_id=msg.conversation_id,
        message_id=msg.message_id or msg.id or "",
        status=msg.status.value if msg.status else "",
    )
    if msg.error:
        out.error = msg.error.error or "Genie couldn't answer that."
    for a in msg.attachments or []:
        if a.text and a.text.content:
            out.text = a.text.content
        if a.suggested_questions and a.suggested_questions.questions:
            out.suggestions = list(a.suggested_questions.questions)
        if a.query and a.query.query:
            out.sql = a.query.query
            out.sql_title = a.query.description or a.query.title
            if a.attachment_id:
                out.table = _table(g, space_id, msg.conversation_id, out.message_id, a.attachment_id)
    return out


def _table(g, space_id: str, conversation_id: str, message_id: str, attachment_id: str) -> AskTable | None:
    res = g.get_message_attachment_query_result(space_id, conversation_id, message_id, attachment_id)
    sr = res.statement_response
    if not sr or not sr.manifest or not sr.manifest.schema:
        return None
    cols = [c.name or "" for c in sr.manifest.schema.columns or []]
    rows = (sr.result.data_array if sr.result else None) or []
    total = sr.manifest.total_row_count or len(rows)
    return AskTable(columns=cols, rows=rows[:MAX_ROWS], total_rows=total)
