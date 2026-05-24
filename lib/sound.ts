/**
 * Web Audio chime — no asset to ship. Plays a soft major-third arpeggio
 * (C5–E5–G5) with a quick attack/decay so it doesn't drag.
 *
 * AudioContext is only created on first call (after a user gesture), per
 * browser autoplay policy. iOS Safari sometimes resumes in "suspended" state;
 * we resume() defensively. Failures are swallowed — a missing chime should
 * never break a transaction.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

function blip(
  audio: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
  peak: number,
) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(peak, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(startAt);
  osc.stop(startAt + duration);
}

export function playSuccessChime(): void {
  try {
    const audio = getCtx();
    if (!audio) return;
    if (audio.state === "suspended") void audio.resume();
    const now = audio.currentTime;
    // C5 → E5 → G5, each ~150ms with a touch of overlap for a fluid feel.
    blip(audio, 523.25, now + 0.0, 0.18, 0.25);
    blip(audio, 659.25, now + 0.09, 0.18, 0.22);
    blip(audio, 783.99, now + 0.18, 0.28, 0.2);
  } catch {
    /* ignore — audio is best-effort */
  }
}
