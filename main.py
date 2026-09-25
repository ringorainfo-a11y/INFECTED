import os
import time
import uuid
import json
import math
from datetime import datetime, timezone, timedelta

from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


# =========================================================
# KL MARKETS - XAUUSD M15 SIGNAL SERVER
# TradingView wird NICHT mehr benötigt
# =========================================================

app = FastAPI(title="KL Markets XAUUSD M15 Signal Server")


# =========================================================
# ENVIRONMENT
# =========================================================

WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "")
TWELVE_DATA_API_KEY = os.getenv("TWELVE_DATA_API_KEY", "")


# =========================================================
# STRATEGIE
# =========================================================

SYMBOL = "XAU/USD"
MT5_SYMBOL = "XAUUSD"

TIMEFRAME = "15min"

RSI_PERIOD = 14
RSI_BUY_LEVEL = 30.0
RSI_SELL_LEVEL = 70.0

BB_PERIOD = 20
BB_MULTIPLIER = 2.0

MA_PERIOD = 20

ATR_PERIOD = 14
ATR_SL_MULTIPLIER = 0.25

MAX_LOTS = 0.20
DEFAULT_LOT = 0.01

MIN_RR = 1.50

# Wie viele Kerzen nach einem RSI/BB-Setup noch
# als Bestätigung akzeptiert werden
MAX_SETUP_AGE = 8

# Abstand zur MA20 in ATR
MAX_MA_DISTANCE_ATR = 0.35


# =========================================================
# SIGNAL STORAGE
# =========================================================

latest_signal = None

# Cache verhindert, dass bei jedem MT5-Poll
# eine neue Twelve-Data-Abfrage gemacht wird.
cached_analysis = None
cached_closed_candle_time = None

# Signal-Lebensdauer
SIGNAL_LIFETIME = 120


# =========================================================
# MANUELLE WEBHOOK-KOMPATIBILITÄT
# =========================================================

class Signal(BaseModel):
    secret: str
    symbol: str
    side: str
    lot: float
    sl: float
    tp: float
    id: str | None = None


# =========================================================
# HILFSFUNKTIONEN
# =========================================================

def utc_now():
    return datetime.now(timezone.utc)


def parse_datetime(value: str):
    """
    Twelve Data liefert z.B.
    2026-09-25 14:30:00

    Wir behandeln die Zeit hier als UTC,
    weil wir die API explizit mit timezone=UTC anfragen.
    """
    return datetime.strptime(
        value,
        "%Y-%m-%d %H:%M:%S"
    ).replace(tzinfo=timezone.utc)


def sma(values, period):
    if len(values) < period:
        return None

    window = values[-period:]

    return sum(window) / period


def standard_deviation(values, period):
    if len(values) < period:
        return None

    window = values[-period:]
    mean = sum(window) / period

    variance = sum(
        (x - mean) ** 2
        for x in window
    ) / period

    return math.sqrt(variance)


def rma_series(values, period):
    """
    Wilder RMA.
    Wird für RSI und ATR verwendet.
    """

    if len(values) < period:
        return []

    result = []

    # Erste RMA = SMA
    current = sum(values[:period]) / period
    result.append(current)

    alpha = 1.0 / period

    for value in values[period:]:
        current = (
            alpha * value
            + (1.0 - alpha) * current
        )

        result.append(current)

    return result


def calculate_rsi(closes, period=14):
    if len(closes) <= period:
        return []

    gains = []
    losses = []

    for i in range(1, len(closes)):
        change = closes[i] - closes[i - 1]

        if change > 0:
            gains.append(change)
            losses.append(0.0)
        else:
            gains.append(0.0)
            losses.append(abs(change))

    avg_gain = rma_series(gains, period)
    avg_loss = rma_series(losses, period)

    rsi = []

    for gain, loss in zip(avg_gain, avg_loss):

        if loss == 0:
            if gain == 0:
                rsi.append(50.0)
            else:
                rsi.append(100.0)
            continue

        rs = gain / loss

        value = 100.0 - (
            100.0 / (1.0 + rs)
        )

        rsi.append(value)

    # Vorne mit None auffüllen,
    # damit die Länge zu den Kerzen passt.
    missing = len(closes) - len(rsi)

    return [None] * missing + rsi


