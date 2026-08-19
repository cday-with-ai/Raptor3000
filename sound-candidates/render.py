#!/usr/bin/env python3
"""Render original chess palettes for the raptor3000 picker.

Physical, short, no tunes. Each set is a material, not a melody.
Deterministic: same seed always writes the same files.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44100
ROOT = Path(__file__).resolve().parent


def _sos(kind: str, cutoff, order: int = 3):
    return butter(order, cutoff, btype=kind, fs=SR, output="sos")


def lp(x: np.ndarray, hz: float, order: int = 3) -> np.ndarray:
    return sosfilt(_sos("low", hz, order), x)


def hp(x: np.ndarray, hz: float, order: int = 2) -> np.ndarray:
    return sosfilt(_sos("high", hz, order), x)


def bp(x: np.ndarray, lo: float, hi: float, order: int = 3) -> np.ndarray:
    return sosfilt(_sos("band", [lo, hi], order), x)


def fade(x: np.ndarray, in_ms: float = 0.4, out_ms: float = 8.0) -> np.ndarray:
    n = len(x)
    inn = max(1, int(SR * in_ms / 1000))
    outn = max(1, int(SR * out_ms / 1000))
    y = x.copy()
    y[:inn] *= np.linspace(0, 1, inn)
    y[-outn:] *= np.linspace(1, 0, outn)
    return y


def exp_env(n: int, attack_ms: float, decay_ms: float) -> np.ndarray:
    att = max(1, int(SR * attack_ms / 1000))
    t = np.arange(max(1, n - att)) / SR
    # ~3 time-constants over decay_ms
    dec = np.exp(-t * (3000.0 / max(decay_ms, 1.0)))
    a = np.linspace(0.0, 1.0, att)
    return np.concatenate([a, dec])[:n]


def noise(rng: np.random.Generator, n: int) -> np.ndarray:
    return rng.standard_normal(n).astype(np.float64)


def modal(
    n: int,
    partials: list[tuple[float, float, float]],
    pitch_drop: float = 0.0,
) -> np.ndarray:
    """Sum decaying sines. pitch_drop is octaves fallen over the note."""
    t = np.arange(n) / SR
    y = np.zeros(n, dtype=np.float64)
    for freq, amp, decay in partials:
        if pitch_drop:
            inst = freq * (2.0 ** (-pitch_drop * (t / max(t[-1], 1e-9))))
            phase = 2 * np.pi * np.cumsum(inst) / SR
            y += amp * np.sin(phase) * np.exp(-decay * t)
        else:
            y += amp * np.sin(2 * np.pi * freq * t) * np.exp(-decay * t)
    return y


def impact(rng: np.random.Generator, n: int, hardness: float, amp: float) -> np.ndarray:
    """Short band-limited click. hardness 0 = felt, 1 = stone."""
    click_ms = 1.2 + 4.5 * (1.0 - 0.55 * hardness)
    env = exp_env(n, 0.25, click_ms)
    lo = 700 + 2400 * hardness
    hi = min(14000, 3800 + 9000 * hardness)
    return bp(noise(rng, n), lo, hi) * env * amp


def thud(
    rng: np.random.Generator,
    n: int,
    lo: float,
    hi: float,
    amp: float,
    decay_ms: float,
) -> np.ndarray:
    """The meat of a piece landing — shaped noise, not a note."""
    return bp(noise(rng, n), lo, hi) * exp_env(n, 0.9, decay_ms) * amp


def scrape(rng: np.random.Generator, n: int, amp: float) -> np.ndarray:
    env = exp_env(n, 1.5, 18)
    return bp(noise(rng, n), 1400, 4200) * env * amp


def whoomph(n: int, start_hz: float, end_hz: float, amp: float, decay_ms: float) -> np.ndarray:
    t = np.arange(n) / SR
    inst = np.linspace(start_hz, end_hz, n)
    phase = 2 * np.pi * np.cumsum(inst) / SR
    return np.sin(phase) * exp_env(n, 1.2, decay_ms) * amp


def mix(*layers: np.ndarray) -> np.ndarray:
    n = max(len(x) for x in layers)
    y = np.zeros(n, dtype=np.float64)
    for x in layers:
        y[: len(x)] += x
    return y


def place(layer: np.ndarray, at_ms: float, total_ms: float) -> np.ndarray:
    total = int(SR * total_ms / 1000)
    off = int(SR * at_ms / 1000)
    y = np.zeros(total, dtype=np.float64)
    end = min(total, off + len(layer))
    y[off:end] += layer[: end - off]
    return y


#: What every sound is normalised to, as mean |sample| in dBFS. Picked as
#: felt's level, because that is the palette Carson has been listening to
#: for a week without asking for it louder or quieter.
TARGET_DBFS = -24.0
#: The `weight` argument is relative to this, so weight=0.5 lands exactly on
#: TARGET_DBFS and the per-event weights keep their intended pecking order.
REF_WEIGHT = 0.5
#: Nothing is allowed past this sample value.
CEILING = 0.94


def _rms_dbfs(y: np.ndarray) -> float:
    """RMS in dBFS — the same statistic ffmpeg's `volumedetect` reports as
    `mean_volume`, so what this targets is what a measurement of the
    shipped mp3 reads back. Normalising mean |sample| instead lands 6-7 dB
    off, because the two differ by the crest factor and these sounds are
    all transient."""
    m = float(np.sqrt(np.mean(np.square(y))))
    return -120.0 if m < 1e-9 else 20.0 * np.log10(m)


def finalize(x: np.ndarray, weight: float) -> np.ndarray:
    """Level a rendered sound to a loudness target, not to a peak.

    This used to normalise to peak, and that is why switching palettes
    sounded like the audio breaking: peak height says nothing about how
    loud a sound *is*. Marble is a hard transient over a quiet tail and
    felt is a soft thud with a fat body, so at the same peak marble
    measured 8.4 dB quieter — and across every set that shipped, the
    spread was 20.7 dB (2026-08-19). A sound set is not a volume control.

    So: normalise mean level, then bring the peak back under the ceiling
    with soft saturation rather than a hard clip (which would strip the
    transient that makes a click a click), and re-level. Two passes is
    enough — the second correction is under a tenth of a dB in practice.
    """
    y = fade(hp(x, 40, order=1))
    if float(np.mean(np.abs(y))) < 1e-9:
        return y.astype(np.float32)

    target = TARGET_DBFS + 20.0 * np.log10(max(weight, 1e-6) / REF_WEIGHT)
    # Level, then tame the peak, then level again. Each tanh pass lowers the
    # crest factor, so the loop converges on "at the target and under the
    # ceiling" instead of the limiter permanently stealing back the gain —
    # which is what left the peakiest palettes (marble, study) 3.5 dB shy on
    # the first attempt.
    for _ in range(4):
        y = y * 10.0 ** ((target - _rms_dbfs(y)) / 20.0)
        m = float(np.max(np.abs(y)))
        if m > CEILING:
            y = np.tanh(y * (np.arctanh(CEILING) / m))

    # 4ms of silence so mp3 encoders don't eat the transient
    pad = int(SR * 0.004)
    y = np.concatenate([np.zeros(pad), y, np.zeros(int(SR * 0.02))])
    return np.clip(y, -CEILING, CEILING).astype(np.float32)


#: The four sounds that play under the game-end animation, and how long
#: that animation actually runs (endShows.ts, 2026-08-19):
#:
#:   winner king pump   1.1s x 2  = 2.2s
#:   whole-team pump    0.7s x 3  = 2.1s
#:   mater spin         1.3s x 2  = 2.6s
#:   loser topple       0.9s
#:   loser vaporize     0.6s
#:
#: The verdicts rendered at 0.21-0.42s, so the sound was over before the
#: show was a fifth done and the ending landed silent. Rather than redraw
#: 24 hand-tuned sounds, each verdict is put in a room: the same hit,
#: convolved with a decaying impulse response. The attack is untouched —
#: what arrives is the tail it was always missing.
VERDICTS = {"Victory", "Defeat", "Draw", "Explosion"}

#: Per palette: (decay ms, wet). A material that damps in the hand damps in
#: the room too — felt is a cloth-covered board in a carpeted study, marble
#: and slate are stone on stone in something with hard walls.
ROOMS = {
    "felt":   (900, 0.30),
    "walnut": (1150, 0.38),
    "marble": (1600, 0.52),
    "clock":  (1000, 0.34),
    "study":  (850, 0.28),
    "slate":  (1450, 0.48),
}


def room_ir(rng: np.random.Generator, decay_ms: float) -> np.ndarray:
    """A synthetic impulse response: filtered noise under an exponential.

    Not a real room — a plausible one. The early part is left sparse so the
    onset does not smear into a wash, and the top is rolled off because a
    tail that keeps all its treble reads as hiss rather than as space.
    """
    n = ms(decay_ms)
    t = np.arange(n) / SR
    env = np.exp(-t * (6.0 / (decay_ms / 1000.0)))
    ir = noise(rng, n) * env
    # sparse early reflections so the attack keeps its edge
    ir[: ms(8)] *= np.linspace(0.0, 1.0, ms(8))
    ir = lp(ir, 3200, order=2)
    ir[0] += 1.0
    m = float(np.max(np.abs(ir)))
    return ir / m if m > 1e-9 else ir


def put_in_room(rng: np.random.Generator, x: np.ndarray, decay_ms: float,
                wet: float) -> np.ndarray:
    """Convolve, then re-level on the ATTACK rather than on the whole file.

    Levelling the reverbed buffer as a whole would measure the long quiet
    tail as part of the signal and push the hit up to compensate, so the
    ending would arrive louder than every other sound in the set. Matching
    the first 250ms to what it was keeps the hit exactly where the palette
    put it and adds the room underneath.
    """
    head = ms(250)
    before = float(np.sqrt(np.mean(np.square(x[:head]))))
    wet_sig = fftconvolve(x, room_ir(rng, decay_ms))[: len(x) + ms(decay_ms)]
    y = np.zeros(len(wet_sig))
    y[: len(x)] += x * (1.0 - wet * 0.35)
    y += wet_sig * wet
    after = float(np.sqrt(np.mean(np.square(y[:head]))))
    if after > 1e-9:
        y = y * (before / after)
    m = float(np.max(np.abs(y)))
    if m > CEILING:
        y = np.tanh(y * (np.arctanh(CEILING) / m))
    return np.clip(y, -CEILING, CEILING).astype(np.float32)


def write_wav(path: Path, x: np.ndarray) -> None:
    import wave

    pcm = (x * 32767.0).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def ms(n_ms: float) -> int:
    return int(SR * n_ms / 1000)


# ---------------------------------------------------------------------------
# Palettes. Each one is a material: same physics, different event weights.
# ---------------------------------------------------------------------------

def felt(rng: np.random.Generator, kind: str) -> np.ndarray:
    """Wood piece on tournament cloth. Soft thud, almost no ring."""

    def tap(hard: float, body: float, low: float, nms: float, peak_body: float = 1.0) -> np.ndarray:
        n = ms(nms)
        return mix(
            impact(rng, n, hard, 0.18 + 0.12 * hard),
            thud(rng, n, 90, 520, 0.7 * body * peak_body, 42),
            # seasoning only — damped hard so it never sings
            modal(
                n,
                [
                    (173, 0.12 * peak_body, 48),
                    (307, 0.06 * peak_body, 62),
                    (451, 0.03 * peak_body, 80),
                ],
            )
            * body,
            whoomph(n, 130, 78, low, 55),
        )

    if kind == "Move":
        return finalize(lp(tap(0.22, 0.55, 0.22, 160), 2400), 0.42)
    if kind == "Capture":
        a = place(tap(0.38, 0.7, 0.28, 140, 1.05), 0, 260)
        b = place(tap(0.32, 0.55, 0.18, 130, 0.85), 16, 260)
        s = place(scrape(rng, ms(28), 0.12), 8, 260)
        return finalize(lp(mix(a, b, s), 2800), 0.52)
    if kind == "Check":
        a = place(tap(0.3, 0.6, 0.2, 140), 0, 240)
        b = place(tap(0.45, 0.35, 0.08, 90, 0.7), 28, 240)
        return finalize(lp(mix(a, b), 3200), 0.5)
    if kind == "GenericNotify":
        a = place(tap(0.2, 0.5, 0.18, 130), 0, 280)
        b = place(tap(0.24, 0.55, 0.2, 150), 90, 280)
        return finalize(lp(mix(a, b), 2200), 0.4)
    if kind == "Victory":
        a = place(tap(0.28, 0.7, 0.26, 160, 1.1), 0, 360)
        b = place(tap(0.32, 0.75, 0.28, 180, 1.15), 110, 360)
        return finalize(lp(mix(a, b), 2000), 0.55)
    if kind == "Defeat":
        return finalize(lp(tap(0.18, 0.85, 0.38, 280, 1.2), 1600), 0.5)
    if kind == "Draw":
        a = place(tap(0.22, 0.5, 0.16, 140), 0, 300)
        b = place(tap(0.22, 0.5, 0.16, 140), 120, 300)
        return finalize(lp(mix(a, b), 2000), 0.42)
    if kind == "Explosion":
        n = ms(320)
        body = mix(
            whoomph(n, 90, 48, 0.7, 140),
            tap(0.4, 0.9, 0.45, 320, 1.3),
            impact(rng, n, 0.35, 0.22),
        )
        return finalize(lp(body, 1400), 0.62)
    raise KeyError(kind)


def walnut(rng: np.random.Generator, kind: str) -> np.ndarray:
    """Dry wood on a wooden table. Harder, shorter, more click than felt."""

    def tap(hard: float, nms: float, body: float = 1.0) -> np.ndarray:
        n = ms(nms)
        return mix(
            impact(rng, n, hard, 0.32 + 0.2 * hard),
            thud(rng, n, 180, 900, 0.55 * body, 28),
            modal(
                n,
                [
                    (263, 0.1 * body, 55),
                    (417, 0.06 * body, 70),
                    (703, 0.03 * body, 90),
                ],
            ),
        )

    if kind == "Move":
        return finalize(lp(tap(0.48, 110), 5200), 0.44)
    if kind == "Capture":
        a = place(tap(0.62, 120, 1.1), 0, 220)
        b = place(tap(0.5, 100, 0.8), 14, 220)
        return finalize(lp(mix(a, b), 5600), 0.54)
    if kind == "Check":
        a = place(tap(0.55, 110), 0, 200)
        b = place(tap(0.7, 70, 0.55), 22, 200)
        return finalize(lp(mix(a, b), 6400), 0.5)
    if kind == "GenericNotify":
        a = place(tap(0.42, 100, 0.9), 0, 240)
        b = place(tap(0.46, 110, 1.0), 78, 240)
        return finalize(lp(mix(a, b), 4800), 0.42)
    if kind == "Victory":
        a = place(tap(0.5, 120, 1.05), 0, 300)
        b = place(tap(0.55, 140, 1.15), 95, 300)
        return finalize(lp(mix(a, b), 4400), 0.56)
    if kind == "Defeat":
        return finalize(lp(tap(0.35, 220, 1.25), 2800), 0.5)
    if kind == "Draw":
        a = place(tap(0.44, 110), 0, 260)
        b = place(tap(0.44, 110), 105, 260)
        return finalize(lp(mix(a, b), 4000), 0.44)
    if kind == "Explosion":
        n = ms(280)
        return finalize(
            lp(mix(tap(0.7, 280, 1.4), whoomph(n, 110, 55, 0.45, 110)), 2200),
            0.64,
        )
    raise KeyError(kind)


def marble(rng: np.random.Generator, kind: str) -> np.ndarray:
    """Cool stone. Bright short click, almost no body, dies immediately."""

    def tap(hard: float, nms: float, body: float = 1.0) -> np.ndarray:
        n = ms(nms)
        return mix(
            impact(rng, n, 0.72 + 0.25 * hard, 0.55),
            thud(rng, n, 600, 2800, 0.22 * body, 14),
            modal(
                n,
                [
                    (1130, 0.06 * body, 90),
                    (1870, 0.04 * body, 120),
                    (2710, 0.02 * body, 160),
                ],
                pitch_drop=0.06,
            ),
        )

    if kind == "Move":
        return finalize(hp(tap(0.35, 70), 280), 0.4)
    if kind == "Capture":
        a = place(tap(0.55, 80, 1.15), 0, 170)
        b = place(tap(0.4, 60, 0.7), 11, 170)
        return finalize(hp(mix(a, b), 240), 0.5)
    if kind == "Check":
        a = place(tap(0.45, 70), 0, 160)
        b = place(tap(0.7, 45, 0.6), 18, 160)
        return finalize(hp(mix(a, b), 300), 0.48)
    if kind == "GenericNotify":
        a = place(tap(0.3, 65, 0.85), 0, 200)
        b = place(tap(0.35, 70, 0.95), 70, 200)
        return finalize(hp(mix(a, b), 260), 0.38)
    if kind == "Victory":
        a = place(tap(0.4, 75, 1.05), 0, 250)
        b = place(tap(0.48, 85, 1.15), 88, 250)
        return finalize(hp(mix(a, b), 240), 0.5)
    if kind == "Defeat":
        # darker stone set-down — still stone, just heavier
        n = ms(180)
        y = mix(tap(0.25, 180, 1.2), whoomph(n, 220, 140, 0.12, 80))
        return finalize(lp(y, 4200), 0.46)
    if kind == "Draw":
        a = place(tap(0.32, 70), 0, 210)
        b = place(tap(0.32, 70), 92, 210)
        return finalize(hp(mix(a, b), 260), 0.4)
    if kind == "Explosion":
        n = ms(240)
        return finalize(
            mix(tap(0.85, 240, 1.3), whoomph(n, 160, 70, 0.28, 90)),
            0.58,
        )
    raise KeyError(kind)


def clock(rng: np.random.Generator, kind: str) -> np.ndarray:
    """Analog chess-clock plunger. Plastic click, bakelite body, no chime."""

    def press(firm: float, nms: float) -> np.ndarray:
        n = ms(nms)
        click = impact(rng, n, 0.55 + 0.25 * firm, 0.4 + 0.2 * firm)
        # second, quieter click a few ms later — the leaf switch
        leaf = place(impact(rng, ms(40), 0.4, 0.12 + 0.08 * firm), 4, nms)
        body = mix(
            thud(rng, n, 220, 780, 0.35 + 0.1 * firm, 22),
            modal(
                n,
                [
                    (337, 0.08 + 0.04 * firm, 58),
                    (511, 0.04, 74),
                ],
                pitch_drop=0.1 * firm,
            ),
        )
        return mix(click, leaf, body)

    if kind == "Move":
        return finalize(lp(press(0.35, 90), 4600), 0.4)
    if kind == "Capture":
        return finalize(lp(press(0.7, 110), 5000), 0.52)
    if kind == "Check":
        a = place(press(0.55, 80), 0, 170)
        b = place(press(0.4, 55), 28, 170)
        return finalize(lp(mix(a, b), 5400), 0.48)
    if kind == "GenericNotify":
        # starting both clocks — two even presses
        a = place(press(0.4, 85), 0, 230)
        b = place(press(0.4, 85), 85, 230)
        return finalize(lp(mix(a, b), 4400), 0.4)
    if kind == "Victory":
        return finalize(lp(press(0.85, 150), 3800), 0.56)
    if kind == "Defeat":
        # muffled stop — hand staying on the plunger
        n = ms(200)
        y = mix(press(0.25, 200), whoomph(n, 180, 90, 0.16, 90))
        return finalize(lp(y, 2200), 0.46)
    if kind == "Draw":
        a = place(press(0.4, 90), 0, 240)
        b = place(press(0.4, 90), 100, 240)
        return finalize(lp(mix(a, b), 4000), 0.42)
    if kind == "Explosion":
        return finalize(lp(press(1.0, 220), 2400), 0.62)
    raise KeyError(kind)


def study(rng: np.random.Generator, kind: str) -> np.ndarray:
    """Late-night library. Leather and paper. Almost nothing."""

    def hush(nms: float, weight: float) -> np.ndarray:
        n = ms(nms)
        return mix(
            lp(impact(rng, n, 0.12, 0.1 + 0.08 * weight), 1800),
            thud(rng, n, 70, 380, 0.55 * weight, 38),
            modal(
                n,
                [
                    (147, 0.1 * weight, 40),
                    (239, 0.05 * weight, 55),
                ],
            ),
            whoomph(n, 110, 70, 0.16 * weight, 50),
        )

    if kind == "Move":
        return finalize(lp(hush(120, 0.7), 1400), 0.32)
    if kind == "Capture":
        a = place(hush(110, 0.9), 0, 210)
        b = place(hush(100, 0.65), 18, 210)
        return finalize(lp(mix(a, b), 1600), 0.4)
    if kind == "Check":
        a = place(hush(110, 0.75), 0, 190)
        # tighter, not brighter — a firmer press, not a ping
        b = place(hush(70, 0.55), 24, 190)
        return finalize(lp(mix(a, b), 1800), 0.38)
    if kind == "GenericNotify":
        a = place(hush(100, 0.6), 0, 240)
        b = place(hush(110, 0.65), 95, 240)
        return finalize(lp(mix(a, b), 1400), 0.3)
    if kind == "Victory":
        a = place(hush(130, 0.85), 0, 300)
        b = place(hush(140, 0.95), 115, 300)
        return finalize(lp(mix(a, b), 1300), 0.42)
    if kind == "Defeat":
        return finalize(lp(hush(240, 1.1), 1100), 0.4)
    if kind == "Draw":
        a = place(hush(110, 0.65), 0, 260)
        b = place(hush(110, 0.65), 120, 260)
        return finalize(lp(mix(a, b), 1300), 0.32)
    if kind == "Explosion":
        return finalize(lp(hush(280, 1.35), 900), 0.5)
    raise KeyError(kind)


def slate(rng: np.random.Generator, kind: str) -> np.ndarray:
    """Dense dark stone. Heavier than marble, no sparkle."""

    def tap(weight: float, nms: float) -> np.ndarray:
        n = ms(nms)
        return mix(
            impact(rng, n, 0.4, 0.22 + 0.1 * weight),
            thud(rng, n, 70, 420, 0.7 * weight, 36),
            modal(
                n,
                [
                    (139, 0.14 * weight, 42),
                    (227, 0.07 * weight, 56),
                    (371, 0.03 * weight, 74),
                ],
            ),
            whoomph(n, 100, 58, 0.2 * weight, 60),
        )

    if kind == "Move":
        return finalize(lp(tap(0.85, 140), 1800), 0.44)
    if kind == "Capture":
        a = place(tap(1.05, 150), 0, 250)
        b = place(tap(0.75, 120), 18, 250)
        return finalize(lp(mix(a, b), 2000), 0.54)
    if kind == "Check":
        a = place(tap(0.9, 130), 0, 220)
        b = place(tap(0.7, 80), 26, 220)
        return finalize(lp(mix(a, b), 2200), 0.5)
    if kind == "GenericNotify":
        a = place(tap(0.75, 120), 0, 260)
        b = place(tap(0.8, 130), 88, 260)
        return finalize(lp(mix(a, b), 1700), 0.4)
    if kind == "Victory":
        a = place(tap(1.0, 150), 0, 340)
        b = place(tap(1.1, 170), 108, 340)
        return finalize(lp(mix(a, b), 1600), 0.56)
    if kind == "Defeat":
        return finalize(lp(tap(1.25, 260), 1300), 0.5)
    if kind == "Draw":
        a = place(tap(0.8, 130), 0, 280)
        b = place(tap(0.8, 130), 118, 280)
        return finalize(lp(mix(a, b), 1600), 0.42)
    if kind == "Explosion":
        return finalize(lp(tap(1.45, 300), 1100), 0.64)
    raise KeyError(kind)


SETS = {
    "felt": {
        "label": "Felt",
        "blurb": "Wood on tournament cloth. Soft thud, almost no ring.",
        "fn": felt,
        "seed": 1101,
    },
    "walnut": {
        "label": "Walnut",
        "blurb": "Dry wood on a wooden table. A real home-set tap.",
        "fn": walnut,
        "seed": 2202,
    },
    "marble": {
        "label": "Marble",
        "blurb": "Cool stone. Short bright click, dies immediately.",
        "fn": marble,
        "seed": 3303,
    },
    "clock": {
        "label": "Clock",
        "blurb": "Analog plunger. Plastic click, bakelite body, no chime.",
        "fn": clock,
        "seed": 4404,
    },
    "study": {
        "label": "Study",
        "blurb": "Late night. Leather and paper. Almost nothing.",
        "fn": study,
        "seed": 5505,
    },
    "slate": {
        "label": "Slate",
        "blurb": "Dense dark stone. Heavier than marble, no sparkle.",
        "fn": slate,
        "seed": 6606,
    },
}

EVENTS = [
    "Move",
    "Capture",
    "Check",
    "GenericNotify",
    "Victory",
    "Defeat",
    "Draw",
    "Explosion",
]


def encode_mp3(wav: Path, mp3: Path) -> None:
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(wav),
            "-codec:a",
            "libmp3lame",
            "-qscale:a",
            "4",
            str(mp3),
        ],
        check=True,
    )


def rms(x: np.ndarray) -> float:
    return float(np.sqrt(np.mean(np.square(x))))


def main() -> int:
    catalog = []
    print(f"{'set':8} {'event':16} {'ms':>6} {'peak':>6} {'rms':>6}")
    for sid, meta in SETS.items():
        dest = ROOT / sid
        dest.mkdir(parents=True, exist_ok=True)
        rng = np.random.default_rng(meta["seed"])
        for ev in EVENTS:
            audio = meta["fn"](rng, ev)
            if ev in VERDICTS:
                decay_ms, wet = ROOMS[sid]
                audio = put_in_room(rng, audio, decay_ms, wet)
            wav = dest / f"{ev}.wav"
            mp3 = dest / f"{ev}.mp3"
            write_wav(wav, audio)
            encode_mp3(wav, mp3)
            dur = 1000.0 * len(audio) / SR
            print(f"{sid:8} {ev:16} {dur:6.0f} {np.max(np.abs(audio)):6.3f} {rms(audio):6.3f}")
        catalog.append(
            {
                "id": sid,
                "label": meta["label"],
                "blurb": meta["blurb"],
            }
        )
    print(f"\nwrote {len(SETS)} sets × {len(EVENTS)} events under {ROOT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
