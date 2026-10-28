import type { PieceType, Placed } from '../types';

/** Forma da peça: física e desenho saem daqui. Peça nova = nova entrada em DEFS. */
export type Shape =
  | { kind: 'bar'; len: number; h: number }
  | { kind: 'circle'; r: number }
  | { kind: 'arm'; len: number; h: number; amp: number; period: number }   // gira em torno da ponta
  | { kind: 'fan'; depth: number; width: number; range: number; force: number }   // sopra na direção do ângulo
  | { kind: 'belt'; len: number; h: number; force: number; maxSpeed: number }   // esteira: empurra a bola ao longo do ângulo
  | { kind: 'seesaw'; len: number; h: number; limit: number }
  | { kind: 'weight'; r: number; density: number }
  | { kind: 'portal'; r: number }
  | { kind: 'bomb'; r: number; radius: number; power: number; fuse: number }
  | { kind: 'magnet'; r: number; radius: number; power: number }
  | { kind: 'glue'; len: number; h: number; hold: number }   // cola: a bola gruda por alguns segundos
  | { kind: 'button'; r: number }   // botão: ao ser tocado pela bola abre os portões da fase
  | { kind: 'pendulum'; len: number; r: number; density: number };   // bola pesada na haste, presa no pivô; o ângulo é a posição inicial   // puxa a bola para si   // explode ao ser tocada   // par de portais: o 1º colocado liga ao 2º   // peso: cai quando o jogo começa   // gangorra: prancha que pivota no centro

export interface PieceDef {
  label: string;
  color: string;
  shape: Shape;
  restitution: number;
  friction: number;
  defaultAngle: number;
  icon: string;   // SVG; COLOR é trocado pela cor da peça
}

