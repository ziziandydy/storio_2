"""Cut reusable UI components out of the real-device screenshots in /image (1206x2622)."""
from pathlib import Path
from PIL import Image

SRC = Path(__file__).resolve().parents[2] / "image"
OUT = Path(__file__).resolve().parent / "components"
CROPS = {
    "counter":   ("screenshot-01-onboarding.png", (300, 1170, 906, 1480)),
    "grid":      ("screenshot-02-search.png", (60, 180, 1146, 1800)),
    "searchbar": ("screenshot-02-search.png", (60, 1880, 1040, 2330)),
    "poster":    ("screenshot-03-details.png", (75, 420, 1130, 2030)),
    "trailers":  ("screenshot-04-details-cinematic.png", (60, 255, 1206, 605)),
    "cast":      ("screenshot-04-details-cinematic.png", (60, 780, 1000, 1320)),
    "watch":     ("screenshot-04-details-cinematic.png", (60, 1490, 1130, 1900)),
    "calendar":  ("screenshot-06-calendar.png", (45, 430, 1160, 1730)),
    "gallery":   ("screenshot-07-gallery.png", (210, 705, 995, 1885)),
    "styles":    ("screenshot-08-share.png", (60, 990, 1146, 1390)),
    "recap":     ("screenshot-09-monthlySharing.png", (120, 450, 1085, 2170)),
}
OUT.mkdir(exist_ok=True)
for name, (f, box) in CROPS.items():
    Image.open(SRC / f).convert("RGB").crop(box).save(OUT / f"{name}.png")
    print(name, box)
