import argparse, json, sqlite3, re

def norm_hs(v):
    return re.sub(r"[^\d]","", str(v or "")).strip()

def to_num(v):
    try:
        return float(v)
    except Exception:
        return None

def pick(d, keys):
    for k in keys:
        if isinstance(d, dict) and k in d and d[k] not in (None,""):
            return d[k]
    return None

def normalize_row(row: dict):
    hs = norm_hs(pick(row, ["hs_code","hs","HS","hscode","code","hsCode"]))
    desc = pick(row, ["description","desc","item_description","name","arabic_description","Description"]) or ""
    unit = pick(row, ["unit","Unit","uom","UOM","measure","unit_name"]) or ""
    cst = pick(row, ["cst","CST","cst_code","CST_CODE","tsc_code","TSC_CODE","code_cst","رمز"])
    mn  = to_num(pick(row, ["min","minimum","min_value","minValue","MIN"]))
    mx  = to_num(pick(row, ["max","maximum","max_value","maxValue","MAX"]))
    av  = to_num(pick(row, ["avg","average","mean","avg_value","avgValue","AVG"]))
    if (av is None or av == 0) and mn is not None and mx is not None:
        av = (mn + mx) / 2.0
    currency = pick(row, ["currency","Currency","cur"]) or "USD"
    page = pick(row, ["page","source_page","pageno","Page"])
    try:
        page = int(page) if page is not None else None
    except Exception:
        page = None
    return hs, cst, str(desc), str(unit), mn, av, mx, str(currency), page

def seed_checkpoints(conn: sqlite3.Connection):
    checkpoints = {
        "mosul_dam": {
            "name": "صيطرة سد الموصل",
            "fees": [
                {"code":"SONAR","label":"سونار","amount_iqd":25000},
                {"code":"PERMIT","label":"تصريح","amount_iqd":10000}
            ]
        },
        "darman": {
            "name": "صيطرة دارمان",
            "fees": [
                {"code":"SONAR","label":"سونار","amount_iqd":20000}
            ]
        }
    }
    cur = conn.cursor()
    for cid, cp in checkpoints.items():
        cur.execute("INSERT OR REPLACE INTO checkpoints(id,name) VALUES(?,?)", (cid, cp["name"]))
        cur.execute("DELETE FROM checkpoint_fees WHERE checkpoint_id=?", (cid,))
        for fee in cp["fees"]:
            cur.execute(
                "INSERT INTO checkpoint_fees(checkpoint_id,code,label,amount_iqd) VALUES(?,?,?,?)",
                (cid, fee["code"], fee.get("label"), float(fee.get("amount_iqd",0)))
            )
    conn.commit()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="customs.db")
    ap.add_argument("--schema", default="schema.sql")
    ap.add_argument("--tsc", required=True, help="Path to TSC json (array or {rows:[]})")
    args = ap.parse_args()

    conn = sqlite3.connect(args.db)
    conn.execute("PRAGMA foreign_keys=ON;")
    with open(args.schema, "r", encoding="utf-8") as f:
        conn.executescript(f.read())

    seed_checkpoints(conn)

    with open(args.tsc, "r", encoding="utf-8") as f:
        parsed = json.load(f)
    arr = parsed if isinstance(parsed, list) else (parsed.get("rows") or parsed.get("data") or parsed.get("items") or [])
    if not isinstance(arr, list):
        raise SystemExit("Unsupported TSC JSON shape.")

    cur = conn.cursor()
    cur.execute("DELETE FROM products")
    inserted = 0
    for row in arr:
        if not isinstance(row, dict):
            continue
        hs, cst, desc, unit, mn, av, mx, curcy, page = normalize_row(row)
        if not hs and not desc:
            continue
        cur.execute(
            """INSERT INTO products(hs_code,cst_code,description,unit,min_value,avg_value,max_value,currency,source_page,raw_json)
               VALUES(?,?,?,?,?,?,?,?,?,?)""",
            (hs, cst, desc, unit, mn, av, mx, curcy, page, json.dumps(row, ensure_ascii=False))
        )
        inserted += 1

    conn.commit()
    print(f"Seeded products: {inserted}")

if __name__ == "__main__":
    main()