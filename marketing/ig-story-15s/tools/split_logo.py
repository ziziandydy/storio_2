"""Split the real Storio logo into transparent, independently animatable parts.

Every part is exported on the full 1024x1024 canvas so that stacking all parts
at the same position reproduces the original logo pixel-for-pixel.
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT.parents[1] / "client/public/image/logo/logo.png"
OUT = ROOT / "assets/logo"
OUT.mkdir(parents=True, exist_ok=True)

img = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float32) / 255.0
lum = img.max(axis=2)
# Luminance key: the logo is gold/cream on near-black textured paper.
alpha = np.clip((lum - 0.10) / 0.22, 0.0, 1.0)
rgba = np.dstack([img, alpha])

# Boxes are (x0, y0, x1, y1) in logo pixel space.
PARTS = {
    "reel_left": (205, 440, 365, 595),
    "reel_right": (660, 440, 815, 595),
    "book_top": (435, 225, 590, 365),
    "book_bottom": (435, 655, 590, 795),
    "wordmark": (372, 432, 652, 480 + 125),
}

remaining = rgba.copy()
for name, (x0, y0, x1, y1) in PARTS.items():
    part = np.zeros_like(rgba)
    part[y0:y1, x0:x1] = rgba[y0:y1, x0:x1]
    remaining[y0:y1, x0:x1, 3] = 0.0
    Image.fromarray((part * 255).astype(np.uint8), "RGBA").save(OUT / f"{name}.png")

Image.fromarray((remaining * 255).astype(np.uint8), "RGBA").save(OUT / "frame.png")
Image.fromarray((rgba * 255).astype(np.uint8), "RGBA").save(OUT / "full.png")
print("parts:", sorted(p.name for p in OUT.glob("*.png")))
