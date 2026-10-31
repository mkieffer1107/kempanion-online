# Kempanion Ellipsis

`kempanion-ellipsis.woff2` is a renamed, one-character derivative of DotGothic16
from the project's pinned `@fontsource/dotgothic16` package. It contains only
U+2026: the original three-dot outline lowered to the font's period baseline.
The advance width, left bearing, font size and line metrics are preserved.

`global.css` registers it after the upstream font faces, under the same CSS
family with `unicode-range: U+2026`. This corrects all uses of the dialogue font,
including dynamically generated text and CSS truncation, without changing the
strings, typewriter timings or pagination. Pixelify Sans already draws the
ellipsis on the baseline and is unchanged.

Regenerate with `uv run scripts/build-ellipsis-font.py`; verify the committed
binary with `uv run scripts/build-ellipsis-font.py --check`. FontTools and Brotli
are pinned in the script; they are not needed for game builds. Vite embeds this
small WOFF2 in the shared stylesheet, so it also travels with the offline build.

Copyright 2020 The DotGothic16 Project Authors
(https://github.com/fontworks-fonts/DotGothic16/). Distributed under the SIL Open
Font License 1.1 in `OFL.txt`, also embedded in the font and included in the
game's generated third-party notices.