export const DEFS: Record<PieceType, PieceDef> = {
  ramp: {
    label: 'Rampa', color: '#4cc9f0', shape: { kind: 'bar', len: 3, h: 0.3 }, restitution: 0.25, friction: 0.2, defaultAngle: 0,
    icon: '<svg viewBox="0 0 40 40"><rect x="4" y="17" width="32" height="7" rx="3.5" fill="COLOR" transform="rotate(-20 20 20)"/></svg>',
  },
  bumper: {
    label: 'Bumper', color: '#f72585', shape: { kind: 'circle', r: 0.7 }, restitution: 1.25, friction: 0, defaultAngle: 0,
    icon: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="12" fill="COLOR"/><circle cx="20" cy="20" r="17" fill="none" stroke="COLOR" stroke-opacity=".4" stroke-width="2"/></svg>',
  },
  bat: {
    label: 'Taco', color: '#ffd166', shape: { kind: 'arm', len: 2.6, h: 0.36, amp: 1.5, period: 1.8 }, restitution: 0.6, friction: 0.1, defaultAngle: 0.5,
    icon: '<svg viewBox="0 0 40 40"><rect x="9" y="17" width="27" height="6" rx="3" fill="COLOR" transform="rotate(-35 9 20)"/><circle cx="9" cy="20" r="4" fill="#fff"/></svg>',
  },
  spring: {
    label: 'Mola', color: '#80ed99', shape: { kind: 'bar', len: 2.2, h: 0.28 }, restitution: 1.4, friction: 0, defaultAngle: 0,
    icon: '<svg viewBox="0 0 40 40"><path d="M5 26 L11 14 L17 26 L23 14 L29 26 L35 14" fill="none" stroke="COLOR" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  fan: {
    label: 'Ventilador', color: '#9bf6ff', shape: { kind: 'fan', depth: 0.5, width: 1.3, range: 4.5, force: 9 }, restitution: 0.3, friction: 0.2, defaultAngle: -Math.PI / 2,
    icon: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="3" fill="COLOR"/><g fill="COLOR"><ellipse cx="20" cy="10" rx="4" ry="8"/><ellipse cx="20" cy="10" rx="4" ry="8" transform="rotate(120 20 20)"/><ellipse cx="20" cy="10" rx="4" ry="8" transform="rotate(240 20 20)"/></g></svg>',
  },
  belt: {
    label: 'Esteira', color: '#c77dff', shape: { kind: 'belt', len: 4, h: 0.3, force: 4.5, maxSpeed: 4.5 }, restitution: 0.1, friction: 0.3, defaultAngle: 0,
    icon: '<svg viewBox="0 0 40 40"><rect x="4" y="15" width="32" height="10" rx="5" fill="none" stroke="COLOR" stroke-width="3"/><path d="M14 20 h10 m-4 -4 l4 4 l-4 4" fill="none" stroke="COLOR" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  seesaw: {
    label: 'Gangorra', color: '#ff9e00', shape: { kind: 'seesaw', len: 3.4, h: 0.26, limit: 0.3 }, restitution: 0.1, friction: 0.5, defaultAngle: 0.25,
    icon: '<svg viewBox="0 0 40 40"><rect x="5" y="17" width="30" height="5" rx="2.5" fill="COLOR" transform="rotate(-14 20 20)"/><path d="M20 22 L14 33 H26 Z" fill="COLOR" fill-opacity=".6"/></svg>',
  },
  weight: {
    label: 'Peso', color: '#868e96', shape: { kind: 'weight', r: 0.55, density: 12 }, restitution: 0, friction: 0.4, defaultAngle: 0,
    icon: '<svg viewBox="0 0 40 40"><path d="M12 14 h16 l5 18 h-26 Z" fill="COLOR"/><path d="M16 14 a4 4 0 0 1 8 0" fill="none" stroke="COLOR" stroke-width="3"/><text x="20" y="29" font-size="9" font-weight="700" text-anchor="middle" fill="#12141c">KG</text></svg>',
  },
  portal: {
    label: 'Portal', color: '#4cc9f0', shape: { kind: 'portal', r: 0.65 }, restitution: 0, friction: 0, defaultAngle: 0,
    icon: '<svg viewBox="0 0 40 40"><ellipse cx="14" cy="20" rx="6" ry="11" fill="none" stroke="#4cc9f0" stroke-width="3.5"/><ellipse cx="27" cy="20" rx="6" ry="11" fill="none" stroke="#ff9e00" stroke-width="3.5"/></svg>',
  },
  bomb: {
    label: 'Granada', color: '#6a994e', shape: { kind: 'bomb', r: 0.45, radius: 3.6, power: 11, fuse: 0.3 }, restitution: 0.2, friction: 0.3, defaultAngle: 0,
    icon: '<svg viewBox="0 0 40 40"><ellipse cx="20" cy="24" rx="10" ry="12" fill="COLOR"/><rect x="16" y="8" width="8" height="5" rx="1.5" fill="#3d5a2a"/><path d="M24 10 q8 0 9 7" fill="none" stroke="#adb5bd" stroke-width="2.6" stroke-linecap="round"/><circle cx="13" cy="9" r="3.2" fill="none" stroke="#ffd166" stroke-width="2"/><path d="M13 20 h14 M13 26 h14 M20 14 v21" stroke="#3d5a2a" stroke-width="1.6" fill="none"/></svg>',
  },
  magnet: {
    label: 'Ímã', color: '#ff595e', shape: { kind: 'magnet', r: 0.45, radius: 5, power: 14 }, restitution: 0.1, friction: 0.3, defaultAngle: 0,
    icon: '<svg viewBox="0 0 40 40"><path d="M10 8 v14 a10 10 0 0 0 20 0 v-14" fill="none" stroke="COLOR" stroke-width="7" stroke-linejoin="round"/><rect x="6.5" y="6" width="7" height="7" fill="#e8eaf2"/><rect x="26.5" y="6" width="7" height="7" fill="#e8eaf2"/></svg>',
  },
  pendulum: {
    label: 'Pêndulo', color: '#f4a261', shape: { kind: 'pendulum', len: 3, r: 0.5, density: 6 }, restitution: 0.3, friction: 0.3, defaultAngle: 0.25,
    icon: '<svg viewBox="0 0 40 40"><circle cx="9" cy="8" r="3" fill="#e8eaf2"/><path d="M9 8 L27 28" stroke="COLOR" stroke-width="3" stroke-linecap="round"/><circle cx="29" cy="30" r="7" fill="COLOR"/></svg>',
  },
  button: {
    label: 'Botão', color: '#e63946', shape: { kind: 'button', r: 0.5 }, restitution: 0, friction: 0, defaultAngle: 0,
    icon: '<svg viewBox="0 0 40 40"><rect x="6" y="27" width="28" height="7" rx="2" fill="#adb5bd"/><path d="M11 27 a9 9 0 0 1 18 0 Z" fill="COLOR"/></svg>',
  },
  glue: {
    label: 'Cola', color: '#ffb703', shape: { kind: 'glue', len: 2.4, h: 0.3, hold: 1.2 }, restitution: 0, friction: 0.9, defaultAngle: 0,
    icon: '<svg viewBox="0 0 40 40"><rect x="5" y="12" width="30" height="8" rx="4" fill="COLOR"/><path d="M12 20 v7 a2.5 2.5 0 0 0 5 0 v-7 M24 20 v11 a2.5 2.5 0 0 0 5 0 v-11" fill="COLOR"/></svg>',
  },
};
export const PIECE_TYPES = Object.keys(DEFS) as PieceType[];

