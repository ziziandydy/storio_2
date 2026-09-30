"""Elegant re-cut score: 64 BPM, D major. No drums. Felt piano on quarter notes over a warm pad,
upright bass on chord changes, soft bells for the logo, the stars and the end card. Long hall reverb."""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / "tools"))
from synthlib import *  # noqa: E402,F401,F403

T = load_timing(HERE)
H = T["hits"]
m = Mix(T["duration"], T["bpm"])

# start beat, bass, voicing
DMAJ9 = (38, [50, 54, 57, 61, 64])
BM9 = (35, [47, 50, 54, 57, 61])
GMAJ9 = (43, [50, 54, 57, 59, 62])
ASUS = (45, [52, 55, 57, 62, 64])
chords = [(0, DMAJ9), (H["folio"], BM9), (H["rate"], GMAJ9), (H["share"], ASUS), (H["finale"], DMAJ9)]


def chord_at(b):
    return [c for s, c in chords if b >= s - 1e-9][-1]


def pad(freq, beats):
    sec = m.s(beats) + 1.2
    sig = drone(freq, sec, bright=520)
    rel = int(1.2 * SR)
    sig[-rel:] *= np.linspace(1, 0, rel) ** 2
    return sig


# pad: one sustained voicing per chord, overlapping into the next
bounds = [s for s, _ in chords] + [16]
for (s, (bass, voic)), e in zip(chords, bounds[1:]):
    for i, n in enumerate(voic[:4]):
        m.place(pad(midi(n), e - s), s, 0.16 if s else 0.12, pan=-0.35 + 0.23 * i, send=0.5)
    m.place(pad(midi(bass), e - s), s, 0.18, send=0.2)

# opening: a single low note and a bell as the hairline draws
m.place(upright(midi(26), 2.5), 0, 0.7, send=0.3)
m.place(bell(midi(81), 2.5, 0.16), H["wordmark"], 1.0, pan=0.15, send=0.8)

# felt piano: one note per beat from the logo onward, a slow melody above
b = 1.0
while b < H["finale"]:
    _, voic = chord_at(b)
    step = int(round(b))
    note = voic[[0, 2, 1, 3][step % 4]]
    m.place(felt_piano(midi(note), 2.8, 0.75), b, 0.5, pan=-0.2 + 0.13 * (step % 4), send=0.55)
    b += 1.0
melody = [(2, 73), (3, 76), (4.25, 74), (5.5, 73), (6.75, 71), (8, 74), (9, 71), (10, 69), (11.25, 76), (12.25, 74)]
for mb, n in melody:
    m.place(felt_piano(midi(n), 3.2, 0.95), mb, 0.5, pan=0.12, send=0.65)

# upright bass on each chord change
for s, (bass, _) in chords[1:]:
    m.place(upright(midi(bass), 1.6), s, 0.65, send=0.15)

# stars: nine soft bells climbing the scale
for i, n in enumerate([74, 76, 78, 81, 83, 85, 86, 88, 90]):
    m.place(bell(midi(n), 1.6, 0.1), H["stars"] + i * (0.1 / m.beat), 1.0, pan=-0.4 + i * 0.1, send=0.8)

# a breath before each scene change
for k in ("folio", "rate", "share", "finale"):
    m.place(reverse_swell(1.1) * 0.35, H[k] - 1.1 / m.beat, 1.0, send=0.3)

# end card: open D major bloom, then a last bell under the call to action
for i, n in enumerate([38, 50, 57, 61, 64, 66, 69, 73]):
    m.place(felt_piano(midi(n), 4.0, 0.9), H["finale"] + i * 0.06, 0.5, pan=-0.35 + i * 0.1, send=0.7)
m.place(upright(midi(26), 2.5), H["finale"], 0.7)
m.place(bell(midi(86), 2.5, 0.14), H["cta"], 1.0, pan=-0.1, send=0.85)

m.render(HERE.parents[1] / "audio" / "elegant.wav", reverb_sec=3.6, reverb_decay=1.3, wet=0.65, pump=0.0, fade=0.9, drive=1.1, peak=0.8)
