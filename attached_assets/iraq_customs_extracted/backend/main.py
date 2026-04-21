from fastapi import FastAPI, Query, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
import sqlite3, os, re

DB_PATH = os.getenv("DB_PATH", "customs.db")

app = FastAPI(title="Iraq Internal Customs API", version="1.0.0")

def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def norm_hs(v: str) -> str:
    return re.sub(r"[^\d]","", (v or "")).strip()

class CalcItem(BaseModel):
    hs_code: str
    quantity: float = Field(gt=0)
    unit: Optional[str] = None
    invoice_total_value: float = Field(ge=0)
    duty_rate: float = Field(ge=0)
    tsc_basis: str = Field(default="avg", pattern="^(avg|min|max)$")

class CalcRequest(BaseModel):
    checkpoint_id: str
    fx_rate: float = Field(default=1310, gt=0)
    invoice_currency: str = Field(default="USD")
    items: List[CalcItem]

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/checkpoints")
def checkpoints():
    conn = db()
    cps = conn.execute("SELECT id,name FROM checkpoints ORDER BY id").fetchall()
    out=[]
    for cp in cps:
        fees = conn.execute("SELECT code,label,amount_iqd FROM checkpoint_fees WHERE checkpoint_id=? ORDER BY id", (cp["id"],)).fetchall()
        out.append({"id": cp["id"], "name": cp["name"], "fees":[dict(f) for f in fees]})
    conn.close()
    return out

@app.get("/search")
def search(q: str = Query(min_length=2), limit: int = Query(default=30, ge=1, le=100)):
    conn = db()
    q2 = q.strip()
    hs = norm_hs(q2)
    rows=[]
    if len(hs) >= 4:
        rows = conn.execute(
            "SELECT id,hs_code,cst_code,description,unit,min_value,avg_value,max_value,currency FROM products WHERE hs_code LIKE ? ORDER BY hs_code LIMIT ?",
            (hs+"%", limit)
        ).fetchall()
    if not rows:
        rows = conn.execute(
            "SELECT id,hs_code,cst_code,description,unit,min_value,avg_value,max_value,currency FROM products WHERE description LIKE ? LIMIT ?",
            ("%"+q2+"%", limit)
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/hs/{hs_code}")
def by_hs(hs_code: str, unit: Optional[str] = None, limit: int = Query(default=50, ge=1, le=200)):
    conn = db()
    hs = norm_hs(hs_code)
    if not hs:
        raise HTTPException(400, "Invalid HS code")
    if unit:
        rows = conn.execute(
            "SELECT id,hs_code,cst_code,description,unit,min_value,avg_value,max_value,currency FROM products WHERE hs_code=? AND unit=? LIMIT ?",
            (hs, unit, limit)
        ).fetchall()
        if rows:
            conn.close()
            return [dict(r) for r in rows]
    rows = conn.execute(
        "SELECT id,hs_code,cst_code,description,unit,min_value,avg_value,max_value,currency FROM products WHERE hs_code=? LIMIT ?",
        (hs, limit)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/calculate")
def calculate(req: CalcRequest):
    conn = db()

    cp = conn.execute("SELECT id,name FROM checkpoints WHERE id=?", (req.checkpoint_id,)).fetchone()
    if not cp:
        conn.close()
        raise HTTPException(404, "Unknown checkpoint_id")

    fees_rows = conn.execute("SELECT code,label,amount_iqd FROM checkpoint_fees WHERE checkpoint_id=?", (req.checkpoint_id,)).fetchall()
    fees_total = sum(float(r["amount_iqd"] or 0) for r in fees_rows)

    items_out=[]
    duty_sum=0.0

    for it in req.items:
        hs = norm_hs(it.hs_code)
        row=None
        if it.unit:
            row = conn.execute(
                "SELECT hs_code,description,unit,min_value,avg_value,max_value,currency FROM products WHERE hs_code=? AND unit=? LIMIT 1",
                (hs, it.unit)
            ).fetchone()
        if not row:
            row = conn.execute(
                "SELECT hs_code,description,unit,min_value,avg_value,max_value,currency FROM products WHERE hs_code=? LIMIT 1",
                (hs,)
            ).fetchone()

        tsc_unit=0.0
        desc=""
        unit=row["unit"] if row else (it.unit or "")
        if row:
            desc = row["description"] or ""
            basis = it.tsc_basis
            tsc_unit = float(row["avg_value"] or 0)
            if basis == "min":
                tsc_unit = float(row["min_value"] or tsc_unit)
            elif basis == "max":
                tsc_unit = float(row["max_value"] or tsc_unit)

        invoice_unit = (it.invoice_total_value / it.quantity) if it.quantity else 0.0
        valuation_unit = max(invoice_unit, tsc_unit)
        customs_value_base = valuation_unit * it.quantity
        customs_value_iqd = customs_value_base if req.invoice_currency.upper() == "IQD" else customs_value_base * req.fx_rate
        duty_iqd = customs_value_iqd * it.duty_rate

        duty_sum += duty_iqd
        items_out.append({
            "hs_code": hs,
            "description": desc,
            "quantity": it.quantity,
            "unit": unit,
            "invoice_total_value": it.invoice_total_value,
            "invoice_unit_value": invoice_unit,
            "tsc_unit_value": tsc_unit,
            "valuation_unit_value": valuation_unit,
            "customs_value_iqd": customs_value_iqd,
            "duty_rate": it.duty_rate,
            "duty_iqd": duty_iqd
        })

    conn.close()
    return {
        "checkpoint": {"id": cp["id"], "name": cp["name"]},
        "fx": {"from": req.invoice_currency, "to": "IQD", "rate": req.fx_rate},
        "fees": {"items": [dict(r) for r in fees_rows], "total_iqd": fees_total},
        "items": items_out,
        "summary": {
            "duty_iqd": duty_sum,
            "fees_iqd": fees_total,
            "total_payable_iqd": duty_sum + fees_total
        }
    }

@app.get("/stats")
def stats():
    conn = db()
    total = conn.execute("SELECT COUNT(*) AS c FROM products").fetchone()["c"]
    hs_unique = conn.execute("SELECT COUNT(DISTINCT hs_code) AS c FROM products WHERE hs_code <> ''").fetchone()["c"]
    unit_unique = conn.execute("SELECT COUNT(DISTINCT unit) AS c FROM products WHERE unit <> ''").fetchone()["c"]
    top_units = conn.execute("SELECT unit, COUNT(*) AS c FROM products WHERE unit <> '' GROUP BY unit ORDER BY c DESC LIMIT 15").fetchall()
    top_hs = conn.execute("SELECT hs_code, COUNT(*) AS c FROM products WHERE hs_code <> '' GROUP BY hs_code ORDER BY c DESC LIMIT 15").fetchall()
    conn.close()
    return {
        "rows_total": total,
        "hs_unique": hs_unique,
        "units_unique": unit_unique,
        "top_units": [dict(r) for r in top_units],
        "top_hs": [dict(r) for r in top_hs]
    }