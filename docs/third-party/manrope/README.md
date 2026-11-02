# Manrope web fonts

Copyright 2018 The Manrope Project Authors
(https://github.com/googlefonts/manrope).

Manrope is distributed under the SIL Open Font License, Version 1.1. The complete
copyright notice and license are preserved in `OFL.txt` and in the deployed
`frontend/fonts/OFL-Manrope.txt`.

## Source and integration

Downloaded on 30 October 2026 from the official Google Fonts CSS API and
`fonts.gstatic.com`. These are unmodified variable WOFF2 subsets from Manrope
version 23, selected for Latin and Latin Extended. No glyphs were edited and no
local font conversion was performed.

- Stylesheet request:
  https://fonts.googleapis.com/css2?family=Manrope:wght@400..800&display=swap
- Latin Extended:
  https://fonts.gstatic.com/s/manrope/v23/xn7gYHE41ni1AdIRggmxSuXd.woff2
- Latin:
  https://fonts.gstatic.com/s/manrope/v23/xn7gYHE41ni1AdIRggexSg.woff2
- Official license:
  https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/OFL.txt

`frontend/css/fonts.css` declares normal variable weights 400–800 with
`font-display: swap` and preserves Google's original `unicode-range` for each
subset. Link this stylesheet once per page. Existing `Manrope, system-ui,
sans-serif` stacks continue to provide system-font fallback for Nepali text;
these subsets do not include Devanagari.

Font files total **39,692 bytes**. A browser downloads a subset only when it
needs characters covered by that face's `unicode-range`.

## Provenance and verification

`google-fonts-source.css` preserves the exact API response, including the source
subset declarations. `sources.json` records the response URL, request User-Agent,
download time, font URLs, byte lengths, unicode ranges, and SHA-256 hashes. Both
font downloads were checked for the WOFF2 file signature. The font binaries and
license should retain these hashes unless intentionally updated:

| File | SHA-256 |
| --- | --- |
| `frontend/fonts/manrope-latin-ext-wght-400-800.woff2` | `2f7335119075b2079f1d882530bbc18728461612bf90743203d73a74a48f4d9b` |
| `frontend/fonts/manrope-latin-wght-400-800.woff2` | `8c2def024c1bf31aacf3624ae3c4d701269b4ec3dc765c04830839f0d36b2d9e` |
| `OFL.txt` / `frontend/fonts/OFL-Manrope.txt` | `58172e0c0fac2cda8a37b348164bb55e44b0e69051e557e92b1d3f6910141f7b` |

`node docs/third-party/manrope/download.mjs` can fetch a fresh upstream copy.
It is an explicit maintenance command, not a build step. Google can change its
API response and asset versions; review any newly downloaded fonts, URLs,
checksums, unicode ranges, and license before committing an update.
