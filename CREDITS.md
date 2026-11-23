# Credits

Every mesh, texture and sound of the game itself is generated in code (MIT, see `LICENSE`). Three.js (MIT) is loaded
from a CDN.

## 3D chibi style (stil-3d, 24.11.2026)

The pictures in `assets/3d/` follow the game's own song video (`atolye/muzik-reel/oyunlar/mimar-sinan/`): the same
master architect (white turban, green kaftan, brass compass, rolled plan), the young engineer (hard hat, glasses,
safety vest, calculator), warm sunset light and a clay toy finish. The item sheets were requested on a white
background and cut out and keyed locally with PIL (`atolye/oyun-stil/mimar-sinan/kes.py`).

| File | Tool | Content |
|---|---|---|
| `3d/chibi.webp` | Gemini app (Nano Banana), 1 request (3x3 sheet) | sprite atlas on the building site: the architect (two poses), the engineer, six workers (stonemason, stone carrier, wheelbarrow, plank, trowel and bucket, apprentice) |
| `3d/poz-mimar.webp`, `3d/poz-mimar-isaret.webp`, `3d/poz-muhendis.webp` | same sheet | figures on the title card, the result card, the ending card and the HUD badge |
| `3d/parca-*.webp` | Gemini app (Nano Banana), 1 request (3x3 sheet) | tray and brief icons: pier, wall, buttress, weight tower, arch, dome, half dome, minaret, scaffolding |
| `3d/gok.webp` | frame of the song video (`gorsel/genis.jpg`, the video's key frame, made with ChatGPT image generation) | sunset clouds on the sky dome |
| `3d/kapak.webp` | same frame | the half-built mosque at sunset, title card header |

The clay masonry texture of the pieces (soft rounded ashlar with a light top edge) is drawn in code.
