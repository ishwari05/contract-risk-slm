"""FastAPI backend application for ClauseGuard AI.
Provides clean SaaS REST API endpoints and serves frontend static assets.
"""
import json
import logging
import os
import sys
import time
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Add current and root directory to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend import database, service
import store

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("clauseguard.api")

app = FastAPI(
    title="ClauseGuard AI API",
    description="Domain-adapted Qwen SLM Contract Risk Intelligence Platform API",
    version="2.4.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    database.init_db()
    # Trigger background load of ClauseAnalyzer so it is warm
    service.get_analyzer()
    logger.info("ClauseGuard AI API initialized.")


# Request/Response Schemas
class DecisionRequest(BaseModel):
    status: str = "reviewed"  # "reviewed" | "approved" | "corrected" | "escalated"
    category: Optional[str] = None
    letter: Optional[str] = None
    comment: Optional[str] = ""


class SettingsUpdateRequest(BaseModel):
    tau: Optional[str] = None
    tau_high: Optional[str] = None
    min_margin: Optional[str] = None
    target_accuracy: Optional[str] = None
    organization_name: Optional[str] = None
    lead_counsel: Optional[str] = None
    risk_mapping: Optional[Dict[str, str]] = None


# Endpoints

@app.get("/api/model/status")
def get_model_status():
    """Returns local SLM status, device info, temperature, and calibration stats."""
    status_info = service.get_analyzer_status()
    calib = {}
    if os.path.exists("outputs/calibration.json"):
        try:
            calib = json.load(open("outputs/calibration.json"))
        except Exception:
            pass
    status_info.update({
        "temperature": calib.get("temperature", 0.943),
        "tau": calib.get("tau", 0.80),
        "tau_high": calib.get("tau_high", 0.90),
        "min_margin": calib.get("min_margin", 0.15),
        "privacy": "On-Premise (Zero External Transmission)",
        "adapter_version": "v2.4-qlora-r16-cuad"
    })
    return status_info


@app.get("/api/contracts")
def list_contracts(filter: Optional[str] = None, search: Optional[str] = None):
    """List contracts with filtering and search."""
    return database.get_all_contracts(filter_type=filter, search=search)


@app.get("/api/contracts/{contract_id}")
def get_contract(contract_id: str):
    """Retrieve full contract details and clauses."""
    res = database.get_contract(contract_id)
    if not res:
        raise HTTPException(status_code=404, detail="Contract not found")
    return res


@app.get("/api/contracts/{contract_id}/clauses")
def get_contract_clauses(contract_id: str, risk: Optional[str] = None, escalate: Optional[bool] = None):
    """Retrieve clauses for a given contract with filtering."""
    contract = database.get_contract(contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    clauses = contract.get("clauses", [])
    if risk:
        clauses = [c for c in clauses if c["risk"] == risk]
    if escalate is not None:
        clauses = [c for c in clauses if c["escalate"] == escalate]
    return clauses


@app.post("/api/contracts/upload")
async def upload_contract(file: UploadFile = File(...), tau: Optional[float] = Form(None)):
    """Uploads a contract (PDF or TXT), extracts text, runs risk analysis, and returns results."""
    try:
        content = await file.read()
        filename = file.filename or "uploaded_contract.pdf"
        
        # Extract text
        try:
            raw_text = service.extract_text_from_file(content, filename)
        except Exception as e:
            return JSONResponse(
                status_code=422,
                content={
                    "error": "extraction_failed",
                    "title": "We couldn't extract text from this PDF",
                    "reasons": [
                        "Scanned document without embedded text layer",
                        "Unsupported font encoding or encryption",
                        "Corrupted PDF structure",
                        "Multi-column complex layout requiring OCR"
                    ],
                    "actions": ["Try Another PDF", "Run OCR Pre-processing"]
                }
            )

        if not raw_text or not raw_text.strip():
            return JSONResponse(
                status_code=422,
                content={
                    "error": "empty_text",
                    "title": "We couldn't extract text from this PDF",
                    "reasons": [
                        "Scanned document containing only bitmap images",
                        "PDF has zero text stream objects"
                    ],
                    "actions": ["Try Another PDF", "Run OCR Pre-processing"]
                }
            )

        # Run analysis
        result = service.analyze_text(raw_text, filename, tau=tau)
        return result
    except Exception as e:
        logger.error(f"Contract analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/contracts/{contract_id}/analyze")
def reanalyze_contract(contract_id: str, tau: Optional[float] = None):
    """Re-analyzes an existing contract."""
    contract = database.get_contract(contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    raw_text = contract.get("raw_text", "")
    if not raw_text:
        # Generate text from existing clauses
        raw_text = "\n\n".join(c["text"] for c in contract.get("clauses", []))
    
    result = service.analyze_text(raw_text, contract["filename"], tau=tau)
    return result


@app.get("/api/review-queue")
def get_review_queue(priority: Optional[str] = None):
    """Get prioritized list of clauses requiring lawyer review."""
    return database.get_review_queue(filter_priority=priority)


@app.post("/api/review/{clause_id}/decision")
def submit_review_decision(clause_id: str, req: DecisionRequest):
    """Submits lawyer review decision for a clause, updating DB, store.py, and feedback.jsonl."""
    success = database.update_clause_review(clause_id, req.dict())
    if not success:
        raise HTTPException(status_code=404, detail="Clause not found")
    return {"status": "success", "clause_id": clause_id, "updated": True}


@app.get("/api/analytics")
def get_analytics():
    """Retrieve full analytics payload."""
    return database.get_analytics_data()


@app.get("/api/settings")
def get_settings():
    """Get workspace and AI configuration settings."""
    return database.get_settings()


@app.post("/api/settings")
def save_settings(settings: SettingsUpdateRequest):
    """Update settings."""
    updates = {k: v for k, v in settings.dict().items() if v is not None}
    return database.update_settings(updates)


@app.get("/api/active-learning/export")
def export_feedback():
    """Export feedback dataset for LoRA fine-tuning."""
    data = store.export_feedback_jsonl()
    return PlainTextResponse(data or "", media_type="application/x-jsonlines", headers={
        "Content-Disposition": "attachment; filename=feedback.jsonl"
    })


@app.post("/api/demo/seed")
def reseed_demo():
    """Reset / seed demo data."""
    database.seed_demo_data_if_empty()
    return {"status": "success", "message": "Demo contracts initialized"}


@app.get("/api/reports/{contract_id}")
def get_contract_report(contract_id: str):
    """Generates structured executive report for print/export."""
    contract = database.get_contract(contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    clauses = contract.get("clauses", [])
    high_risk_clauses = [c for c in clauses if c["risk"] == "High"]
    escalated_clauses = [c for c in clauses if c["escalate"]]
    
    return {
        "contract": contract,
        "executive_summary": {
            "overall_risk": contract["overall_risk"],
            "total_clauses": contract["total_clauses"],
            "high_risk_count": contract["high_risk_count"],
            "escalated_count": contract["escalated_count"],
            "avg_confidence": contract["avg_confidence"],
            "generated_date": time.strftime("%B %d, %Y"),
            "prepared_for": "Apex Global Partners LLP Legal Team"
        },
        "priority_issues": high_risk_clauses[:5],
        "ambiguous_clauses": escalated_clauses,
        "categories_breakdown": {
            "High": contract["high_risk_count"],
            "Medium": contract["medium_risk_count"],
            "Low": contract["low_risk_count"],
            "None": contract["none_risk_count"]
        }
    }


# Static files mount for frontend
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
