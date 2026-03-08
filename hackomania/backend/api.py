"""FastAPI wrapper for the SP AI Energy Coach analytics workflow.

Run:
  uvicorn api:app --reload
"""

from __future__ import annotations

import os
import tempfile
from datetime import date, datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import sys
sys.path.insert(0, str(Path(__file__).parent))

from mock_data_generator import DEFAULT_TARIFF, generate_workbook
from sp_energy_app import AnalyticsEngine, ExcelLoader, get_latest_generated_file, _build_prompt
from puter import PuterAI


app = FastAPI(title="SP Energy Coach API", version="1.0.0")
PROJECT_ROOT = Path(__file__).resolve().parent
PARENT_ROOT = PROJECT_ROOT.parent.parent


def _detect_data_root() -> Path:
    """Prefer explicit DATA_ROOT, otherwise pick a sensible writable project root."""
    env_root = (os.getenv("DATA_ROOT") or "").strip()
    if env_root:
        return Path(env_root).resolve()

    # Local workspace keeps generated_data two levels above backend.
    if (PARENT_ROOT / "generated_data").exists():
        return PARENT_ROOT

    # In container deployments, backend is usually the app root.
    if (PROJECT_ROOT / "generated_data").exists():
        return PROJECT_ROOT

    return PROJECT_ROOT


DATA_ROOT = _detect_data_root()


@app.middleware("http")
async def strip_api_prefix_for_hosting(request: Request, call_next):
    """Allow both /x and /api/x paths so Firebase Hosting rewrites work."""
    if request.scope.get("path", "").startswith("/api/"):
        request.scope["path"] = request.scope["path"][4:]
    elif request.scope.get("path", "") == "/api":
        request.scope["path"] = "/"
    return await call_next(request)

# Load .env from detected roots when present, then fallback to default behavior.
load_dotenv(dotenv_path=PARENT_ROOT / ".env")
load_dotenv(dotenv_path=PROJECT_ROOT / ".env")
load_dotenv()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzePathRequest(BaseModel):
    file_path: str


class GenerateRequest(BaseModel):
    days: int = 90
    tariff: float = DEFAULT_TARIFF
    out_dir: str = "generated_data"


class AIInsightsRequest(BaseModel):
    generated_dir: str = "generated_data"
    puter_username: str | None = None
    puter_password: str | None = None


class ChatRequest(BaseModel):
    message: str
    generated_dir: str = "generated_data"
    puter_username: str | None = None
    puter_password: str | None = None
    clear_history: bool = False