def calculate_atr(highs, lows, closes, period=14):

    if len(closes) < period + 1:
        return []

    true_ranges = []

    for i in range(1, len(closes)):

        high = highs[i]
        low = lows[i]
        previous_close = closes[i - 1]

        tr = max(
            high - low,
            abs(high - previous_close),
            abs(low - previous_close)
        )

        true_ranges.append(tr)

    atr_values = rma_series(
        true_ranges,
        period
    )

    missing = len(closes) - len(atr_values)

    return [None] * missing + atr_values


def calculate_bollinger(closes, period=20, multiplier=2.0):

    middle = []
    upper = []
    lower = []

    for i in range(len(closes)):

        if i + 1 < period:
            middle.append(None)
            upper.append(None)
            lower.append(None)
            continue

        window = closes[
            i + 1 - period:i + 1
        ]

        mean = sum(window) / period

        variance = sum(
            (x - mean) ** 2
            for x in window
        ) / period

        std = math.sqrt(variance)

        middle.append(mean)
        upper.append(
            mean + multiplier * std
        )
        lower.append(
            mean - multiplier * std
        )

    return middle, upper, lower


# =========================================================
# TWELVE DATA
# =========================================================

def fetch_market_data():

    if not TWELVE_DATA_API_KEY:
        raise RuntimeError(
            "TWELVE_DATA_API_KEY fehlt."
        )

    params = {
        "symbol": SYMBOL,
        "interval": TIMEFRAME,
        "outputsize": 120,
        "order": "asc",
        "timezone": "UTC",
        "apikey": TWELVE_DATA_API_KEY
    }

    url = (
        "https://api.twelvedata.com/time_series?"
        + urlencode(params)
    )

    request = Request(
        url,
        headers={
            "User-Agent": "KL-Markets-Demo/1.0"
        }
    )

    try:

        with urlopen(
            request,
            timeout=10
        ) as response:

            raw = response.read().decode(
                "utf-8"
            )

    except HTTPError as error:

        body = error.read().decode(
            "utf-8",
            errors="ignore"
        )

        raise RuntimeError(
            f"Twelve Data HTTP {error.code}: {body}"
        )

    except URLError as error:

        raise RuntimeError(
            f"Twelve Data Netzwerkfehler: {error}"
        )

    data = json.loads(raw)

    if data.get("status") == "error":

        raise RuntimeError(
            data.get(
                "message",
                "Unbekannter Twelve-Data-Fehler"
            )
        )

    if "values" not in data:

        raise RuntimeError(
            "Twelve Data liefert keine 'values'."
        )

    candles = []

    now = utc_now()

    for item in data["values"]:

        candle_time = parse_datetime(
            item["datetime"]
        )

        # Eine 15-Minuten-Kerze ist erst nach
        # ihrem kompletten Zeitfenster geschlossen.
        candle_close_time = (
            candle_time.timestamp() + 15 * 60
        )

        if candle_close_time > now.timestamp():
            continue

        candles.append({
            "time": candle_time,
            "open": float(item["open"]),
            "high": float(item["high"]),
            "low": float(item["low"]),
            "close": float(item["close"])
        })

    if len(candles) < 60:

        raise RuntimeError(
            f"Zu wenige geschlossene M15-Kerzen: "
            f"{len(candles)}"
        )

    return candles


# =========================================================
# STRATEGIE
# =========================================================

