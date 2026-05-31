#!/usr/bin/env python3
"""Build docs/catalog-import from pdf/*.pdf — MD specs + embedded 1034×1034 images."""

from __future__ import annotations

import io
import re
from pathlib import Path

import fitz
import yaml
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PDF_DIR = ROOT / "pdf"
OUT_DIR = ROOT / "docs" / "catalog-import"
PRODUCTS_DIR = OUT_DIR / "products"
IMAGES_DIR = OUT_DIR / "images"

STANDARD_SIZES = [
    "140x190",
    "140x200",
    "160x190",
    "160x200",
    "180x190",
    "180x200",
]

IMAGE_SIZE = 1034

PAGE_CATALOG: dict[int, tuple[str, str]] = {
    6: ("Ориент", "orient"),
    7: ("Ориент Плюс", "orient-plus"),
    8: ("Аспект", "aspect"),
    9: ("Эвер Фоам 10", "ever-foam-10"),
    10: ("Эвер Фоам 16", "ever-foam-16"),
    11: ("Эвер Фоам 20", "ever-foam-20"),
    13: ("Ортофоам Стандарт", "ortofoam-standard"),
    14: ("Ортофоам Плюс", "ortofoam-plus"),
    15: ("Хард Формат", "hard-format"),
    16: ("Скай Фоам", "sky-foam"),
    17: ("Эволюшен", "evolution"),
    18: ("Гранд", "grand"),
    20: ("Империо", "imperio"),
    21: ("Люксор", "luxor"),
    23: ("Галакси", "galaksi"),
    24: ("Дискавери", "discovery"),
    25: ("Давос", "davos"),
    26: ("Давос Микс", "davos-mix"),
    27: ("Элио", "elio"),
    28: ("Премьер", "premier"),
    29: ("Премьер Люкс", "premier-lux"),
    30: ("Импринт", "imprint"),
    31: ("Релакс Плюс", "relax-plus"),
    32: ("Ларго", "largo"),
    34: ("Твин", "twin"),
    35: ("Релакс", "relax-trend"),
    36: ("Оригинал", "original"),
    37: ("Эдванс", "advance"),
    38: ("Оптима", "optima"),
    39: ("Динамик", "dynamic"),
    40: ("Спейс", "space"),
    41: ("Сенсо", "senso"),
    42: ("Лидер", "lider"),
    43: ("Гравити", "gravity"),
    44: ("Мэджик", "magic"),
    46: ("Флип Стандарт", "flip-standard"),
    47: ("Флип Плюс", "flip-plus"),
    48: ("Эффект", "effect"),
    49: ("Дуал", "dual"),
    50: ("Делюкс Мемори", "deluxe-memory"),
    51: ("Делюкс Латекс", "deluxe-latex"),
    52: ("Софт", "soft-topper"),
    53: ("Сенсетив", "sensitive"),
}

COVER_PAGES: dict[int, str] = {
    5: "classic",
    12: "flexi",
    19: "relax",
    33: "trend",
    45: "topper",
}

REF_PAGES = {4}


def collection_for_page(page: int) -> str:
    if page >= 46:
        return "topper"
    if page >= 34:
        return "trend"
    if page >= 20:
        return "relax"
    if page >= 13:
        return "flexi"
    return "classic"


def map_firmness(side1: int | None, side2: int | None) -> str:
    if side1 is None or side2 is None:
        return "medium"
    if side1 != side2:
        return "dualFirmness"
    if side1 <= 3:
        return "soft"
    if side1 <= 6:
        return "medium"
    return "hard"


def map_load_range(max_load: int) -> str:
    if max_load <= 120:
        return "upTo120"
    if max_load <= 160:
        return "upTo160"
    if max_load <= 180:
        return "upTo180"
    return "over160"


def map_height_range(height: int, is_topper: bool) -> str:
    if is_topper:
        return "low"
    if height <= 16:
        return "low"
    if height <= 22:
        return "mid"
    return "high"


def detect_mattress_type(text: str, page: int) -> str:
    if page >= 46:
        return "topper"
    if re.search(r"пружин", text, re.I):
        return "spring"
    return "nospring"


def map_filling_slugs(text: str) -> list[str]:
    slugs: list[str] = []
    low = text.lower()

    def add(slug: str) -> None:
        if slug not in slugs:
            slugs.append(slug)

    if re.search(r"кокос", low):
        add("coir")
    if re.search(r"memory\s*foam|эффектом памяти", low):
        add("memoryEffect")
    if re.search(r"neolatex|латекс", low):
        add("latex")
    if re.search(r"flexi|elax|высокоэластичн|орто|карбон|повышенной плотности|бельг", low):
        add("orthoFoam")
    if re.search(r"нано", low):
        add("nanoFoam")
    if re.search(r"форплит", low):
        add("forplit")
    return slugs


