"""Variant C score: 140 BPM phonk-style cue in F# minor. Distorted 808 slides, cowbell riff,
trap hats with 32nd rolls, synthetic vocal chops, a half-beat break before the recap drop."""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / "tools"))
from synthlib import *  # noqa: E402,F401,F403

T = load_timing(HERE)
H = T["hits"]
m = Mix(T["duration"], T["bpm"])

# cowbell riff (8ths), the phonk signature
RIFF = [78, 81, 85, 83, 81, 78, 76, 78]
def cowbells(b0, b1, gain=0.5):
    b = b0
    while b < b1 - 1e-9:
        n = RIFF[int(round((b - b0) * 2)) % 8]
        m.place(cowbell(midi(n), 0.26, 0.5), b, gain, pan=0.25 if int(b * 2) % 2 else -0.25, send=0.25)
        b += 0.5

# 808 pattern per bar (beat offsets, note, slide_from)
PAT = [(0, 42, None), (0.75, 42, None), (1.5, 45, 42), (2.5, 42, None), (3.25, 40, 45)]
def groove(b0, b1, rolls=True):
    bar = b0
    while bar < b1 - 1e-9:
        for off, n, sl in PAT:
            if bar + off < b1:
                m.place(eight08(midi(n), 0.5, midi(sl) if sl else None), bar + off, 0.75)
                m.sidechain(bar + off, 0.4, 0.15)
        for k in (0, 2):
            if bar + k < b1:
                m.place(kick(1.2, 0.3, 50, 0.12), bar + k, 0.8)
        for k in (1, 3):
            if bar + k < b1:
                m.place(snap(), bar + k, 0.8, send=0.2)
                m.place(clap(0.08), bar + k, 0.5, send=0.25)
        h = bar
        while h < min(bar + 4, b1) - 1e-9:
            m.place(hat(amp=0.3), h, 0.9 if int(round(h * 2)) % 2 else 0.6, pan=0.3)
            h += 0.5
        if rolls and bar + 3.5 < b1:
            for i in range(8):
                m.place(hat(amp=0.22), bar + 3.5 + i * 0.0625, 0.5 + i * 0.05, pan=-0.3)
        bar += 4

# intro: counter build (cowbells + ticks), vocal chops on the words
cowbells(0, 4, 0.35)
for i in range(12):
    m.place(tick(3000 + i * 150, 0.03), i * 0.125, 0.3)
m.place(eight08(midi(42), 1.2), 0, 0.7)
for k, v in (("you", "a"), ("finished", "o"), ("them", "e")):
    m.place(vox_stab(midi(66), 0.22, v), H[k], 0.8, send=0.3)
    m.place(kick(1.1, 0.3, 50, 0.12), H[k], 0.6)
m.place(riser(m.s(1.5), 400, 4000, 0.6), 2.5, 0.6)

# drop 1: "now flex it" -> numbers
m.place(crash(1.4), H["flex"], 0.5, send=0.3)
m.place(sub_boom(1.2), H["flex"], 0.8)
m.place(vox_stab(midi(61), 0.35, "a"), H["flex"], 0.9, send=0.4)
groove(4, 12)
cowbells(4, 12)
m.place(cowbell(midi(90), 0.4, 0.5), H["brand"], 0.6, send=0.4)
for k in ("statA", "statB", "statC", "chart"):
    m.place(whoosh(0.2, 1500, 9000), H[k] - 0.3, 0.45, pan=0.4)
for i in range(30):
    m.place(tick(2000 + i * 90, 0.025), H["chart"] + i * (2 / 30), 0.2)

# build 12-14: filtered groove + snare roll + riser
groove(12, 14, rolls=False)
for i in range(16):
    m.place(snap(), 12 + i * 0.125, 0.15 + i * 0.04)
m.place(riser(m.s(2), 200, 5000, 0.9), 12, 0.7)

# drop 2: every. single. one. + collage
for k, v, n in (("every", "a", 66), ("single", "o", 69), ("one", "e", 73)):
    m.place(vox_stab(midi(n), 0.3, v), H[k], 1.0, send=0.35)
m.place(crash(1.6), H["every"], 0.55, send=0.4)
m.place(sub_boom(1.4), H["every"], 0.8)
groove(14, 21.5)
cowbells(14, 21.5)
for i in range(16):
    m.place(whoosh(0.12, 2000, 10000), H["every"] + i * 0.25 - 0.06, 0.18, pan=-0.6 + (i % 4) * 0.4)

# break (21.5 -> 22): silence except a reverse swell
g0, g1 = int(m.s(H["brk"]) * SR), int(m.s(H["recap"]) * SR)
for arr in (m.L, m.R, m.sL, m.sR):
    arr[g0:g1] *= 0.0
m.place(reverse_swell(m.s(0.45)), H["brk"] + 0.05, 0.5)

# drop 3: monthly recap + share
m.place(crash(1.6), H["recap"], 0.55, send=0.4)
m.place(sub_boom(1.4), H["recap"], 0.9)
m.place(vox_stab(midi(61), 0.35, "a"), H["recap"], 0.9, send=0.4)
groove(22, 29)
cowbells(22, 29)
for k in ("recapCal", "recapWf"):
    m.place(whoosh(0.2, 1500, 9000), H[k] - 0.3, 0.55, pan=0.5)
m.place(vox_stab(midi(73), 0.3, "e"), H["share"], 0.9, send=0.4)
m.place(crash(1.0), H["share"], 0.4, send=0.3)
m.place(riser(m.s(1), 400, 6000, 0.9), H["riser2"], 0.75)
for i in range(8):
    m.place(snap(), H["riser2"] + i * 0.125, 0.2 + i * 0.07)

# finale
m.place(kick(1.5, 0.5), H["finale"], 1.0)
m.place(eight08(midi(30), 2.2), H["finale"], 0.9)
m.place(sub_boom(2.0), H["finale"], 0.7)
m.place(crash(2.2), H["finale"], 0.6, send=0.5)
for i, n in enumerate((61, 66, 69)):
    m.place(vox_stab(midi(n), 0.6, "a"), H["finale"] + i * 0.02, 0.6, pan=-0.4 + 0.4 * i, send=0.5)
groove(30.5, 35, rolls=False)
cowbells(31, 35, 0.4)
m.place(vox_stab(midi(73), 0.3, "o"), H["cta"], 0.7, send=0.4)

m.render(HERE.parents[1] / "audio" / "grind.wav", reverb_sec=1.4, reverb_decay=0.4, wet=0.35, pump=0.3, fade=0.35, drive=2.0,
         gates=[(m.s(H["brk"]), m.s(H["recap"]))])