def _to_jsonable(value: Any) -> Any:
    """Convert pandas/numpy values into plain JSON-safe Python types."""
    if isinstance(value, dict):
        return {str(k): _to_jsonable(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_to_jsonable(v) for v in value]
    if isinstance(value, tuple):
        return [_to_jsonable(v) for v in value]
    if isinstance(value, (pd.Timestamp, datetime, date)):
        return value.isoformat()
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return float(value)
    if isinstance(value, (np.bool_,)):
        return bool(value)
    if pd.isna(value):
        return None
    return value


def _analyze_excel(file_path: str) -> dict[str, Any]:
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")

    try:
        loader = ExcelLoader(file_path)
        engine = AnalyticsEngine(loader)
        if not engine.results:
            raise HTTPException(
                status_code=422,
                detail="Could not extract data from workbook. Check sheet and column names.",
            )

        return {
            "file": str(Path(file_path).resolve()),
            "tariff": loader.tariff,
            "results": _to_jsonable(engine.results),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}") from exc


def _resolve_data_dir(path_value: str) -> Path:
    """Resolve data directory relative to project root when path is not absolute."""
    candidate = Path(path_value)
    if not candidate.is_absolute():
        candidate = DATA_ROOT / candidate
    return candidate


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze/path")
def analyze_by_path(payload: AnalyzePathRequest) -> dict[str, Any]:
    return _analyze_excel(payload.file_path)


@app.get("/analyze/latest")
def analyze_latest(generated_dir: str = "generated_data") -> dict[str, Any]:
    resolved_dir = _resolve_data_dir(generated_dir)
    latest = get_latest_generated_file(str(resolved_dir))
    if not latest:
        raise HTTPException(status_code=404, detail=f"No .xlsx files found in {resolved_dir}")
    return _analyze_excel(latest)


@app.post("/analyze/upload")
async def analyze_upload(file: UploadFile = File(...)) -> dict[str, Any]:
    suffix = Path(file.filename or "uploaded.xlsx").suffix or ".xlsx"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        temp_path = tmp.name
        data = await file.read()
        tmp.write(data)

    try:
        return _analyze_excel(temp_path)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.post("/generate")
def generate_data(payload: GenerateRequest) -> dict[str, Any]:
    if payload.days < 30:
        raise HTTPException(status_code=422, detail="days must be at least 30")

    out_dir = _resolve_data_dir(payload.out_dir)
    os.makedirs(out_dir, exist_ok=True)
    filename, sheets = generate_workbook(days=payload.days, tariff=payload.tariff)
    out_path = out_dir / filename

    try:
        with pd.ExcelWriter(out_path, engine="openpyxl") as writer:
            for sheet_name, df in sheets.items():
                df.to_excel(writer, sheet_name=sheet_name, index=False)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not write file: {exc}") from exc

    return {
        "message": "Generated fresh data",
        "file": str(Path(out_path).resolve()),
        "days": payload.days,
        "tariff": payload.tariff,
    }


@app.get("/analytics/full")
def get_full_analytics(generated_dir: str = "generated_data") -> dict[str, Any]:
    """Get complete analytics results with all KPIs from AnalyticsEngine."""
    resolved_dir = _resolve_data_dir(generated_dir)
    latest = get_latest_generated_file(str(resolved_dir))
    if not latest:
        raise HTTPException(status_code=404, detail=f"No .xlsx files found in {resolved_dir}")
    
    return _analyze_excel(latest)


def _build_fallback_insights(results: dict[str, Any]) -> list[dict[str, str]]:
    """Build deterministic insight cards when upstream AI is unavailable."""
    peak_ratio_pct = float(results.get("peak_ratio_pct") or 0.0)
    peak_saving = float(results.get("potential_peak_saving") or 0.0)
    standby_cost = float(results.get("standby_monthly_cost") or 0.0)
    standby_saving = float(results.get("potential_standby_saving") or 0.0)
    anomaly_count = int(results.get("anomaly_count") or 0)
    energy_score = int(results.get("energy_score") or 0)
    est_bill = float(results.get("est_monthly_bill") or 0.0)
    weekend_uplift = float(results.get("weekend_uplift_pct") or 0.0)

    return [
        {
            "category": "STANDBY",
            "priority": "HIGH" if standby_cost >= 10 else "MEDIUM",
            "headline": f"Standby loads are costing about S${standby_cost:.2f}/month",
            "explanation": (
                "Your overnight baseline suggests avoidable standby usage from always-on devices. "
                "Smart strips and timer cutoffs can reduce this quickly."
            ),
            "action": "Turn off idle entertainment and kitchen devices overnight this week.",
            "saving": f"S${standby_saving:.2f}/month",
        },
        {
            "category": "PEAK",
            "priority": "HIGH" if peak_ratio_pct > 45 else "MEDIUM",
            "headline": f"Peak-hour usage is {peak_ratio_pct:.1f}% of total consumption",
            "explanation": (
                "Shifting heavy loads out of 6-10 PM improves tariff efficiency and lowers bill volatility. "
                "Laundry and dishwasher timing are usually the easiest wins."
            ),
            "action": "Run laundry and dishwasher after 10 PM for the next billing cycle.",
            "saving": f"S${peak_saving:.2f}/month",
        },
        {
            "category": "ANOMALY",
            "priority": "HIGH" if anomaly_count > 0 else "LOW",
            "headline": f"Detected {anomaly_count} unusual usage spike(s) in the past week",
            "explanation": (
                "Unexpected spikes often come from water heaters, dryers, or charging sessions left on longer than usual. "
                "Reviewing those windows can prevent repeat events."
            ),
            "action": "Check devices used around recent spike times and set reminders/automation.",
            "saving": "Varies by appliance",
        },
        {
            "category": "PROGRESS",
            "priority": "LOW" if energy_score >= 70 else "MEDIUM",
            "headline": f"Energy score is {energy_score}/100 with estimated bill S${est_bill:.2f}",
            "explanation": (
                f"Weekend usage is {weekend_uplift:.1f}% above weekday levels, which suggests behavior-based savings opportunities. "
                "Small routine changes can improve your score month over month."
            ),
            "action": "Pick one weekend routine to optimize first (AC setpoint, laundry timing, or standby control).",
            "saving": "Compounded monthly savings",
        },
    ]


def _try_puter_insights(prompt: str, username: str, password: str) -> tuple[list[dict[str, Any]], str, str | None]:
    """Try Puter with preferred model list; return parsed cards, raw response, model used."""
    preferred_models: list[str] = []
    env_model = (os.getenv("PUTER_MODEL") or "").strip()
    if env_model:
        preferred_models.append(env_model)

    preferred_models.extend(
        [
            "gpt-4o-mini",
            "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
            "deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free",
            "claude-sonnet-4",
        ]
    )

    # De-duplicate while preserving order.
    model_candidates = list(dict.fromkeys(preferred_models))

    ai = PuterAI(username=username, password=password)
    if not ai.login():
        raise Exception("Puter AI authentication failed")

    last_response = ""
    for model_name in model_candidates:
        response = ai.chat(prompt, model=model_name)
        last_response = str(response or "")
        insights = _parse_insight_cards(response)
        if insights:
            return insights, last_response, model_name

    return [], last_response, None


@app.post("/insights/ai")
def generate_ai_insights(payload: AIInsightsRequest) -> dict[str, Any]:
    """Generate AI-powered insights using Puter AI."""
    # Get latest analytics
    resolved_dir = _resolve_data_dir(payload.generated_dir)
    latest = get_latest_generated_file(str(resolved_dir))
    if not latest:
        raise HTTPException(status_code=404, detail=f"No .xlsx files found in {resolved_dir}")

    loader = ExcelLoader(latest)
    engine = AnalyticsEngine(loader)
    results = engine.results

    summary = {
        "energy_score": results.get("energy_score"),
        "monthly_consumption": results.get("total_kwh_30d"),
        "estimated_bill": results.get("est_monthly_bill"),
        "peak_ratio": results.get("peak_ratio_pct"),
    }

    # Credentials are optional because endpoint can fall back to local insights.
    username = payload.puter_username or os.getenv("PUTER_USERNAME")
    password = payload.puter_password or os.getenv("PUTER_PASSWORD")
    if not username or not password:
        return {
            "source": "fallback",
            "warning": "Puter credentials not configured. Returned local insights.",
            "insights": _build_fallback_insights(results),
            "raw_response": "",
            "analytics_summary": summary,
        }

    try:
        prompt = _build_prompt(results)
        insights, response_text, model_used = _try_puter_insights(prompt, username, password)
        if insights:
            return {
                "source": "puter",
                "model": model_used,
                "insights": insights,
                "raw_response": response_text,
                "analytics_summary": summary,
            }

        return {
            "source": "fallback",
            "warning": "Puter returned no structured insight cards across candidate models. Returned local insights.",
            "insights": _build_fallback_insights(results),
            "raw_response": response_text,
            "analytics_summary": summary,
        }
    except Exception as exc:
        return {
            "source": "fallback",
            "warning": f"Puter unavailable ({exc}). Returned local insights.",
            "insights": _build_fallback_insights(results),
            "raw_response": "",
            "analytics_summary": summary,
        }


# Global AI instance for chat persistence
_ai_instance: PuterAI | None = None


@app.post("/chat")
def ai_chat(payload: ChatRequest) -> dict[str, Any]:
    """Interactive AI chat endpoint with conversation history."""
    global _ai_instance
    
    # Get credentials
    username = payload.puter_username or os.getenv("PUTER_USERNAME")
    password = payload.puter_password or os.getenv("PUTER_PASSWORD")
    
    if not username or not password:
        raise HTTPException(
            status_code=400,
            detail="Puter credentials required. Set PUTER_USERNAME and PUTER_PASSWORD environment variables or pass in request."
        )
    
    try:
        # Initialize or reuse AI instance
        if _ai_instance is None or payload.clear_history:
            _ai_instance = PuterAI(username=username, password=password)
            if not _ai_instance.login():
                raise HTTPException(status_code=401, detail="Puter AI authentication failed")
            
            # Load context from latest analytics if starting fresh
            if payload.clear_history:
                resolved_dir = _resolve_data_dir(payload.generated_dir)
                latest = get_latest_generated_file(str(resolved_dir))
                if latest:
                    loader = ExcelLoader(latest)
                    engine = AnalyticsEngine(loader)
                    context_prompt = _build_prompt(engine.results)
                    _ai_instance.chat(context_prompt)
        
        # Send user message
        response = _ai_instance.chat(payload.message)
        
        return {
            "response": response,
            "message": payload.message,
        }
        
    except Exception as e:
        # generic exception covers authentication/API issues
        raise HTTPException(status_code=500, detail=f"Chat failed: {e}")


def _parse_insight_cards(response: str) -> list[dict[str, Any]]:
    """Parse AI response into structured insight cards."""
    cards = []
    card_texts = response.split("--- CARD")
    
    for card_text in card_texts:
        card_text = card_text.strip()
        if not card_text or not card_text[0].isdigit():
            continue
        
        lines = card_text.splitlines()
        fields = {}
        for line in lines[1:]:
            if ":" in line:
                k, _, v = line.partition(":")
                fields[k.strip()] = v.strip()
        
        if fields:
            cards.append({
                "category": fields.get("Category", ""),
                "priority": fields.get("Priority", ""),
                "headline": fields.get("Headline", ""),
                "explanation": fields.get("Explanation", ""),
                "action": fields.get("Action", ""),
                "saving": fields.get("Saving", ""),
            })
    
    return cards