def map_features(text: str) -> list[str]:
    features: list[str] = []
    low = text.lower()
    if re.search(r"еврокаркас|татами борт", low):
        features.append("edgeSupport")
    if re.search(r"съ[её]мн", low):
        features.append("removableCover")
    if re.search(r"зима.?лето", low):
        features.append("winterSummer")
    return features


def firmness_label(slug: str) -> str:
    return {
        "soft": "Мягкий",
        "medium": "Средний",
        "hard": "Жесткий",
        "dualFirmness": "Разная жесткость сторон",
    }.get(slug, slug)


def type_label(slug: str) -> str:
    return {
        "spring": "Пружинный",
        "nospring": "Беспружинный",
        "topper": "Топер",
    }.get(slug, slug)


def parse_height_cm(text: str) -> int:
    match = re.search(r"(\d+)\s*A<", text)
    if match:
        return int(match.group(1))
    match = re.search(r"(\d+)\s*см", text, re.I)
    return int(match.group(1)) if match else 0


def parse_max_load_kg(text: str, is_topper: bool) -> tuple[int, bool]:
    match = re.search(r"(\d+)\s*кг", text, re.I)
    if match:
        return int(match.group(1)), True
    match = re.search(r"(\d+)\s*:\s*3\b", text)
    if match:
        return int(match.group(1)), True
    return (120 if is_topper else 120), False


def parse_cover(text: str, page_num: int) -> str:
    match = re.search(r"'5E>;\n([^\n]+)", text)
    if match:
        line = match.group(1).strip()
        if re.search(r"[а-яА-ЯёЁ]{4,}", line):
            return line

    if page_num in (46, 47):
        return "Жаккард, стёганный на синтепоне"
    if page_num <= 11 and page_num != 8:
        return "Жаккард, стёганный на синтепоне"
    if page_num == 8:
        return "Трикотаж, стёганный на холконе"
    if page_num <= 18:
        if page_num >= 17:
            return "Премиальный трикотаж с объёмной стежкой на холконе и высокоэластичной пене"
        return "Трикотаж с объёмной стежкой на холконе"
    if page_num <= 44:
        return "Премиальный трикотаж с объёмной стежкой на холконе"
    return "Трикотаж с объёмной стежкой на холконе"


def parse_layers(text: str) -> list[str]:
    layers: list[str] = []
    in_layers = False
    for raw_line in text.split("\n"):
        line = raw_line.strip()
        if not line:
            continue
        if re.match(r"^Наполнение", line, re.I):
            in_layers = True
            continue
        if in_layers and re.search(r"[а-яА-ЯёЁ]", line):
            cleaned = re.sub(r"^\d+\.\s*", "", line).strip()
            if cleaned:
                layers.append(cleaned)
    if layers:
        return layers

    keywords = (
        "пена", "пружин", "койра", "латекс", "войлок", "elax", "flexi",
        "neolatex", "борт", "каркас", "бикоттон", "бельг",
    )
    return [
        re.sub(r"^\d+\.\s*", "", line).strip()
        for line in re.findall(r"(?m)^[^\n]*[а-яА-ЯёЁ][^\n]*", text)
        if any(keyword in line.lower() for keyword in keywords)
    ]


def parse_page(page_num: int) -> dict:
    name, slug = PAGE_CATALOG[page_num]
    doc = fitz.open(PDF_DIR / f"{page_num}.pdf")
    text = doc[0].get_text()
    doc.close()

    is_topper = page_num >= 46
    collection = collection_for_page(page_num)
    height = parse_height_cm(text)
    max_load, has_load = parse_max_load_kg(text, is_topper)

    sides = re.findall(r"(\d+)\s*/\s*10", text)
    side1 = int(sides[0]) if sides else None
    side2 = int(sides[1]) if len(sides) > 1 else side1

    firmness = map_firmness(side1, side2)
    mattress_type = detect_mattress_type(text, page_num)
    layers = parse_layers(text)
    cover = parse_cover(text, page_num)
    filling_slugs = map_filling_slugs("\n".join(layers) + "\n" + text)
    features = map_features(text)

    tags = [type_label(mattress_type)]
    tags.append(
        "Разная жесткость сторон" if firmness == "dualFirmness" else firmness_label(firmness),
    )

    notes: list[str] = []
    if side1 is not None and side2 is not None:
        notes.append(
            f"Жёсткость каталога: сторона 1 — {side1}/10, сторона 2 — {side2}/10 → `{firmness}`",
        )
    if not has_load and is_topper:
        notes.append("Нагрузка в каталоге не указана; использовано `max_load_kg: 120` → `upTo120`")
    if name == "Релакс" and collection == "trend":
        notes.append("Название «Релакс» в коллекции Trend (не путать с коллекцией Relax)")

    collection_label = "Топеры" if collection == "topper" else collection.capitalize()

    return {
        "name": name,
        "slug": slug,
        "collection": collection,
        "source_pdf": f"pdf/{page_num}.pdf",
        "height_cm": height,
        "max_load_kg": max_load,
        "firmness_side1": side1,
        "firmness_side2": side2,
        "firmness": firmness,
        "mattress_type": mattress_type,
        "load_range": map_load_range(max_load),
        "height_range": map_height_range(height, is_topper),
        "sizes": STANDARD_SIZES.copy(),
        "filling_slugs": filling_slugs,
        "features": features,
        "image": f"images/{slug}.png",
        "image_alt": f"{name} — коллекция {collection_label}",
        "sort_order": page_num,
        "tags": tags,
        "cover": cover,
        "layers": layers,
        "mapping_notes": notes,
    }


