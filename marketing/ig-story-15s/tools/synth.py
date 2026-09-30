"""Original 15s soundtrack for the Storio IG Story promo, synthesized from scratch.

No samples, no third-party audio: every sound is built from oscillators and
noise with numpy. Arrangement follows timing.json so audio hits line up with
the animation's hit frames.
"""
import json
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
T = json.loads((ROOT / "timing.json").read_text())
SR = 44100
BPM = T["bpm"]
BEAT = 60.0 / BPM
DUR = T["duration"]
N = int(SR * DUR)
H = T["hits"]
rng = np.random.default_rng(7)

L = np.zeros(N)
R = np.zeros(N)
send_L = np.zeros(N)  # reverb send bus
send_R = np.zeros(N)
duck = np.ones(N)  # sidechain gain applied to bass/pads


def b2s(beat):
    return int(round(beat * BEAT * SR))


def place(sig, beat, gain=1.0, pan=0.0, send=0.0):
    """Add a mono signal at a beat position with equal-power pan and reverb send."""
    start = b2s(beat)
    if start >= N:
        return
    sig = sig[: N - start] * gain
    gl = np.cos((pan + 1) * np.pi / 4)
    gr = np.sin((pan + 1) * np.pi / 4)
    L[start : start + len(sig)] += sig * gl
    R[start : start + len(sig)] += sig * gr
    if send:
        send_L[start : start + len(sig)] += sig * gl * send
        send_R[start : start + len(sig)] += sig * gr * send


def t_axis(sec):
    return np.arange(int(sec * SR)) / SR


def band(sig, lo, hi):
    """Zero-phase FFT band filter with soft edges."""
    spec = np.fft.rfft(sig)
    f = np.fft.rfftfreq(len(sig), 1 / SR)
    mask = np.ones_like(f)
    if lo:
        mask *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi:
        mask *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(spec * mask, len(sig))


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


# ---------------------------------------------------------------- instruments

def kick(punch=1.0, length=0.45):
    t = t_axis(length)
    f = 44 + 120 * np.exp(-t / 0.032) * punch
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / 0.26)
    click = band(rng.standard_normal(len(t)), 1500, 9000) * np.exp(-t / 0.004) * 0.5
    return np.tanh((body + click) * 1.8) * 0.9


def clap():
    t = t_axis(0.35)
    n = rng.standard_normal(len(t))
    env = np.zeros_like(t)
    for off in (0.0, 0.011, 0.022):
        env += np.where(t >= off, np.exp(-(t - off) / 0.012), 0)
    env += np.where(t >= 0.03, np.exp(-(t - 0.03) / 0.13), 0) * 0.55
    return band(n, 900, 3200) * env * 0.9


def hat(open_=False):
    t = t_axis(0.3 if open_ else 0.08)
    n = rng.standard_normal(len(t))
    return band(n, 7000, None) * np.exp(-t / (0.11 if open_ else 0.018)) * 0.35


def snare_tick(pitch=1.0):
    t = t_axis(0.12)
    tone = np.sin(2 * np.pi * 190 * pitch * t) * np.exp(-t / 0.03)
    noise = band(rng.standard_normal(len(t)), 1200, 8000) * np.exp(-t / 0.045)
    return (tone * 0.5 + noise) * 0.55


def sub_boom(length=2.2):
    t = t_axis(length)
    f = 38 + 30 * np.exp(-t / 0.25)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.tanh(np.sin(ph) * np.exp(-t / 0.75) * 1.6) * 0.9


def crash(length=2.4):
    t = t_axis(length)
    n = rng.standard_normal(len(t))
    shimmer = 1 + 0.3 * np.sin(2 * np.pi * 7 * t)
    return band(n, 3500, 15000) * np.exp(-t / 0.7) * shimmer * 0.45


def clank(freq=620):
    """FM metallic hit for logo parts locking into place."""
    t = t_axis(0.5)
    idx = 6 * np.exp(-t / 0.05)
    mod = np.sin(2 * np.pi * freq * 1.414 * t) * idx
    car = np.sin(2 * np.pi * freq * t + mod) * np.exp(-t / 0.12)
    thud = np.sin(2 * np.pi * 90 * t) * np.exp(-t / 0.05)
    return (car * 0.45 + thud * 0.6) * 0.8


