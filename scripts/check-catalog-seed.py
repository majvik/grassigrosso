"""Check that the bundled Strapi seed and public snapshots ship the same catalog."""
import json
import sqlite3
from collections import Counter
from pathlib import Path

root = Path(__file__).resolve().parents[1]
seed = root / "strapi-catalog/database/seed/data.db"
with sqlite3.connect(f"{seed.as_uri()}?mode=ro", uri=True) as db:
    actual = Counter(row[0] for row in db.execute("SELECT slug FROM products WHERE is_active = 1"))
for name in ("catalog-products.snapshot.json", "catalog-products-listing.snapshot.json"):
    items = json.loads((root / "public" / name).read_text())["items"]
    expected = Counter(item["slug"] for item in items)
    if actual != expected:
        raise SystemExit(f"{name}: extra {dict(actual - expected)}, missing {dict(expected - actual)}")
print(f"Seed matches both catalog snapshots ({actual.total()} active products)")