/** Ângulo do braço no instante t: swing rápido, volta lenta, descanso. */
export function armAngle(base: number, t: number, s: Extract<Shape, { kind: 'arm' }>) {
  const p = (t % s.period) / s.period;
  const k = p < 0.1 ? p / 0.1 : p < 0.45 ? 1 - (p - 0.1) / 0.35 : 0;
  return base - s.amp * k;
}

/** Ponto (mundo) dentro da peça? Usado para pegar peças com o mouse. */
export function hitPiece(p: Placed, mx: number, my: number) {
  const s = DEFS[p.type].shape, c = Math.cos(-p.a), n = Math.sin(-p.a);
  const lx = (mx - p.x) * c - (my - p.y) * n, ly = (mx - p.x) * n + (my - p.y) * c;
  if (s.kind === 'circle' || s.kind === 'weight' || s.kind === 'portal' || s.kind === 'bomb' || s.kind === 'magnet' || s.kind === 'button') return Math.hypot(lx, ly) < s.r + 0.2;
  if (s.kind === 'bar' || s.kind === 'belt' || s.kind === 'seesaw' || s.kind === 'glue') return Math.abs(lx) < s.len / 2 + 0.2 && Math.abs(ly) < 0.5;
  if (s.kind === 'fan') return Math.abs(lx) < s.depth / 2 + 0.3 && Math.abs(ly) < s.width / 2 + 0.2;
  return lx > -0.5 && lx < s.len + 0.2 && Math.abs(ly) < 0.5;
}

/** Posição da alça de rotação (nas peças que giram); null para o bumper, que é redondo. */
export function handleOf(p: Placed) {
  if (['circle', 'weight', 'portal', 'bomb', 'magnet', 'button'].includes(DEFS[p.type].shape.kind)) return null;
  const r = ringRadius(p.type);
  return { x: p.x + Math.cos(p.a) * r, y: p.y + Math.sin(p.a) * r };
}

/** Raio do anel de seleção. */
export const ringRadius = (t: PieceType) => {
  const s = DEFS[t].shape;
  return (s.kind === 'circle' || s.kind === 'weight' || s.kind === 'portal' || s.kind === 'bomb' || s.kind === 'magnet' || s.kind === 'button' ? s.r : s.kind === 'fan' ? s.width / 2 + 0.4 : s.kind === 'arm' || s.kind === 'pendulum' ? s.len : s.len / 2) + 0.3;
};