def supersaw(freqs, length, cutoff=3500, decay=None, voices=5, detune=0.12):
    """Band-limited additive detuned saw chord. Cutoff doubles as a lowpass."""
    t = t_axis(length)
    out = np.zeros_like(t)
    for f0 in freqs:
        for v in range(voices):
            f = f0 * 2 ** ((v - (voices - 1) / 2) * detune / 12 / 2)
            ph0 = rng.uniform(0, 2 * np.pi)
            kmax = int(min(cutoff * 1.6, SR / 2 - 200) // f)
            for k in range(1, max(kmax, 1) + 1):
                w = 1 / k / (1 + (k * f / cutoff) ** 3)
                out += np.sin(2 * np.pi * k * f * t + ph0 * k) * w
    out /= max(1, len(freqs) * voices)
    env = np.minimum(1, t / 0.004)
    if decay:
        env *= np.exp(-t / decay)
    return out * env


def pluck(freq, length=0.4):
    t = t_axis(length)
    out = np.zeros_like(t)
    for k in range(1, 12):
        out += np.sin(2 * np.pi * k * freq * t) / k * np.exp(-t / (0.25 / k**0.6))
    return out * np.minimum(1, t / 0.002) * 0.5


def bell(freq, length=1.2):
    t = t_axis(length)
    mod = np.sin(2 * np.pi * freq * 3.5 * t) * 2.2 * np.exp(-t / 0.3)
    return np.sin(2 * np.pi * freq * t + mod) * np.exp(-t / 0.45) * 0.4


def riser(length, f0=180, f1=2400):
    t = t_axis(length)
    x = t / length
    f = f0 * (f1 / f0) ** (x**1.6)
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = (np.sin(ph) + 0.4 * np.sin(2 * ph)) * 0.25
    noise = band(rng.standard_normal(len(t)), 1800, 12000) * 0.5
    return (tone + noise) * x**2.2


def whoosh(length=0.45):
    t = t_axis(length)
    env = np.sin(np.pi * np.clip(t / length, 0, 1)) ** 2
    return band(rng.standard_normal(len(t)), 800, 7000) * env * 0.6


def tick():
    t = t_axis(0.03)
    return band(rng.standard_normal(len(t)), 2500, 11000) * np.exp(-t / 0.004) * 0.5


def downlifter(length=1.8):
    t = t_axis(length)
    f = 900 * (0.12 ** (t / length))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / 0.7) * 0.25 + band(rng.standard_normal(len(t)), 500, 5000) * np.exp(-t / 0.5) * 0.2


# ---------------------------------------------------------------- arrangement
# Chords (A minor), each entry: start beat -> (root midi, chord midis)
AM = (45, [57, 60, 64, 69])
F = (41, [53, 57, 60, 65])
C = (48, [55, 60, 64, 67])
G = (43, [55, 59, 62, 67])
E = (40, [56, 59, 64, 68])
chords = [(0, AM), (4, AM), (8, F), (12, C), (16, G), (20, F), (22, AM), (24, E), (26, AM)]


def chord_at(beat):
    cur = chords[0][1]
    for b, c in chords:
        if beat >= b:
            cur = c
    return cur


# --- Intro (b0-b4): impact, part-lock clanks, riser + roll into the drop
place(kick(1.3), H["frameSlam"], 1.0)
place(sub_boom(1.6), H["frameSlam"], 0.7)
place(crash(1.6), H["frameSlam"], 0.5, send=0.4)
place(supersaw([midi(n) for n in AM[1]], 2.0, cutoff=900) * np.exp(-t_axis(2.0) / 1.2), 0, 0.5, send=0.5)
for i, (hit, f, pan) in enumerate([
    ("reelLeft", 520, -0.6), ("reelRight", 560, 0.6), ("bookTop", 700, -0.2),
    ("bookBottom", 660, 0.2), ("wordmark", 820, 0.0),
]):
    place(clank(f), H[hit], 0.9, pan, send=0.35)
    place(kick(0.6, 0.25), H[hit], 0.35)
place(riser(2.0), 0, 0.55, send=0.3)
for i in range(8):  # 16th snare roll b3.5 -> b4, rising pitch
    place(snare_tick(1 + i * 0.06), 3.0 + i * 0.125, 0.25 + i * 0.07, send=0.2)