def analyze_market(candles):

    closes = [
        x["close"]
        for x in candles
    ]

    opens = [
        x["open"]
        for x in candles
    ]

    highs = [
        x["high"]
        for x in candles
    ]

    lows = [
        x["low"]
        for x in candles
    ]

    rsi = calculate_rsi(
        closes,
        RSI_PERIOD
    )

    atr = calculate_atr(
        highs,
        lows,
        closes,
        ATR_PERIOD
    )

    bb_middle, bb_upper, bb_lower = (
        calculate_bollinger(
            closes,
            BB_PERIOD,
            BB_MULTIPLIER
        )
    )

    ma20 = bb_middle

    i = len(candles) - 1

    if i < 5:
        return {
            "status": "NO_TRADE",
            "reason": "Zu wenige Daten."
        }

    current = candles[i]

    current_rsi = rsi[i]
    previous_rsi = rsi[i - 1]

    current_atr = atr[i]

    current_ma = ma20[i]
    current_upper = bb_upper[i]
    current_lower = bb_lower[i]

    if any(
        x is None
        for x in [
            current_rsi,
            previous_rsi,
            current_atr,
            current_ma,
            current_upper,
            current_lower
        ]
    ):

        return {
            "status": "NO_TRADE",
            "reason": "Indikatoren noch nicht vollständig."
        }

    # -----------------------------------------------------
    # 2 Kerzen Bestätigung
    # -----------------------------------------------------

    two_green = (
        closes[i] > opens[i]
        and closes[i - 1] > opens[i - 1]
    )

    two_red = (
        closes[i] < opens[i]
        and closes[i - 1] < opens[i - 1]
    )

    # -----------------------------------------------------
    # BUY SETUP SUCHEN
    # -----------------------------------------------------

    buy_setup_index = None

    start = max(
        0,
        i - MAX_SETUP_AGE
    )

    for setup_i in range(i - 2, start - 1, -1):

        if rsi[setup_i] is None:
            continue

        if bb_lower[setup_i] is None:
            continue

        oversold = (
            rsi[setup_i] < RSI_BUY_LEVEL
        )

        lower_band_touch = (
            lows[setup_i]
            <= bb_lower[setup_i]
        )

        if oversold and lower_band_touch:

            buy_setup_index = setup_i
            break

    # -----------------------------------------------------
    # SELL SETUP SUCHEN
    # -----------------------------------------------------

    sell_setup_index = None

    for setup_i in range(i - 2, start - 1, -1):

        if rsi[setup_i] is None:
            continue

        if bb_upper[setup_i] is None:
            continue

        overbought = (
            rsi[setup_i] > RSI_SELL_LEVEL
        )

        upper_band_touch = (
            highs[setup_i]
            >= bb_upper[setup_i]
        )

        if overbought and upper_band_touch:

            sell_setup_index = setup_i
            break

    # -----------------------------------------------------
    # BUY
    # -----------------------------------------------------

    buy_conditions = {}

    if buy_setup_index is not None:

        setup_low = lows[
            buy_setup_index
        ]

        # Kein neues Tief nach dem Setup
        no_new_low = all(
            lows[j] >= setup_low
            for j in range(
                buy_setup_index + 1,
                i + 1
            )
        )

        rsi_rising = (
            current_rsi > previous_rsi
        )

        ma_distance = abs(
            current["close"] - current_ma
        )

        ma_ok = (
            ma_distance
            <= MAX_MA_DISTANCE_ATR
            * current_atr
            or current["close"] >= current_ma
        )

        buy_sl = (
            setup_low
            - ATR_SL_MULTIPLIER
            * current_atr
        )

        buy_entry = current["close"]

        buy_tp = current_upper

        buy_risk = (
            buy_entry - buy_sl
        )

        buy_reward = (
            buy_tp - buy_entry
        )

        buy_rr = (
            buy_reward / buy_risk
            if buy_risk > 0
            else 0
        )

        buy_conditions = {
            "rsi_oversold": True,
            "rsi_rising": rsi_rising,
            "two_green_candles": two_green,
            "no_new_low": no_new_low,
            "bollinger_touch": True,
            "ma20_ok": ma_ok,
            "rr_ok": buy_rr >= MIN_RR
        }

        if all(buy_conditions.values()):

            signal_id = (
                "BUY-"
                + candles[i]["time"].strftime(
                    "%Y%m%d%H%M"
                )
            )

            return {
                "status": "SIGNAL",
                "id": signal_id,
                "symbol": MT5_SYMBOL,
                "side": "BUY",
                "lot": DEFAULT_LOT,
                "sl": round(buy_sl, 2),
                "tp": round(buy_tp, 2),
                "entry_reference": round(
                    buy_entry,
                    2
                ),
                "rr": round(
                    buy_rr,
                    2
                ),
                "rsi": round(
                    current_rsi,
                    2
                ),
                "atr": round(
                    current_atr,
                    2
                ),
                "ma20": round(
                    current_ma,
                    2
                ),
                "bb_upper": round(
                    current_upper,
                    2
                ),
                "bb_lower": round(
                    current_lower,
                    2
                ),
                "candle_time": (
                    candles[i]["time"]
                    .isoformat()
                ),
                "reason": (
                    "BUY: RSI oversold + "
                    "RSI rising + 2 green candles + "
                    "BB touch + no new low + "
                    "MA20 confirmation + RR >= 1.5"
                )
            }

    # -----------------------------------------------------
    # SELL
    # -----------------------------------------------------

    sell_conditions = {}

    if sell_setup_index is not None:

        setup_high = highs[
            sell_setup_index
        ]

        # Kein neues Hoch nach dem Setup
        no_new_high = all(
            highs[j] <= setup_high
            for j in range(
                sell_setup_index + 1,
                i + 1
            )
        )

        rsi_falling = (
            current_rsi < previous_rsi
        )

        ma_distance = abs(
            current["close"] - current_ma
        )

        ma_ok = (
            ma_distance
            <= MAX_MA_DISTANCE_ATR
            * current_atr
            or current["close"] <= current_ma
        )

        sell_sl = (
            setup_high
            + ATR_SL_MULTIPLIER
            * current_atr
        )

        sell_entry = current["close"]

        sell_tp = current_lower

        sell_risk = (
            sell_sl - sell_entry
        )

        sell_reward = (
            sell_entry - sell_tp
        )

        sell_rr = (
            sell_reward / sell_risk
            if sell_risk > 0
            else 0
        )

        sell_conditions = {
            "rsi_overbought": True,
            "rsi_falling": rsi_falling,
            "two_red_candles": two_red,
            "no_new_high": no_new_high,
            "bollinger_touch": True,
            "ma20_ok": ma_ok,
            "rr_ok": sell_rr >= MIN_RR
        }

        if all(sell_conditions.values()):

            signal_id = (
                "SELL-"
                + candles[i]["time"].strftime(
                    "%Y%m%d%H%M"
                )
            )

            return {
                "status": "SIGNAL",
                "id": signal_id,
                "symbol": MT5_SYMBOL,
                "side": "SELL",
                "lot": DEFAULT_LOT,
                "sl": round(sell_sl, 2),
                "tp": round(sell_tp, 2),
                "entry_reference": round(
                    sell_entry,
                    2
                ),
                "rr": round(
                    sell_rr,
                    2
                ),
                "rsi": round(
                    current_rsi,
                    2
                ),
                "atr": round(
                    current_atr,
                    2
                ),
                "ma20": round(
                    current_ma,
                    2
                ),
                "bb_upper": round(
                    current_upper,
                    2
                ),
                "bb_lower": round(
                    current_lower,
                    2
                ),
                "candle_time": (
                    candles[i]["time"]
                    .isoformat()
                ),
                "reason": (
                    "SELL: RSI overbought + "
                    "RSI falling + 2 red candles + "
                    "BB touch + no new high + "
                    "MA20 confirmation + RR >= 1.5"
                )
            }

    # -----------------------------------------------------
    # KEIN SIGNAL
    # -----------------------------------------------------

    return {
        "status": "NO_TRADE",
        "symbol": MT5_SYMBOL,
        "candle_time": (
            candles[i]["time"]
            .isoformat()
        ),
        "rsi": round(
            current_rsi,
            2
        ),
        "atr": round(
            current_atr,
            2
        ),
        "ma20": round(
            current_ma,
            2
        ),
        "bb_upper": round(
            current_upper,
            2
        ),
        "bb_lower": round(
            current_lower,
            2
        ),
        "reason": (
            "Kein vollständiges Regelwerk-Setup."
        )
    }


