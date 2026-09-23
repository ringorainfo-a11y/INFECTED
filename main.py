import os
import time
import uuid

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


app = FastAPI(title="KL Markets Signal Server")

WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "")

latest_signal = None


class Signal(BaseModel):
    secret: str
    symbol: str
    side: str
    lot: float
    sl: float
    tp: float
    id: str | None = None


@app.get("/")
def home():
    return {
        "status": "online",
        "service": "KL Markets Signal Server"
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/webhook")
def webhook(signal: Signal):
    global latest_signal

    if not WEBHOOK_SECRET:
        raise HTTPException(
            status_code=500,
            detail="WEBHOOK_SECRET is not configured"
        )

    if signal.secret != WEBHOOK_SECRET:
        raise HTTPException(
            status_code=401,
            detail="Invalid secret"
        )

    if signal.side not in ["BUY", "SELL"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid side"
        )

    if signal.lot <= 0 or signal.lot > 0.20:
        raise HTTPException(
            status_code=400,
            detail="Invalid lot size"
        )

    if signal.sl <= 0 or signal.tp <= 0:
        raise HTTPException(
            status_code=400,
            detail="Invalid SL or TP"
        )

    signal_id = signal.id or str(uuid.uuid4())

    latest_signal = {
        "id": signal_id,
        "symbol": signal.symbol,
        "side": signal.side,
        "lot": signal.lot,
        "sl": signal.sl,
        "tp": signal.tp,
        "created_at": time.time(),
        "expires_at": time.time() + 120
    }

    return {
        "status": "accepted",
        "id": signal_id
    }


@app.get("/signal")
def get_signal():
    if latest_signal is None:
        return {"status": "NO_SIGNAL"}

    if time.time() > latest_signal["expires_at"]:
        return {"status": "NO_SIGNAL"}

    return latest_signal
