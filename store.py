"""SQLite-backed human-review queue + feedback log (feeds the next fine-tuning round)."""
import json
import os
import sqlite3
import time

DB = os.getenv("REVIEW_DB", "outputs/review.db")


def _conn():
    os.makedirs(os.path.dirname(DB) or ".", exist_ok=True)
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    return c


def init():
    with _conn() as c:
        c.execute("""CREATE TABLE IF NOT EXISTS queue(
            id INTEGER PRIMARY KEY AUTOINCREMENT, doc TEXT, clause TEXT,
            model_letter TEXT, model_category TEXT, confidence REAL, reasons TEXT, summary TEXT,
            status TEXT DEFAULT 'pending', human_letter TEXT, comment TEXT,
            created REAL, reviewed REAL, UNIQUE(doc, clause))""")


def add_escalations(doc, results):
    with _conn() as c:
        for r in results:
            if r["escalate"]:
                c.execute(
                    "INSERT OR IGNORE INTO queue(doc,clause,model_letter,model_category,confidence,reasons,summary,created)"
                    " VALUES (?,?,?,?,?,?,?,?)",
                    (doc, r["text"], r["letter"], r["category"], r["confidence"],
                     json.dumps(r["reasons"]), r["summary"], time.time()))


def pending():
    with _conn() as c:
        return [dict(r) for r in c.execute("SELECT * FROM queue WHERE status='pending' ORDER BY confidence ASC")]


def resolve(item_id, human_letter, comment=""):
    with _conn() as c:
        c.execute("UPDATE queue SET status='reviewed', human_letter=?, comment=?, reviewed=? WHERE id=?",
                  (human_letter, comment, time.time(), item_id))


def export_feedback_jsonl():
    """Reviewed items as training rows {"text","label"} for the next fine-tuning round."""
    with _conn() as c:
        rows = c.execute("SELECT clause, human_letter FROM queue WHERE status='reviewed'").fetchall()
    return "\n".join(json.dumps({"text": r["clause"], "label": r["human_letter"]}) for r in rows)


def counts():
    with _conn() as c:
        return {r["status"]: r["n"] for r in c.execute("SELECT status, COUNT(*) n FROM queue GROUP BY status")}
