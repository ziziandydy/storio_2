"""Shared synthesis toolkit: numpy-only instruments and a small stereo mixer.

Everything is generated from oscillators and noise; no samples.
"""
import json
import wave
from pathlib import Path

import numpy as np

SR = 44100
rng = np.random.default_rng(11)


def t_axis(sec):
    return np.arange(int(sec * SR)) / SR


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def band(sig, lo=None, hi=None, order=4):
    spec = np.fft.rfft(sig)
    f = np.fft.rfftfreq(len(sig), 1 / SR)
    m = np.ones_like(f)
    if lo:
        m *= 1 / (1 + (lo / np.maximum(f, 1)) ** order)
    if hi:
        m *= 1 / (1 + (f / hi) ** order)
    return np.fft.irfft(spec * m, len(sig))


def noise(sec):
    return rng.standard_normal(int(sec * SR))


def saw(freq, t, cutoff, ph=0.0):
    out = np.zeros_like(t)
    kmax = max(1, int(min(cutoff * 1.6, SR / 2 - 200) // freq))
    for k in range(1, kmax + 1):
        out += np.sin(2 * np.pi * k * freq * t + ph * k) / k / (1 + (k * freq / cutoff) ** 3)
    return out


def sweep_phase(freqs):
    return 2 * np.pi * np.cumsum(freqs) / SR


# ------------------------------------------------------------------ drums
def kick(punch=1.0, length=0.45, tone=44, decay=0.26):
    t = t_axis(length)
    ph = sweep_phase(tone + 120 * punch * np.exp(-t / 0.032))
    body = np.sin(ph) * np.exp(-t / decay)
    click = band(noise(length), 1500, 9000) * np.exp(-t / 0.004) * 0.5
    return np.tanh((body + click) * 1.8) * 0.9


def soft_kick():
    t = t_axis(0.4)
    return np.sin(sweep_phase(48 + 60 * np.exp(-t / 0.04))) * np.exp(-t / 0.2) * 0.8


def clap(tail=0.13):
    t = t_axis(0.4)
    env = sum(np.where(t >= o, np.exp(-(t - o) / 0.012), 0) for o in (0, 0.011, 0.022))
    env = env + np.where(t >= 0.03, np.exp(-(t - 0.03) / tail), 0) * 0.55
    return band(noise(0.4), 900, 3200) * env * 0.9


def snap():
    t = t_axis(0.2)
    return band(noise(0.2), 1800, 7000) * np.exp(-t / 0.035) * 0.9


def hat(open_=False, amp=0.35):
    t = t_axis(0.3 if open_ else 0.08)
    return band(noise(len(t) / SR), 7000) * np.exp(-t / (0.11 if open_ else 0.016)) * amp


def taiko(freq=70):
    t = t_axis(1.4)
    body = np.sin(sweep_phase(freq + 50 * np.exp(-t / 0.05))) * np.exp(-t / 0.45)
    skin = band(noise(1.4), 100, 1200) * np.exp(-t / 0.08) * 0.6
    return np.tanh((body + skin) * 1.4) * 0.9


def tick(freq=4200, length=0.04):
    t = t_axis(length)
    return (np.sin(2 * np.pi * freq * t) * 0.5 + band(noise(length), 3000, 12000) * 0.5) * np.exp(-t / 0.006) * 0.6


def brush(length=0.35):
    t = t_axis(length)
    env = np.minimum(1, t / 0.03) * np.exp(-t / 0.12)
    return band(noise(length), 1500, 9000) * env * 0.25


# ------------------------------------------------------------------ tonal
def sub_boom(length=2.2, f0=38):
    t = t_axis(length)
    return np.tanh(np.sin(sweep_phase(f0 + 30 * np.exp(-t / 0.25))) * np.exp(-t / 0.75) * 1.6) * 0.9


def crash(length=2.4):
    t = t_axis(length)
    return band(noise(length), 3500, 15000) * np.exp(-t / 0.7) * (1 + 0.3 * np.sin(2 * np.pi * 7 * t)) * 0.45


def braam(root_midi, length=2.4):
    """Trailer brass-like low swell: stacked detuned saws, fast swell, heavy saturation."""
    t = t_axis(length)
    out = np.zeros_like(t)
    for n, g in ((root_midi, 1.0), (root_midi + 12, 0.6), (root_midi + 7, 0.45), (root_midi - 12, 0.8)):
        for d in (-0.12, 0.0, 0.11):
            out += saw(midi(n) * 2 ** (d / 12), t, 900 + 1400 * np.exp(-0), rng.uniform(0, 6)) * g
    env = np.minimum(1, t / 0.06) * np.exp(-t / 1.1)
    return np.tanh(out * env * 0.9) * 0.8


def drone(freq, length, bright=600):
    t = t_axis(length)
    base = saw(freq, t, bright) * 0.5 + np.sin(2 * np.pi * freq / 2 * t) * 0.6
    return base * np.minimum(1, t / 0.8) * 0.4


def ostinato_note(freq, length=0.18, cutoff=2400):
    t = t_axis(length)
    return saw(freq, t, cutoff) * np.exp(-t / 0.07) * 0.5


def supersaw(freqs, length, cutoff=3500, decay=None, voices=5, detune=0.12):
    t = t_axis(length)
    out = np.zeros_like(t)
    for f0 in freqs:
        for v in range(voices):
            f = f0 * 2 ** ((v - (voices - 1) / 2) * detune / 24)
            out += saw(f, t, cutoff, rng.uniform(0, 6))
    out /= max(1, len(freqs) * voices)
    env = np.minimum(1, t / 0.004)
    if decay:
        env = env * np.exp(-t / decay)
    return out * env


def felt_piano(freq, length=2.5, vel=1.0):
    """Soft piano: slightly inharmonic partials, felt-dampened hammer, fast high-partial decay."""
    t = t_axis(length)
    out = np.zeros_like(t)
    for k in range(1, 9):
        fk = freq * k * (1 + 0.0004 * k * k)
        out += np.sin(2 * np.pi * fk * t + rng.uniform(0, 6)) * (0.9 / k**1.3) * np.exp(-t / (1.8 / k**0.8))
    hammer = band(noise(length), 200, 2000) * np.exp(-t / 0.012) * 0.05
    att = np.minimum(1, t / 0.006)
    return (out + hammer) * att * 0.35 * vel


def upright(freq, length=0.9):
    t = t_axis(length)
    out = sum(np.sin(2 * np.pi * freq * k * t) / k**1.6 * np.exp(-t / (0.5 / k)) for k in range(1, 6))
    return out * np.minimum(1, t / 0.005) * 0.6


def bell(freq, length=1.4, amp=0.4):
    t = t_axis(length)
    mod = np.sin(2 * np.pi * freq * 3.5 * t) * 1.6 * np.exp(-t / 0.3)
    return np.sin(2 * np.pi * freq * t + mod) * np.exp(-t / 0.55) * amp


def pluck(freq, length=0.4, amp=0.5):
    t = t_axis(length)
    out = sum(np.sin(2 * np.pi * k * freq * t) / k * np.exp(-t / (0.25 / k**0.6)) for k in range(1, 12))
    return out * np.minimum(1, t / 0.002) * amp


def eight08(freq, length=0.6, slide_from=None, drive=2.2):
    t = t_axis(length)
    f = np.full_like(t, freq)
    if slide_from:
        f = freq + (slide_from - freq) * np.exp(-t / 0.06)
    body = np.sin(sweep_phase(f)) * np.exp(-t / (length * 0.55))
    click = np.sin(sweep_phase(freq * 4 * np.exp(-t / 0.01) + freq)) * np.exp(-t / 0.01) * 0.4
    return np.tanh((body + click) * drive) * 0.85


def cowbell(freq=560, length=0.28, amp=0.45):
    t = t_axis(length)
    sq = np.sign(np.sin(2 * np.pi * freq * t)) + np.sign(np.sin(2 * np.pi * freq * 1.48 * t))
    return band(sq, 400, 3500) * np.exp(-t / 0.09) * amp


def vox_stab(freq, length=0.25, vowel='a'):
    """Synthetic vocal-chop: saw through fixed formant peaks."""
    t = t_axis(length)
    src = saw(freq, t, 5000)
    formants = {'a': (800, 1150, 2900), 'o': (450, 800, 2830), 'e': (400, 2000, 2550)}[vowel]
    out = sum(band(src, f * 0.85, f * 1.15, order=6) * g for f, g in zip(formants, (1.0, 0.6, 0.3)))
    return out * np.minimum(1, t / 0.01) * np.exp(-t / 0.12) * 1.6


def riser(length, f0=180, f1=2400, amp=1.0):
    t = t_axis(length)
    x = t / length
    ph = sweep_phase(f0 * (f1 / f0) ** (x**1.6))
    return ((np.sin(ph) + 0.4 * np.sin(2 * ph)) * 0.25 + band(noise(length), 1800, 12000) * 0.5) * x**2.2 * amp


def reverse_swell(length=1.0):
    t = t_axis(length)
    return band(noise(length), 800, 9000) * (t / length) ** 3 * 0.6


def whoosh(length=0.45, lo=800, hi=7000):
    t = t_axis(length)
    return band(noise(length), lo, hi) * np.sin(np.pi * np.clip(t / length, 0, 1)) ** 2 * 0.6


def downlifter(length=1.8):
    t = t_axis(length)
    return np.sin(sweep_phase(900 * 0.12 ** (t / length))) * np.exp(-t / 0.7) * 0.25 + band(noise(length), 500, 5000) * np.exp(-t / 0.5) * 0.2


def vinyl(length):
    n = int(length * SR)
    hiss = band(rng.standard_normal(n), 2000, 9000) * 0.012
    pops = np.zeros(n)
    idx = rng.integers(0, n, int(length * 18))
    pops[idx] = rng.uniform(0.05, 0.25, len(idx)) * rng.choice([-1, 1], len(idx))
    return hiss + band(pops, 800, 7000)


def page_turn(length=0.6):
    t = t_axis(length)
    env = np.sin(np.pi * np.clip(t / length, 0, 1)) ** 1.5
    flutter = 1 + 0.5 * np.sin(2 * np.pi * 26 * t)
    return band(noise(length), 1200, 8000) * env * flutter * 0.28


# ------------------------------------------------------------------ mixer
class Mix:
    def __init__(self, duration, bpm):
        self.n = int(duration * SR)
        self.beat = 60.0 / bpm
        self.L, self.R = np.zeros(self.n), np.zeros(self.n)
        self.sL, self.sR = np.zeros(self.n), np.zeros(self.n)
        self.duck = np.ones(self.n)

    def s(self, beat):
        return beat * self.beat

    def place(self, sig, beat, gain=1.0, pan=0.0, send=0.0):
        st = int(round(self.s(beat) * SR))
        if st >= self.n or st < 0:
            return
        sig = sig[: self.n - st] * gain
        gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        self.L[st:st + len(sig)] += sig * gl
        self.R[st:st + len(sig)] += sig * gr
        if send:
            self.sL[st:st + len(sig)] += sig * gl * send
            self.sR[st:st + len(sig)] += sig * gr * send

    def sidechain(self, beat, depth=0.75, rel=0.22):
        s = int(self.s(beat) * SR)
        e = min(self.n, s + int(rel * SR))
        if s < self.n:
            self.duck[s:e] = np.minimum(self.duck[s:e], (1 - depth) + depth * np.linspace(0, 1, e - s) ** 1.5)

    def render(self, out_path, reverb_sec=1.9, reverb_decay=0.55, wet=0.5, pump=0.25, fade=0.35, drive=1.6, peak=0.89, gates=None):
        t = t_axis(reverb_sec)
        irl = band(rng.standard_normal(len(t)) * np.exp(-t / reverb_decay), 300, 9000)
        irr = band(rng.standard_normal(len(t)) * np.exp(-t / reverb_decay), 300, 9000)
        nfft = 1 << (self.n + len(t) - 1).bit_length()
        rl = np.fft.irfft(np.fft.rfft(self.sL * self.duck, nfft) * np.fft.rfft(irl, nfft), nfft)[: self.n] / np.abs(irl).sum() * 25
        rr = np.fft.irfft(np.fft.rfft(self.sR * self.duck, nfft) * np.fft.rfft(irr, nfft), nfft)[: self.n] / np.abs(irr).sum() * 25
        g = (1 - pump) + pump * self.duck
        for a, b in gates or []:
            # silence the reverb return in [a, b] (8ms ramps). Callers zero the dry bus themselves,
            # so anything placed dry inside the gap (e.g. a reverse swell) still plays. Trailer "dead air".
            ia, ib, rp = int(a * SR), int(b * SR), int(0.008 * SR)
            gm = np.ones(self.n)
            gm[ia:ib] = 0
            gm[max(0, ia - rp):ia] = np.linspace(1, 0, ia - max(0, ia - rp))
            gm[ib:ib + rp] = np.linspace(0, 1, len(gm[ib:ib + rp]))
            rl, rr = rl * gm, rr * gm
        L = self.L * g + rl * wet
        R = self.R * g + rr * wet
        if fade:
            fn = int(fade * SR)
            f = np.ones(self.n)
            f[-fn:] = np.linspace(1, 0, fn) ** 2
            L, R = L * f, R * f
        mix = np.stack([L, R], axis=1)
        mix /= np.max(np.abs(mix))
        mix = np.tanh(mix * drive) / np.tanh(drive) * peak
        Path(out_path).parent.mkdir(parents=True, exist_ok=True)
        with wave.open(str(out_path), 'wb') as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((mix * 32767).astype('<i2').tobytes())
        print('wrote', out_path)


def load_timing(variant_dir):
    return json.loads((Path(variant_dir) / 'timing.json').read_text())
