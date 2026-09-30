"""Variant B score: 76 BPM, F major. Felt piano, upright bass, brushes, vinyl, page-turn foley."""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / "tools"))
from synthlib import *  # noqa: E402,F401,F403

T = load_timing(HERE)
H = T["hits"]
m = Mix(T["duration"], T["bpm"])

# chord map: start beat -> (bass midi, voicing)
FMAJ7 = (41, [53, 57, 60, 64])
DM9 = (38, [50, 53, 57, 60, 64])
BBMAJ7 = (46, [50, 53, 57, 62])
CSUS = (36, [48, 53, 55, 60])
AM7 = (45, [52, 55, 60, 64])
chords = [(0, FMAJ7), (4, DM9), (8, BBMAJ7), (12, CSUS), (14, AM7), (16, FMAJ7)]


def chord_at(b):
    return [c for s, c in chords if b >= s][-1]


m.place(vinyl(T["duration"]), 0, 1.0)

# piano: broken-chord 8ths with a gentle top line
b = 0.0
while b < 16:
    bass, voic = chord_at(b)
    step = int(round(b * 2))
    note = voic[[0, 2, 1, 3, 2, 1, 3, 2][step % 8] % len(voic)]
    vel = 0.9 if step % 2 == 0 else 0.65
    m.place(felt_piano(midi(note), 1.8, vel), b, 0.55, pan=-0.2 + 0.1 * (step % 4), send=0.45)
    b += 0.5
melody = [(0, 72), (1.5, 69), (2, 72), (3, 76), (4.5, 74), (6, 72), (7, 69), (8, 74), (9.5, 72), (10.5, 70), (12, 72), (13, 72), (14, 76), (15, 74)]
for mb, n in melody:
    m.place(felt_piano(midi(n), 2.4, 0.9), mb, 0.5, pan=0.1, send=0.55)

# upright bass on 1 and 3 from the first cover landing
for bb in [x * 1.0 for x in range(4, 16)]:
    if bb % 2 == 0 or bb >= 13:
        bass, _ = chord_at(bb)
        m.place(upright(midi(bass), 0.9), bb, 0.7, send=0.1)

# brushes + soft kick groove (b4 -> b16), sparse and warm
b = 4.0
while b < 16:
    if abs(b - round(b)) < 1e-6 and int(b) % 2 == 0:
        m.place(soft_kick(), b, 0.55)
    if abs(b - round(b)) < 1e-6 and int(b) % 2 == 1:
        m.place(brush(0.4), b, 0.9, pan=0.2, send=0.2)
    m.place(brush(0.12), b + 0.5, 0.35, pan=-0.2)
    b += 1.0

# foley and accents tied to picture
m.place(band(noise(0.45), 2500, 9000) * np.exp(-t_axis(0.45) / 0.18) * 0.12, H["underline"], 1.0, pan=0.2)  # pen stroke
m.place(page_turn(0.7), H["brand"] - 0.6, 0.9, pan=-0.3)
book_thud = soft_kick() * 0.5
book_thud[: int(0.15 * SR)] += band(noise(0.15), 400, 3000) * np.exp(-t_axis(0.15) / 0.03) * 0.3
for i in range(6):
    m.place(book_thud, H["shelf"] + i * 0.5, 0.6)
m.place(page_turn(0.6), H["reflect"] - 0.6, 0.8, pan=0.3)
for i in range(16):
    m.place(tick(2200 + (i % 3) * 300, 0.03), H["typeStart"] + i * 0.125, 0.18, pan=-0.2 + (i % 4) * 0.12)
for i in range(10):
    m.place(bell(midi([72, 74, 77, 79, 81, 84, 86, 89, 91, 93][i]), 1.2, 0.18), H["stars"] + i * 0.125, 1.0, pan=-0.45 + i * 0.1, send=0.6)
m.place(soft_kick(), H["stamp"], 0.9)
m.place(band(noise(0.2), 300, 2500) * np.exp(-t_axis(0.2) / 0.05) * 0.35, H["stamp"], 1.0)
m.place(page_turn(0.7), H["share2"] - 0.7, 0.9, pan=-0.3)

# finale: full F major bloom
for i, n in enumerate([41, 53, 57, 60, 64, 69, 72]):
    m.place(felt_piano(midi(n), 3.5, 1.0), H["finale"] + i * 0.03, 0.55, pan=-0.3 + i * 0.1, send=0.6)
m.place(upright(midi(29), 1.4), H["finale"], 0.8)
m.place(bell(midi(84), 2.0, 0.22), H["tagline"], 1.0, send=0.7)
m.place(bell(midi(88), 2.0, 0.18), H["cta"], 1.0, send=0.7)

m.render(HERE.parents[1] / "audio" / "reader.wav", reverb_sec=2.8, reverb_decay=0.9, wet=0.6, pump=0.05, fade=0.6, drive=1.2, peak=0.85)
