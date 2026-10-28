export interface Result { score: number; stars: number; time: number }
const KEY = 'marimba_progress_v1';

export function load(): Record<number, Result> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

/** Guarda se for melhor pontuação. Retorna true se for recorde. */
export function save(id: number, r: Result): boolean {
  const all = load(), old = all[id];
  if (old && old.score >= r.score) return false;
  all[id] = r;
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* sem armazenamento: segue sem salvar */ }
  return true;
}

// ---- coringas: peças economizadas viram fichas (máx. 3) que valem 1 peça extra qualquer numa fase ----
export const MAX_JOKERS = 3;
const KJ = 'marimba_jokers_v1', KS = 'marimba_saved_v1';
const num = (k: string): number => { try { return Number(localStorage.getItem(k)) || 0; } catch { return 0; } };
const put = (k: string, v: number) => { try { localStorage.setItem(k, String(v)); } catch { /* sem armazenamento */ } };
export const getBank = () => Math.min(MAX_JOKERS, Math.max(0, num(KJ)));
export const setBank = (n: number) => put(KJ, Math.min(MAX_JOKERS, Math.max(0, n)));
/** Melhor economia (peças sobrando) já premiada na fase: impede farmar coringas repetindo a fase. */
export const getSaved = (id: number) => num(KS + '_' + id);
export const setSaved = (id: number, n: number) => put(KS + '_' + id, n);
