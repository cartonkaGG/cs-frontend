const LS_KEY = "cd-roulette-sound-muted";

export function getRouletteSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(LS_KEY) === "1";
}

export function setRouletteSoundMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY, muted ? "1" : "0");
}

function playRouletteClack(ctx: AudioContext, intensity: number) {
  const t = ctx.currentTime;
  const n = Math.min(1, Math.max(0.35, intensity));
  const base = 88 + Math.random() * 22;

  const o1 = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  const g = ctx.createGain();
  o1.type = "triangle";
  o2.type = "sine";
  o1.frequency.setValueAtTime(base * 1.15, t);
  o1.frequency.exponentialRampToValueAtTime(base * 0.72, t + 0.06);
  o2.frequency.setValueAtTime(base * 2.4, t);
  o2.frequency.exponentialRampToValueAtTime(base * 1.8, t + 0.04);

  const vol = 0.09 * n;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0015, t + 0.085);

  o1.connect(g);
  o2.connect(g);
  g.connect(ctx.destination);
  o1.start(t);
  o2.start(t);
  o1.stop(t + 0.09);
  o2.stop(t + 0.09);
}

/**
 * Звук прокрутки «рулетки»: кроки уповільнюються до зупинки (як колесо з перешкодами).
 */
export function startRouletteSpinTicks(
  durationMs: number,
  muted: boolean,
): () => void {
  if (muted || typeof window === "undefined") return () => {};

  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return () => {};

  const ctx = new AC();
  let closed = false;
  let rafId = 0;
  let startWall = 0;
  let nextClackAt = 0;

  void ctx.resume().catch(() => {});

  const finish = () => {
    if (closed) return;
    closed = true;
    cancelAnimationFrame(rafId);
    ctx.close().catch(() => {});
  };

  const loop = (wall: number) => {
    if (closed) return;
    if (startWall === 0) startWall = wall;
    const elapsed = wall - startWall;
    const progress = Math.min(1, elapsed / durationMs);

    if (elapsed >= durationMs) {
      playRouletteClack(ctx, 1);
      finish();
      return;
    }

    if (wall >= nextClackAt) {
      const slow = progress * progress;
      playRouletteClack(ctx, 0.55 + 0.45 * (1 - slow * 0.35));
      const gapMs = 38 + slow * 195 + Math.random() * 12;
      nextClackAt = wall + gapMs;
    }

    rafId = requestAnimationFrame(loop);
  };

  nextClackAt = performance.now();
  rafId = requestAnimationFrame(loop);

  const timeoutId = setTimeout(finish, durationMs + 200);

  return () => {
    cancelAnimationFrame(rafId);
    clearTimeout(timeoutId);
    if (!closed) {
      closed = true;
      ctx.close().catch(() => {});
    }
  };
}
