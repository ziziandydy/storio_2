"""Variant A score: 90 BPM trailer cue in D minor (ticks, taiko, braams, ostinato, dead air, final hit)."""
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / "tools"))
from synthlib import *  # noqa: E402,F401,F403

T = load_timing(HERE)
H = T["hits"]
m = Mix(T["duration"], T["bpm"])

# tension bed
m.place(drone(midi(38), m.s(18.2), bright=500), 0, 0.3, send=0.3)
m.place(drone(midi(26), m.s(18.2), bright=200), 0, 0.35)
b = 0.0
while b < H["deadAir"]:
    fast = b >= H["riser"]
    m.place(tick(4400 if int(b * 2) % 2 == 0 else 3300), b, 0.5 if not fast else 0.35, pan=0.3 if int(b * 4) % 2 else -0.3)
    b += 0.25 if fast else 0.5

# hook hits
for hb, f in ((H["hookA"], 70), (H["hookB"], 62)):
    m.place(taiko(f), hb, 0.9, send=0.4)
    m.place(sub_boom(1.0), hb, 0.4)
m.place(braam(38, 2.4), H["question"], 0.85, send=0.5)
m.place(taiko(55), H["question"], 1.0, send=0.4)
m.place(crash(1.6), H["question"], 0.35, send=0.4)
# brand sting
m.place(taiko(80), H["brand"], 0.8, send=0.3)
for i, n in enumerate((74, 77, 81)):
    m.place(bell(midi(n), 1.6, 0.35), H["brand"] + i * 0.04, 1.0, pan=-0.3 + 0.3 * i, send=0.6)

# ostinato + pulse (b4 -> b16.5)
arp = [50, 53, 57, 62, 57, 53, 50, 45]
chords = {4: 0, 6: -2, 8: -4, 11: -7, 14: 0}
b = H["everyFilm"]
while b < H["riser"]:
    shift = [v for k, v in sorted(chords.items()) if b >= k][-1]
    idx = int(round((b - H["everyFilm"]) * 4)) % len(arp)
    m.place(ostinato_note(midi(arp[idx] + shift), 0.2, 2600), b, 0.42, pan=-0.25 if idx % 2 else 0.25, send=0.25)
    if abs(b - round(b)) < 1e-6:
        m.place(taiko(66 if int(b) % 2 == 0 else 88), b, 0.6, send=0.2)
        m.sidechain(b, 0.5)
    b += 0.25
for bb, root in ((H["everyFilm"], 34), (H["everySeason"], 41), (H["seasons"], 34), (H["rate"], 43), (H["ticket"], 38)):
    m.place(braam(root, 2.0), bb, 0.6, send=0.45)
for i in range(8):
    m.place(whoosh(0.22, 1500, 8000), H["everyFilm"] + i * 0.5 - 0.15, 0.25, pan=-0.5)
for i in range(3):
    m.place(pluck(midi(74 + i * 3), 0.35, 0.6), H["seasonChip"] + i * 0.5, 0.5, send=0.3)
m.place(taiko(95), H["addBtn"], 0.7)
m.place(tick(2600, 0.06), H["addBtn"], 0.8)

# rate: 9 star plucks on 32nds, then the stamp
for i, n in enumerate([62, 65, 69, 72, 74, 77, 81, 84, 86]):
    m.place(pluck(midi(n), 0.4, 0.5), H["starsStart"] + i * 0.125, 0.55, pan=-0.4 + i * 0.1, send=0.35)
m.place(taiko(50), H["stamp"], 1.0, send=0.4)
m.place(sub_boom(1.2), H["stamp"], 0.6)
m.place(crash(1.2), H["stamp"], 0.35, send=0.3)

# ticket / tv
m.place(crash(1.8), H["ticket"], 0.4, send=0.4)
m.place(whoosh(0.35), H["tv"] - 0.25, 0.6, pan=0.4)
m.place(taiko(70), H["tv"], 0.8)

# build: riser + accelerating taiko roll into the cut
m.place(riser(m.s(H["deadAir"] - H["riser"]), 150, 3200, 0.9), H["riser"], 0.8, send=0.3)
rb = H["riser"]
while rb < H["deadAir"]:
    m.place(taiko(100 + (rb - H["riser"]) * 30), rb, 0.35 + (rb - H["riser"]) * 0.3)
    rb += 0.25 if rb < 17.25 else 0.125

# dead air: hard gate everything between the cut and the final hit
g0, g1 = int(m.s(H["deadAir"]) * SR), int((m.s(H["finale"]) - 0.02) * SR)
for arr in (m.L, m.R, m.sL, m.sR):
    arr[g0:g1] *= 0.0
m.place(reverse_swell(m.s(H["finale"] - H["deadAir"] - 0.35)), H["deadAir"] + 0.35, 0.35)

# finale
m.place(braam(38, 3.0), H["finale"], 1.0, send=0.6)
m.place(sub_boom(2.4), H["finale"], 1.0)
m.place(taiko(48), H["finale"], 1.0, send=0.5)
m.place(crash(2.4), H["finale"], 0.6, send=0.6)
for i, n in enumerate((62, 69, 74, 77, 81)):
    m.place(bell(midi(n), 2.2, 0.3), H["finale"] + i * 0.03, 0.8, pan=-0.5 + 0.25 * i, send=0.7)
m.place(bell(midi(86), 1.5, 0.25), H["tagline"], 0.8, send=0.7)
m.place(tick(3000, 0.06), H["cta"], 0.9)
m.place(taiko(60), H["cta"], 0.5, send=0.4)

m.render(HERE.parents[1] / "audio" / "cinephile.wav", reverb_sec=2.6, reverb_decay=0.8, wet=0.55, pump=0.2, fade=0.4, drive=1.5,
         gates=[(m.s(H["deadAir"]), m.s(H["finale"]) - 0.02)])