# --- Drop (b4)
place(sub_boom(2.2), H["drop"], 0.85)
place(crash(), H["drop"], 0.7, send=0.5)
place(supersaw([midi(n) for n in AM[1]] + [midi(81)], 1.2, cutoff=6000, decay=0.45), H["drop"], 0.9, send=0.6)

# --- Groove sections
def groove(b0, b1, halftime=False):
    b = b0
    while b < b1 - 1e-9:
        step = round((b - b0) / 0.25)
        on_beat = abs(b - round(b)) < 1e-9
        if on_beat and (not halftime or int(round(b)) % 2 == 0):
            place(kick(), b, 0.95)
            s, e = b2s(b), min(N, b2s(b) + int(0.22 * SR))
            duck[s:e] = np.minimum(duck[s:e], 0.25 + 0.75 * np.linspace(0, 1, e - s) ** 1.5)
        if on_beat and int(round(b)) % 2 == 1 and not halftime:
            place(clap(), b, 0.8, send=0.25)
        if not halftime:
            accent = 1.0 if step % 2 else 0.55
            place(hat(open_=(step % 4 == 2)), b, 0.8 * accent, pan=0.35 if step % 2 else -0.25)
        b += 0.25


def bassline(b0, b1):
    b = b0
    while b < b1 - 1e-9:
        root = chord_at(b)[0]
        # offbeat 8ths + a 16th pickup, classic pumping pattern
        for off, vel in ((0.5, 1.0), (0.75, 0.6)):
            t = t_axis(0.22)
            f = midi(root)
            sig = supersaw([f], 0.22, cutoff=700, voices=3, detune=0.08) * np.exp(-t / 0.12)
            sig += np.sin(2 * np.pi * f / 2 * t) * np.exp(-t / 0.15) * 0.8
            place(np.tanh(sig * 1.5) * 0.55 * vel, b + off, 1.0)
        b += 1


def stabs(b0, b1, pattern=(0.5, 1.75, 2.5, 3.75)):
    bar = b0
    while bar < b1 - 1e-9:
        for off in pattern:
            b = bar + off
            if b >= b1:
                continue
            notes = [midi(n) for n in chord_at(b)[1]]
            place(supersaw(notes, 0.35, cutoff=4200, decay=0.14), b, 0.42, pan=rng.uniform(-0.3, 0.3), send=0.45)
        bar += 4


groove(4, 18)
bassline(4, 18)
stabs(4, 14)
for hit in ("tagCollect", "tagStories", "tagFolio"):
    place(clank(900), H[hit], 0.35, send=0.3)
place(whoosh(0.5), H["movies"] - 0.5, 0.7, pan=-0.4)
for hit, pan in (("movies", -0.3), ("series", 0.3), ("books", 0.0)):
    place(crash(0.9), H[hit], 0.28, pan, send=0.3)
    place(whoosh(0.3), H[hit] - 0.25, 0.4, pan=-pan)
place(whoosh(0.4), H["bento"] - 0.2, 0.5)
for i in range(4):  # fill into the rate section
    place(snare_tick(1.1 + i * 0.05), 13.5 + i * 0.125, 0.3 + i * 0.08)

# --- Rate (b14-b18): rising pentatonic pluck per star, then the stamp slam
place(crash(1.2), H["rate"], 0.45, send=0.4)
penta = [69, 72, 74, 76, 79, 81, 84, 86, 88]  # 9 stars -> 9 plucks (score 9/10)
for i, n in enumerate(penta):
    place(pluck(midi(n)), H["starsStart"] + i * 0.25 / 2, 0.55, pan=-0.5 + i * 0.1, send=0.35)
place(kick(1.4), H["stamp"], 1.0)
place(sub_boom(1.0), H["stamp"], 0.6)
place(clap(), H["stamp"], 0.9, send=0.4)
place(clank(300), H["stamp"], 0.8, send=0.3)

# --- Reflect (b18-b22): halftime breakdown, typewriter ticks, AI sparkle, riser
groove(18, 22, halftime=True)
place(supersaw([midi(n) for n in F[1]], 2.0, cutoff=1800) * np.minimum(1, t_axis(2.0) / 0.05), H["reflect"], 0.85, send=0.6)
for b in (18, 18.75, 19.5, 20, 20.75, 21.5):  # half-time sub pulse keeps the floor alive
    t = t_axis(0.5)
    place(np.sin(2 * np.pi * midi(29) * t) * np.exp(-t / 0.3) * 0.7, b, 1.0)
