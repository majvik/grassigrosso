#!/usr/bin/env python3
"""Update local Strapi products from the client XLSX (requires openpyxl).

Preview: python3 scripts/update-catalog-from-xlsx.py FILE.xlsx
Apply with local Strapi stopped: add --apply.
  Add --create-missing to create products listed in NEW_PRODUCT_SLUGS.
"""
import argparse
import re
import sqlite3
from pathlib import Path

from openpyxl import load_workbook

DB = Path(__file__).resolve().parents[1] / "strapi-catalog/.tmp/data.db"
OLD_SUFFIX = " OLD"
ALIASES = {
    "лидер грей софт": "lider",
    "гравити грей софт": "gravity",
    "мэджик грей софт": "magic",
    "орто фоам": "ortofoam-standard",
    "орто фоам плюс": "ortofoam-plus",
}
NEW_PRODUCT_SLUGS = {
    "суприм грей софт": "supreme-grey-soft",
    "баланс кофморт": "balance-comfort",
}
TYPES = {
    "пружинный": "пружинный",
    "беспружинный": "беспружинный",
    "топер": "топер",
    "двухсторонний": "двухсторонние",
    "двусторонний": "двухсторонние",
    "односторонний": "односторонние",
}
CONSTRUCTION_TAGS = {
    "пружинный": "Пружинный",
    "беспружинный": "Беспружинный",
    "топер": "Топер",
}
FIRMNESS_TAGS = {
    "мягкий": "Мягкий",
    "средний": "Средняя жесткость",
    "жесткий": "Жесткий",
    "разная_жесткость_сторон": "Разная жесткость сторон",
}
FILLINGS = {
    "кокосовая койра": "кокос",
    "латекс": "латекс",
    "орто-пена": "орто_пена",
    "с эффектом памяти": "с_эффектом_памяти",
    "нано-пена": "нано_пена",
    "форплит": "форплит",
}


def key(value):
    return " ".join(str(value or "").casefold().replace("ё", "е").split())


def inline_text(value):
    return " ".join(str(value).split())


def parts(value):
    return list(dict.fromkeys(piece.strip() for piece in re.split(r"[,\n]", str(value or "")) if piece.strip()))


def consistent_tags(values, mattress_type, firmness):
    construction = CONSTRUCTION_TAGS.get(mattress_type)
    firmness_label = FIRMNESS_TAGS.get(firmness)
    construction_keys = set(CONSTRUCTION_TAGS)
    firmness_keys = {key(label) for label in FIRMNESS_TAGS.values()} | {"средний"}
    firmness_aliases = {"средний", "средняя жесткость"} if firmness == "средний" else {key(firmness_label)}
    tags = {}
    for label in values:
        normalized = key(label)
        if construction and normalized in construction_keys:
            tags.setdefault(key(construction), construction)
        elif firmness_label and normalized in firmness_keys:
            tags.setdefault(key(firmness_label), label if normalized in firmness_aliases else firmness_label)
        else:
            tags.setdefault(normalized, label)
    return list(tags.values())


def read_rows(filename):
    workbook = load_workbook(filename, data_only=True, read_only=True)
    try:
        header, *rows = workbook["Каталог"].iter_rows(min_row=4, values_only=True)
        headers = [str(value).split(" (не обязательно)")[0] for value in header]
        required = {"Название", "Коллекция", "Тип матраса", "Высота, см", "Максимальная нагрузка, кг",
                    "Жесткость", "Жесткость стороны 1 (1–10)", "Жесткость стороны 2 (1–10)",
                    "Наполнители", "Особенности", "Теги", "Чехол", "Состав и слои"}
        if not required <= set(headers):
            raise ValueError(f"Отсутствуют столбцы: {sorted(required - set(headers))}")
        products = [dict(zip(headers, row)) for row in rows]
        products = [row for row in products if key(row["Название"])]
        names = [key(row["Название"]) for row in products]
        if not names or len(set(names)) != len(names):
            raise ValueError("Таблица пустая или содержит повторяющиеся названия")
        return products
    finally:
        workbook.close()


def lookup(db, table, value, field="name"):
    matches = [row["id"] for row in db.execute(f"SELECT id, {field} FROM {table}")
               if key(row[field]) == key(value)]
    if len(matches) != 1:
        raise ValueError(f"{table}: нет однозначного значения {value!r}")
    return matches[0]


