PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS checkpoints (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS checkpoint_fees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checkpoint_id TEXT NOT NULL,
  code TEXT NOT NULL,
  label TEXT,
  amount_iqd REAL NOT NULL DEFAULT 0,
  FOREIGN KEY(checkpoint_id) REFERENCES checkpoints(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hs_code TEXT NOT NULL,
  cst_code TEXT,
  description TEXT,
  unit TEXT,
  min_value REAL,
  avg_value REAL,
  max_value REAL,
  currency TEXT DEFAULT 'USD',
  source_page INTEGER,
  raw_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_products_hs ON products(hs_code);
CREATE INDEX IF NOT EXISTS idx_products_desc ON products(description);