for i in range(14):
    place(tick(), H["reflect"] + i * 0.125, 0.9 + 0.3 * (i % 3 == 0), pan=rng.uniform(-0.4, 0.4))
for i, n in enumerate([81, 84, 88, 91, 93, 96]):
    place(bell(midi(n)), H["aiRefine"] + i * 0.0625, 0.45, pan=-0.6 + i * 0.24, send=0.7)
place(supersaw([midi(n) for n in AM[1]], 1.0, cutoff=5000) * np.exp(-t_axis(1.0) / 0.9), H["aiRefine"], 0.3, send=0.6)
place(riser(1.0, 300, 3500), H["aiRefine"], 0.6, send=0.3)
for i in range(8):
    place(snare_tick(1 + i * 0.07), 21.0 + i * 0.125, 0.2 + i * 0.08)

# --- Share (b22-b26): drop #2 with a whoosh per template swap
place(sub_boom(1.2), H["share"], 0.7)
place(crash(), H["share"], 0.6, send=0.5)
groove(22, 26)
bassline(22, 26)
stabs(22, 26, pattern=(0.0, 0.5, 1.5, 2.0, 2.75, 3.5))
for hit, pan in (("tplTicket", 0.5), ("tplTv", -0.5), ("tplPure", 0.4), ("tplDesk", -0.4)):
    place(whoosh(0.28), H[hit] - 0.14, 0.55, pan=pan)
    place(clank(1100), H[hit], 0.18, pan)
place(riser(0.5, 600, 5000), 25.0, 0.55)

# --- Finale (b26): biggest impact, resolve to A minor, glint shimmer, tail
place(kick(1.5), H["finale"], 1.0)
place(sub_boom(2.0), H["finale"], 1.0)
place(crash(2.0), H["finale"], 0.8, send=0.6)
place(clap(), H["finale"], 0.8, send=0.5)
place(supersaw([midi(n) for n in AM[1]] + [midi(81), midi(33)], 2.0, cutoff=5500, decay=0.9), H["finale"], 0.9, send=0.7)
for i, n in enumerate([93, 96, 100, 105]):
    place(bell(midi(n), 1.0), H["glint"] + i * 0.08, 0.35, pan=-0.5 + i * 0.33, send=0.8)
place(downlifter(1.5), 27.0, 0.6, send=0.4)

# ---------------------------------------------------------------- mixing
# Apply sidechain duck to everything except the drums already placed at full level:
# approximate by ducking the reverb send and applying a gentle global pump.
pump = 0.75 + 0.25 * duck
L *= pump
R *= pump


def reverb(x_l, x_r, seconds=1.9):
    t = t_axis(seconds)
    irl = rng.standard_normal(len(t)) * np.exp(-t / 0.55)
    irr = rng.standard_normal(len(t)) * np.exp(-t / 0.55)
    irl, irr = band(irl, 300, 9000), band(irr, 300, 9000)
    n = len(x_l) + len(t)
    nfft = 1 << (n - 1).bit_length()
    yl = np.fft.irfft(np.fft.rfft(x_l, nfft) * np.fft.rfft(irl, nfft), nfft)[: len(x_l)]
    yr = np.fft.irfft(np.fft.rfft(x_r, nfft) * np.fft.rfft(irr, nfft), nfft)[: len(x_r)]
    return yl / np.abs(irl).sum() * 25, yr / np.abs(irr).sum() * 25


rl, rr = reverb(send_L * duck, send_R * duck)
L += rl * 0.5
R += rr * 0.5

# Fade the very end so the loop point on Instagram is clean.
fade = np.ones(N)
fn = int(0.35 * SR)
fade[-fn:] = np.linspace(1, 0, fn) ** 2
L *= fade
R *= fade

mix = np.stack([L, R], axis=1)
mix /= np.max(np.abs(mix))
mix = np.tanh(mix * 1.6) / np.tanh(1.6)  # gentle soft clip / glue
mix *= 0.89  # ~ -1 dBFS peak

out = ROOT / "audio"
out.mkdir(exist_ok=True)
pcm = (mix * 32767).astype("<i2")
with wave.open(str(out / "soundtrack.wav"), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote", out / "soundtrack.wav", f"{N / SR:.2f}s")