def extract_product_image(page_num: int, slug: str) -> None:
    doc = fitz.open(PDF_DIR / f"{page_num}.pdf")
    page = doc[0]
    chosen = None
    for info in page.get_images(full=True):
        img = doc.extract_image(info[0])
        if img["width"] == IMAGE_SIZE and img["height"] == IMAGE_SIZE:
            chosen = img
            break
    doc.close()

    if not chosen:
        raise RuntimeError(f"pdf/{page_num}.pdf: no {IMAGE_SIZE}×{IMAGE_SIZE} embedded image")

    out = IMAGES_DIR / f"{slug}.png"
    if chosen["ext"] == "png":
        out.write_bytes(chosen["image"])
    else:
        im = Image.open(io.BytesIO(chosen["image"]))
        if im.size != (IMAGE_SIZE, IMAGE_SIZE):
            raise RuntimeError(
                f"pdf/{page_num}.pdf: decoded size {im.size}, expected {IMAGE_SIZE}×{IMAGE_SIZE}",
            )
        im.save(out, format="PNG")


def render_md(data: dict) -> str:
    front = {k: v for k, v in data.items() if k not in ("cover", "layers", "mapping_notes")}
    parts = ["---", yaml.dump(front, allow_unicode=True, sort_keys=False).strip(), "---", ""]

    if data.get("cover"):
        parts += ["## Чехол", data["cover"], ""]

    parts.append("## Наполнение (полный список для модалки)")
    for index, layer in enumerate(data.get("layers") or [], 1):
        parts.append(f"{index}. {layer}")
    parts.append("")

    if data.get("mapping_notes"):
        parts.append("## Примечания маппинга")
        parts.extend(f"- {note}" for note in data["mapping_notes"])
        parts.append("")

    return "\n".join(parts)


def write_inventory() -> None:
    rows = [
        "# Инвентаризация PDF каталога",
        "",
        "| PDF | Тип | Коллекция | Название | Slug |",
        "|-----|-----|-----------|----------|------|",
    ]
    for num in range(4, 54):
        if num == 22:
            continue
        if num in REF_PAGES:
            rows.append(f"| {num}.pdf | ref | — | Параметры жёсткости | — |")
        elif num in COVER_PAGES:
            rows.append(f"| {num}.pdf | cover | {COVER_PAGES[num]} | Обложка коллекции | — |")
        elif num in PAGE_CATALOG:
            name, slug = PAGE_CATALOG[num]
            col = collection_for_page(num)
            rows.append(f"| {num}.pdf | product | {col} | {name} | `{slug}` |")
    rows += [
        "",
        f"**Product-страниц:** {len(PAGE_CATALOG)}",
        f"**Cover-страниц:** {len(COVER_PAGES)} (изображения не извлекаются)",
        f"**Ref-страниц:** {len(REF_PAGES)}",
    ]
    (OUT_DIR / "_inventory.md").write_text("\n".join(rows) + "\n", encoding="utf-8")


def main() -> None:
    PRODUCTS_DIR.mkdir(parents=True, exist_ok=True)
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    write_inventory()

    for page_num in sorted(PAGE_CATALOG):
        data = parse_page(page_num)
        slug = data["slug"]
        extract_product_image(page_num, slug)
        (PRODUCTS_DIR / f"{slug}.md").write_text(render_md(data), encoding="utf-8")
        print(f"OK pdf/{page_num}.pdf -> products/{slug}.md + images/{slug}.png")

    print(f"\nDone: {len(PAGE_CATALOG)} products")


if __name__ == "__main__":
    main()
