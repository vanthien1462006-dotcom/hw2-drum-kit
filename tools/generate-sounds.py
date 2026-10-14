"""Generate the synthesized drum samples into ../sounds (standard library only)."""

import math
import random
import struct
import wave
from pathlib import Path

SAMPLE_RATE = 44100
SEED = 20240601
PEAK = 0.9
FADE_IN_SECONDS = 0.002
FADE_OUT_SECONDS = 0.01
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "sounds"


def noise(rng, count):
    return [rng.uniform(-1.0, 1.0) for _ in range(count)]


def highpass(samples):
    """First-difference filter: boosts high frequencies."""
    return [samples[0]] + [samples[i] - samples[i - 1] for i in range(1, len(samples))]


def exp_decay(count, tau):
    return [math.exp(-(i / SAMPLE_RATE) / tau) for i in range(count)]


def sweep_sine(count, start_hz, end_hz, sweep_tau):
    """Sine whose frequency falls exponentially from start_hz to end_hz."""
    out = []
    phase = 0.0
    for i in range(count):
        t = i / SAMPLE_RATE
        freq = end_hz + (start_hz - end_hz) * math.exp(-t / sweep_tau)
        phase += 2 * math.pi * freq / SAMPLE_RATE
        out.append(math.sin(phase))
    return out


def finalize(samples):
    """Apply edge fades, then normalize so the peak is exactly PEAK."""
    count = len(samples)
    fade_in = int(FADE_IN_SECONDS * SAMPLE_RATE)
    fade_out = int(FADE_OUT_SECONDS * SAMPLE_RATE)
    shaped = list(samples)
    for i in range(min(fade_in, count)):
        shaped[i] *= i / fade_in
    for i in range(min(fade_out, count)):
        shaped[count - 1 - i] *= i / fade_out
    peak = max(abs(s) for s in shaped)
    return [s * PEAK / peak for s in shaped]


def kick(rng):
    count = int(0.5 * SAMPLE_RATE)
    body = sweep_sine(count, 150, 45, 0.04)
    env = exp_decay(count, 0.12)
    return [b * e for b, e in zip(body, env)]


def snare(rng):
    count = int(0.25 * SAMPLE_RATE)
    hiss = noise(rng, count)
    tone = sweep_sine(count, 190, 180, 1.0)
    env = exp_decay(count, 0.05)
    return [(0.7 * h + 0.5 * t) * e for h, t, e in zip(hiss, tone, env)]


def hihat(rng):
    count = int(0.08 * SAMPLE_RATE)
    hiss = highpass(noise(rng, count))
    env = exp_decay(count, 0.015)
    return [h * e for h, e in zip(hiss, env)]


def openhat(rng):
    count = int(0.35 * SAMPLE_RATE)
    hiss = highpass(noise(rng, count))
    env = exp_decay(count, 0.09)
    return [h * e for h, e in zip(hiss, env)]


def clap(rng):
    count = int(0.3 * SAMPLE_RATE)
    hiss = highpass(noise(rng, count))
    burst_len = int(0.008 * SAMPLE_RATE)
    gap = int(0.015 * SAMPLE_RATE)
    env = [0.0] * count
    for burst in range(3):
        start = burst * gap
        for i in range(burst_len):
            env[start + i] = math.exp(-i / (burst_len / 3))
    tail_start = 3 * gap
    for i in range(count - tail_start):
        env[tail_start + i] = 0.6 * math.exp(-(i / SAMPLE_RATE) / 0.06)
    return [h * e for h, e in zip(hiss, env)]


def tom(start_hz, end_hz):
    def build(rng):
        count = int(0.4 * SAMPLE_RATE)
        body = sweep_sine(count, start_hz, end_hz, 0.08)
        env = exp_decay(count, 0.12)
        return [b * e for b, e in zip(body, env)]

    return build


def crash(rng):
    count = int(1.2 * SAMPLE_RATE)
    hiss = highpass(noise(rng, count))
    env = exp_decay(count, 0.3)
    return [h * e for h, e in zip(hiss, env)]


SOUNDS = {
    "kick": kick,
    "snare": snare,
    "hihat": hihat,
    "openhat": openhat,
    "clap": clap,
    "tom-high": tom(200, 120),
    "tom-low": tom(130, 80),
    "crash": crash,
}


def write_wav(path, samples):
    frames = b"".join(struct.pack("<h", round(s * 32767)) for s in samples)
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(frames)


def main():
    OUTPUT_DIR.mkdir(exist_ok=True)
    for name, build in SOUNDS.items():
        rng = random.Random(SEED)
        samples = finalize(build(rng))
        path = OUTPUT_DIR / f"{name}.wav"
        write_wav(path, samples)
        seconds = len(samples) / SAMPLE_RATE
        print(f"{path.name}: {seconds:.2f} s, {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
