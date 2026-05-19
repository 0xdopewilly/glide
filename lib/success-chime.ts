/** Short success chime via Web Audio (no audio file). */
let sharedCtx: AudioContext | null = null;

export function playSuccessChime() {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  try {
    const ctx = sharedCtx ?? new AudioContext();
    sharedCtx = ctx;
    void ctx.resume();

    const t0 = ctx.currentTime;
    const master = ctx.createGain();
    master.connect(ctx.destination);
    master.gain.setValueAtTime(0, t0);
    master.gain.linearRampToValueAtTime(0.14, t0 + 0.02);
    master.gain.exponentialRampToValueAtTime(0.001, t0 + 0.65);

    const notes = [523.25, 659.25, 783.99];

    notes.forEach((freq, i) => {
      const start = t0 + i * 0.1;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.4, start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.22);

      osc.connect(g);
      g.connect(master);
      osc.start(start);
      osc.stop(start + 0.24);
    });
  } catch {
    /* Audio unavailable */
  }
}
