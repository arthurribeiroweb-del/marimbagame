import { noteOf } from './scale';

let ac: AudioContext | undefined;
export const audio = { mute: false };
export const resumeAudio = () => { (ac ??= new AudioContext()).resume(); };

/** Nota de marimba sintética: fundamental + harmônico em 4x (decai rápido) + parcial agudo. */
export function marimba(semi: number, vol = 0.8) {
  if (audio.mute) return;
  const c = (ac ??= new AudioContext()), t = c.currentTime, f = 261.63 * Math.pow(2, semi / 12);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.5 * vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0008, t + 0.9);
  g.connect(c.destination);
  for (const [m, amp, dec] of [[1, 1, 0.9], [4, 0.35, 0.18], [9.9, 0.1, 0.06]]) {
    const o = c.createOscillator(), og = c.createGain();
    o.frequency.value = f * m; og.gain.setValueAtTime(amp, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + dec);
    o.connect(og).connect(g); o.start(t); o.stop(t + 1);
  }
}

/** Estrela coletada: nota aguda; sobe a cada estrela. */
export const chime = (i: number) => marimba(noteOf(10 + i * 2) + 12, 0.7);

/** Fim de fase: arpejo. */
export const fanfare = () => [0, 4, 7, 12].forEach((n, i) => setTimeout(() => marimba(n + 12, 0.9), i * 110));
