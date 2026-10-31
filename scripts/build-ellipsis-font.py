#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["fonttools==4.68.0", "brotli==1.2.1"]
# ///
"""Build the game's baseline ellipsis from its pinned DotGothic16 font.

Run `uv run scripts/build-ellipsis-font.py` after changing the source font, or add
`--check` to verify the checked-in WOFF2. Normal game builds use the committed file
and do not need Python. Only U+2026 changes; text, advance widths and line metrics
stay intact. The renamed one-glyph subset retains the source's OFL copyright.
"""
import argparse
from io import BytesIO
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "node_modules/@fontsource/dotgothic16"
OUTPUT = ROOT / "src/styles/fonts/kempanion-ellipsis.woff2"


def build():
    font = TTFont(SOURCE / "files/dotgothic16-latin-400-normal.woff2", recalcTimestamp=False)
    cmap = font.getBestCmap()
    period = font["glyf"][cmap[0x2E]]
    ellipsis = font["glyf"][cmap[0x2026]]
    advance = font["hmtx"][cmap[0x2026]]
    metrics = (font["hhea"].ascent, font["hhea"].descent, font["hhea"].lineGap)
    # DotGothic16's dots are centered for Japanese typography. Move the existing
    # three-dot outline down to its period's bottom, preserving its size/spacing.
    offset = period.yMin - ellipsis.yMin
    assert offset < 0, "The source ellipsis changed; review its baseline before regenerating"
    ellipsis.coordinates.translate((0, offset))
    ellipsis.recalcBounds(font["glyf"])
    baseline = period.yMin

    options = subset.Options()
    options.layout_features = []
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
    options.recalc_timestamp = False
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=[0x2026])
    subsetter.subset(font)
    names = {
        1: "Kempanion Ellipsis", 2: "Regular", 3: "KempanionEllipsis-Regular-1.0",
        4: "Kempanion Ellipsis Regular", 5: "Version 1.000", 6: "KempanionEllipsis-Regular",
        13: (SOURCE / "LICENSE").read_text(), 14: "https://openfontlicense.org/",
    }
    for record in font["name"].names:
        if record.nameID in names:
            record.string = names[record.nameID].encode(record.getEncoding())
    for name_id, value in names.items():
        font["name"].setName(value, name_id, 3, 1, 0x409)
    font.flavor = "woff2"
    buffer = BytesIO()
    font.save(buffer)
    data = buffer.getvalue()

    # Check the encoded artifact too, so subsetting cannot silently change layout.
    check = TTFont(BytesIO(data))
    assert set(check.getBestCmap()) == {0x2026}
    glyph = check.getBestCmap()[0x2026]
    assert check["glyf"][glyph].yMin == baseline
    assert check["hmtx"][glyph] == advance
    assert (check["hhea"].ascent, check["hhea"].descent, check["hhea"].lineGap) == metrics
    return data


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    result = build()
    if args.check:
        assert OUTPUT.read_bytes() == result, "Regenerate the ellipsis font"
        print("Ellipsis font matches its source; baseline and metrics checked.")
    else:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_bytes(result)
        print(f"Wrote {OUTPUT.relative_to(ROOT)} ({len(result)} bytes)")
