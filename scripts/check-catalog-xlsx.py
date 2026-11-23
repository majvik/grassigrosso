#!/usr/bin/env python3
"""Check the XLSX importer and the live local Strapi catalog against the workbook."""
import importlib.util
import json
import sqlite3
import sys
from pathlib import Path
from urllib.request import urlopen

path = Path(__file__).with_name("update-catalog-from-xlsx.py")
spec = importlib.util.spec_from_file_location("catalog_xlsx", path)
catalog = importlib.util.module_from_spec(spec)
spec.loader.exec_module(catalog)

rows = catalog.read_rows(sys.argv[1])
seed = catalog.DB.parents[1] / "database/seed/data.db"
with sqlite3.connect(f"{seed.as_uri()}?mode=ro", uri=True) as source, sqlite3.connect(":memory:") as db:
    source.backup(db)
    db.execute("PRAGMA foreign_keys = ON")
    assert db.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
    assert not db.execute("PRAGMA foreign_key_check").fetchall()
    new_products = {
        "supreme-grey-soft": ("Суприм Грей Софт", 26, 180, "двусторонний"),
        "balance-comfort": ("Баланс Кофморт", 18, 140, None),
    }
    for slug, expected in new_products.items():
        assert db.execute(
            "SELECT name, height_cm, max_load_kg, sidedness FROM products WHERE slug = ?", (slug,)
        ).fetchall() == [expected], slug
    with sqlite3.connect(":memory:") as creation_db:
        source.backup(creation_db)
        creation_db.execute("PRAGMA foreign_keys = ON")
        creation_db.executemany("DELETE FROM products WHERE slug = ?", [(slug,) for slug in new_products])
        matched, old, missing, created = catalog.sync(creation_db, rows, create_missing=True)
        assert (matched, len(old), missing, set(created)) == (27, 18, [], set(new_products))
        assert not creation_db.execute("PRAGMA foreign_key_check").fetchall()
        assert catalog.sync(creation_db, rows, create_missing=True)[3] == []

    assert catalog.sync(db, rows)[0] > 0
    assert db.total_changes == 0, "Seed differs from the workbook or import is not idempotent"

    assert db.execute("SELECT name, sidedness FROM products WHERE slug = 'lider'").fetchone()[:] == (
        "Лидер Грей Софт", "двусторонний",
    )
    product = db.execute("SELECT slug, name, height_cm FROM products WHERE slug = 'lider'").fetchone()
    db.execute("UPDATE products SET height_cm = 1, name = 'Лидер OLD' WHERE slug = 'lider'")
    db.execute("UPDATE products SET name = 'Ориент' WHERE slug = 'orient'")
    catalog.sync(db, rows)
    assert db.execute("SELECT slug, name, height_cm FROM products WHERE slug = 'lider'").fetchone() == product
    assert db.execute("SELECT name FROM products WHERE slug = 'orient'").fetchone()[0] == "Ориент OLD"

    with urlopen("http://127.0.0.1:1337/api/catalog-feed", timeout=10) as response:
        items = {item["slug"]: item for item in json.load(response)["items"]}
    by_name = {catalog.key(item["name"]): item for item in items.values()}
    expected_catalog_tags = {
        "хард формат": ["Беспружинный", "Разная жесткость сторон"],
        "баланс кофморт": ["Беспружинный", "Средняя жесткость"],
        "премьер люкс": ["Пружинный", "Средняя жесткость"],
    }
    for row in rows:
        name = catalog.key(row["Название"])
        item = by_name[name]
        expected_tags = expected_catalog_tags.get(name, catalog.parts(row["Теги"]))
        assert item["tags"] == expected_tags, (item["slug"], item["tags"], expected_tags)

    options = db.execute(
        """SELECT p.slug, f.slug FROM products_filling_options_lnk l
        JOIN products p ON p.id = l.product_id JOIN filling_options f ON f.id = l.filling_option_id"""
    ).fetchall()
    for row in db.execute("SELECT * FROM products WHERE is_active = 1"):
        item = items[row["slug"]]
        for field, column in {
            "name": "name", "heightCm": "height_cm", "maxLoadKg": "max_load_kg",
            "sidedness": "sidedness",
            "firmnessSide1": "firmness_side_1", "firmnessSide2": "firmness_side_2",
            "coverDescription": "cover_description", "layersCatalog": "layers_catalog",
        }.items():
            expected = row[column]
            if field in ("coverDescription", "layersCatalog"):
                expected = (expected or "").strip()
            if field == "sidedness":
                expected = {"двусторонний": "doubleSided", "односторонний": "singleSided"}.get(expected)
            assert item.get(field) == expected, (item["slug"], field, item.get(field), expected)
        assert set(item["fillings"]) == {filling for slug, filling in options if slug == row["slug"]}, row["slug"]

print(f"XLSX sync is idempotent, restores returning products and matches {len(items)} live Strapi products")
