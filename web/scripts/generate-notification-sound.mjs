/**
 * Generates `public/sounds/new-order.wav` — the admin "new order" chime.
 *
 * Written by hand from raw PCM rather than downloading an asset so the file is
 * auditable, licence-free and reproducible: run
 *
 *     node scripts/generate-notification-sound.mjs
 *
 * to regenerate it byte-for-byte.
 *
 * The sound is a two-tone chime — A5 (880 Hz) then E6 (1320 Hz), a perfect
 * fifth, which reads as "pleasant ping" rather than "alarm". Each tone gets a
 * short attack and an exponential decay; without the attack ramp the waveform
 * starts at a non-zero sample and the speaker cone snaps, which is audible as a
 * click. A quiet second harmonic is mixed in to stop it sounding like a test
 * tone.
 *
 * 44.1 kHz / 16-bit / mono / 0.5 s ≈ 43 KB.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLE_RATE = 44_100;
const DURATION = 0.5;
const PEAK = 0.32; // headroom — a notification should never be the loudest thing on the desktop

/** @type {{ freq: number; start: number; length: number }[]} */
const TONES = [
  { freq: 880, start: 0.0, length: 0.26 },
  { freq: 1320, start: 0.16, length: 0.34 },
];

const frameCount = Math.round(SAMPLE_RATE * DURATION);
const samples = new Float32Array(frameCount);

for (const tone of TONES) {
  const startFrame = Math.round(tone.start * SAMPLE_RATE);
  const toneFrames = Math.round(tone.length * SAMPLE_RATE);
  const attackFrames = Math.round(0.006 * SAMPLE_RATE); // ~6 ms ramp-in kills the click

  for (let i = 0; i < toneFrames; i += 1) {
    const frame = startFrame + i;
    if (frame >= frameCount) break;

    const t = i / SAMPLE_RATE;
    const attack = Math.min(1, i / attackFrames);
    const decay = Math.exp(-4.2 * (i / toneFrames));
    const envelope = attack * decay;

    const fundamental = Math.sin(2 * Math.PI * tone.freq * t);
    const harmonic = 0.18 * Math.sin(4 * Math.PI * tone.freq * t);

    samples[frame] += envelope * (fundamental + harmonic);
  }
}

// Normalise to the target peak so mixing the two overlapping tones can never clip.
let loudest = 0;
for (const sample of samples) loudest = Math.max(loudest, Math.abs(sample));
const gain = loudest > 0 ? PEAK / loudest : 0;

// A 4 ms fade-out on the tail guarantees the final sample is silence.
const fadeFrames = Math.round(0.004 * SAMPLE_RATE);

const pcm = Buffer.alloc(frameCount * 2);
for (let i = 0; i < frameCount; i += 1) {
  const tailFade = i >= frameCount - fadeFrames ? (frameCount - i) / fadeFrames : 1;
  const value = Math.max(-1, Math.min(1, samples[i] * gain * tailFade));
  pcm.writeInt16LE(Math.round(value * 32_767), i * 2);
}

/* ---- RIFF/WAVE container ------------------------------------------------- */

const header = Buffer.alloc(44);
header.write("RIFF", 0, "ascii");
header.writeUInt32LE(36 + pcm.length, 4); // chunk size = header remainder + data
header.write("WAVE", 8, "ascii");
header.write("fmt ", 12, "ascii");
header.writeUInt32LE(16, 16); // PCM fmt chunk length
header.writeUInt16LE(1, 20); // format = PCM
header.writeUInt16LE(1, 22); // channels = mono
header.writeUInt32LE(SAMPLE_RATE, 24);
header.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate = rate * blockAlign
header.writeUInt16LE(2, 32); // block align = channels * bytesPerSample
header.writeUInt16LE(16, 34); // bits per sample
header.write("data", 36, "ascii");
header.writeUInt32LE(pcm.length, 40);

const outPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../public/sounds/new-order.wav",
);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, Buffer.concat([header, pcm]));

console.log(`Wrote ${outPath} (${(header.length + pcm.length) / 1024} KB)`);