def relation(db, product, field, target, ids, ordered=False, inverse=False):
    table = f"products_{field}_lnk"
    order = f", {target}_ord" if ordered else ""
    existing = [row[0] for row in db.execute(
        f"SELECT {target}_id FROM {table} WHERE product_id = ?" +
        (f" ORDER BY {target}_ord" if ordered else ""), (product,))]
    if existing == ids:
        return
    db.execute(f"DELETE FROM {table} WHERE product_id = ?", (product,))
    for position, item in enumerate(ids, 1):
        columns = f"product_id, {target}_id{order}"
        values = [product, item] + ([position] if ordered else [])
        if inverse:
            columns += ", product_ord"
            values.append(db.execute(
                f"SELECT COALESCE(MAX(product_ord), 0) + 1 FROM {table} WHERE {target}_id = ?", (item,)
            ).fetchone()[0])
        placeholders = ", ".join("?" for _ in values)
        db.execute(f"INSERT INTO {table} ({columns}) VALUES ({placeholders})", values)


def update_product(db, product, row):
    height = float(row["Высота, см"])
    load = float(row["Максимальная нагрузка, кг"])
    if not 0 < height or not load.is_integer() or load <= 0:
        raise ValueError("Недопустимая высота или нагрузка")
    firmness = key(row["Жесткость"]).replace(" ", "_")
    sides = [row[f"Жесткость стороны {side} (1–10)"] for side in (1, 2)]
    if any(value is not None and (int(value) != value or not 1 <= value <= 10) for value in sides):
        raise ValueError("Жесткость стороны должна быть целым числом от 1 до 10")
    types = parts(row["Тип матраса"])
    type_keys = [key(value) for value in types]
    if not type_keys or any(value not in TYPES for value in type_keys):
        raise ValueError(f"Неизвестный тип: {types}")
    construction = [value for value in type_keys if value in ("пружинный", "беспружинный", "топер")]
    if len(construction) > 1:
        raise ValueError(f"Несовместимые типы: {types}")
    sidedness_options = {kind for kind in type_keys if kind not in construction}
    normalized_sides = {"односторонний" if kind == "односторонний" else "двусторонний" for kind in sidedness_options}
    if len(normalized_sides) > 1:
        raise ValueError(f"Несовместимая сторонность матраса: {types}")
    mattress_type = (construction or type_keys)[0]
    lookup_type = "двухсторонний" if mattress_type == "двусторонний" else mattress_type
    load_slug, load_enum = next((slug, enum) for limit, slug, enum in [
        (120, "upTo120", "до_120_кг"), (160, "upTo160", "до_160_кг"),
        (180, "upTo180", "до_180_кг"), (float("inf"), "over160", "свыше_180_кг"),
    ] if load <= limit)
    height_slug, height_enum = (
        ("low", "компактные_до_16_см") if height <= 16 else
        ("mid", "средние_16_22_см") if height < 23 else ("high", "высокие_от_23_см")
    )
    fillings = parts(row["Наполнители"])
    if any(key(value) == "bi cotton" for value in fillings):
        db.execute(
            "INSERT INTO filling_options (document_id, name, slug, sort_order, is_active, created_at, updated_at, published_at) "
            "SELECT lower(hex(randomblob(12))), 'bi cotton', 'biCotton', 7, 1, ?, ?, ? "
            "WHERE NOT EXISTS (SELECT 1 FROM filling_options WHERE slug = 'biCotton')",
            (now(), now(), now()),
        )
    data = {
        "name": " ".join(word.capitalize() if word.isupper() else word for word in str(row["Название"]).split()),
        "height_cm": height, "max_load_kg": int(load), "firmness": firmness,
        "firmness_side_1": sides[0], "firmness_side_2": sides[1],
        "mattress_type": TYPES[mattress_type], "load_range": load_enum,
        "sidedness": next(iter(normalized_sides), None) if construction else None,
        "height_range": height_enum,
    }
    if fillings:
        data["fillings"] = next((FILLINGS[key(value)] for value in fillings if key(value) in FILLINGS), None)
    cover = row["Чехол"]
    if cover is not None and inline_text(cover):
        data["cover_description"] = inline_text(cover)
    for header, field in {
        "Состав и слои": "layers_catalog",
        "Описание товара": "page_description", "Позиция в каталоге": "sort_order",
    }.items():
        value = row.get(header)
        if value is not None and str(value).strip():
            data[field] = int(value) if field == "sort_order" else str(value).strip()
    update_fields(db, product["id"], data)
    product_id = product["id"]
    for field, target, table, value, lookup_field in [
        ("collection", "collection", "collections", row["Коллекция"], "name"),
        ("firmness_option", "firmness_option", "firmness_options", row["Жесткость"], "name"),
        ("mattress_type_option", "mattress_type_option", "mattress_type_options", lookup_type, "name"),
        ("load_range_option", "load_range_option", "load_range_options", load_slug, "slug"),
        ("height_range_option", "height_range_option", "height_range_options", height_slug, "slug"),
    ]:
        relation(db, product_id, field, target, [lookup(db, table, value, lookup_field)])
    features = parts(row["Особенности"])
    if firmness == "разная_жесткость_сторон" and not any(key(value) == key(row["Жесткость"]) for value in features):
        features.append(row["Жесткость"])
    for field, target, table, values in [
        ("filling_options", "filling_option", "filling_options", fillings),
        ("features", "feature_option", "feature_options", features),
        ("tags", "tag", "tags", consistent_tags(parts(row["Теги"]), mattress_type, firmness)),
        ("sizes", "mattress_size", "mattress_sizes", parts(row.get("Размеры"))),
    ]:
        if not values and field in ("filling_options", "sizes"):
            continue
        ids = [lookup(db, table, value) for value in values]
        relation(db, product_id, field, target, list(dict.fromkeys(ids)), ordered=True, inverse=field == "sizes")