# =========================================================
# ANALYSE MIT CACHE
# =========================================================

def get_current_analysis():

    global cached_analysis
    global cached_closed_candle_time

    now = utc_now()

    quarter = (now.minute // 15) * 15

    current_bucket = now.replace(
        minute=quarter,
        second=0,
        microsecond=0
    )

    expected_closed_candle = (
        current_bucket - timedelta(minutes=15)
    )

    expected_time = expected_closed_candle

    if (
        cached_analysis is not None
        and cached_closed_candle_time == expected_time
    ):
        return cached_analysis

    candles = fetch_market_data()

    analysis = analyze_market(candles)

    cached_analysis = analysis
    cached_closed_candle_time = expected_time

    return analysis

# =========================================================
# API
# =========================================================

@app.get("/")
def home():

    return {
        "status": "online",
        "service": (
            "KL Markets XAUUSD M15 "
            "Signal Server"
        ),
        "mode": "DEMO"
    }


@app.get("/health")
def health():

    return {
        "status": "ok"
    }


@app.get("/analysis")
def analysis():

    try:

        result = get_current_analysis()

        return result

    except Exception as error:

        return {
            "status": "ERROR",
            "message": str(error)
        }


@app.get("/signal")
def get_signal():

    global latest_signal

    try:

        result = get_current_analysis()

    except Exception as error:

        print(
            "ANALYSE FEHLER:",
            error
        )

        return {
            "status": "NO_SIGNAL",
            "reason": (
                "Market-Daten konnten "
                "nicht geladen werden."
            )
        }

    # -----------------------------------------------------
    # NEUES SIGNAL
    # -----------------------------------------------------

    if result.get("status") == "SIGNAL":

        latest_signal = {
            "id": result["id"],
            "symbol": result["symbol"],
            "side": result["side"],
            "lot": result["lot"],
            "sl": result["sl"],
            "tp": result["tp"],
            "created_at": time.time(),
            "expires_at": (
                time.time()
                + SIGNAL_LIFETIME
            )
        }

        print(
            "SIGNAL:",
            result
        )

        return latest_signal

    # -----------------------------------------------------
    # ALTES SIGNAL ABGELAUFEN
    # -----------------------------------------------------

    if (
        latest_signal is not None
        and time.time()
        <= latest_signal["expires_at"]
    ):

        return latest_signal

    return {
        "status": "NO_SIGNAL"
    }


# =========================================================
# MANUELLER WEBHOOK
# Bleibt erhalten, damit alte Tests funktionieren.
# TradingView wird dafür aber nicht mehr benötigt.
# =========================================================

@app.post("/webhook")
def webhook(signal: Signal):

    global latest_signal

    if not WEBHOOK_SECRET:

        raise HTTPException(
            status_code=500,
            detail=(
                "WEBHOOK_SECRET "
                "is not configured"
            )
        )

    if signal.secret != WEBHOOK_SECRET:

        raise HTTPException(
            status_code=401,
            detail="Invalid secret"
        )

    if signal.side not in [
        "BUY",
        "SELL"
    ]:

        raise HTTPException(
            status_code=400,
            detail="Invalid side"
        )

    if (
        signal.lot <= 0
        or signal.lot > MAX_LOTS
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid lot size"
        )

    if (
        signal.sl <= 0
        or signal.tp <= 0
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid SL or TP"
        )

    signal_id = (
        signal.id
        or str(uuid.uuid4())
    )

    latest_signal = {

        "id": signal_id,

        "symbol": signal.symbol,

        "side": signal.side,

        "lot": signal.lot,

        "sl": signal.sl,

        "tp": signal.tp,

        "created_at": time.time(),

        "expires_at": (
            time.time()
            + SIGNAL_LIFETIME
        )
    }

    print(
        "MANUELLES SIGNAL:",
        latest_signal
    )

    return {
        "status": "accepted",
        "id": signal_id
    }