def now():
    import time
    return time.time_ns() // 1_000_000


def update_fields(db, product_id, data):
    current = db.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
    if any(current[field] != value for field, value in data.items()):
        assignments = ", ".join(f"{field} = ?" for field in data)
        db.execute(f"UPDATE products SET {assignments}, updated_at = ? WHERE id = ?",
                   (*data.values(), now(), product_id))


def create_product(db, name, slug):
    commerce_key = slug.upper()
    if db.execute("SELECT 1 FROM products WHERE slug = ? OR commerce_key = ?", (slug, commerce_key)).fetchone():
        raise ValueError(f"Занятый идентификатор нового товара: {slug}")
    timestamp = now()
    sort_order = db.execute("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM products").fetchone()[0]
    cursor = db.execute(
        """INSERT INTO products (document_id, name, slug, commerce_key, is_active, is_recommended,
                                  sort_order, created_at, updated_at, published_at)
           VALUES (lower(hex(randomblob(12))), ?, ?, ?, 1, 0, ?, ?, ?, ?)""",
        (name, slug, commerce_key, sort_order, timestamp, timestamp, timestamp),
    )
    return {"id": cursor.lastrowid}


def sync(db, rows, *, create_missing=False):
    db.row_factory = sqlite3.Row
    products = list(db.execute("SELECT id, slug, name FROM products"))
    by_slug = {product["slug"]: product for product in products}
    matched = set()
    missing = []
    created = []
    for row in rows:
        name = key(row["Название"])
        matches = [product for product in products if key(product["name"].removesuffix(OLD_SUFFIX)) == name]
        if not matches and name in ALIASES and ALIASES[name] in by_slug:
            matches = [by_slug[ALIASES[name]]]
        if not matches:
            slug = NEW_PRODUCT_SLUGS.get(name)
            if not create_missing or not slug:
                missing.append(row["Название"])
                continue
            matches = [create_product(db, row["Название"], slug)]
            created.append(slug)
        product = matches[0]
        if len(matches) != 1 or product["id"] in matched:
            raise ValueError(f"Неоднозначное сопоставление: {row['Название']}")
        try:
            update_product(db, product, row)
        except (ValueError, TypeError) as error:
            raise ValueError(f"{row['Название']}: {error}") from error
        matched.add(product["id"])
    if not matched:
        raise ValueError("Ни один товар не сопоставлен с базой Strapi")
    old = [product for product in products if product["id"] not in matched]
    for product in old:
        update_fields(db, product["id"], {"name": product["name"].removesuffix(OLD_SUFFIX) + OLD_SUFFIX})
    return len(matched), [product["slug"] for product in old], missing, created


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workbook", type=Path)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--create-missing", action="store_true")
    args = parser.parse_args()
    rows = read_rows(args.workbook)
    with sqlite3.connect(f"{DB.as_uri()}?mode=rw", uri=True) as db:
        db.execute("PRAGMA foreign_keys = ON")
        db.execute("BEGIN IMMEDIATE")
        matched, old, missing, created = sync(db, rows, create_missing=args.create_missing)
        if not args.apply:
            db.rollback()
    print(f"{'Записано' if args.apply else 'Предпросмотр'}: {matched - len(created)} совпадений, {len(created)} новых, {len(old)} OLD")
    if created:
        print("Новые: " + ", ".join(created))
    print("OLD: " + ", ".join(sorted(old)))
    if missing:
        print("Отсутствуют в Strapi: " + ", ".join(missing))


if __name__ == "__main__":
    main()
