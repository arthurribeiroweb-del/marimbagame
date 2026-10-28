import { World, Vec2, Circle, Box, RevoluteJoint, type Body } from 'planck';
import type { Level, Placed } from '../types';
import { DEFS, armAngle, type Shape } from '../pieces/defs';
import { noteOf } from '../audio/scale';

export { FALL_RESET };
export const W = 24, H = 15, STEP = 1 / 60;
const FALL_RESET = 2;   // s no chão (fora do balde) até reiniciar sozinho
const HOLD = 0.3;   // tempo (s) que a bola precisa ficar no balde

export interface Hit { blast?: number; heavy?: boolean; strength?: number; note: number; color: string; impulse: number; x: number; y: number }

export interface Sim {
  t: number;
  collected: boolean[];
  ball: Body;
  result: 'win' | 'fail' | null;
  winTime: number;
  /** segundos que a bola está no chão fora do balde (0..FALL_RESET); a UI mostra a barra */
  fallT: number;
  /** segundos parada fora do chão e fora do balde (0..FALL_RESET): travou em algum lugar */
  stuckT: number;
  fell: boolean;
  /** portões abertos (algum botão foi acionado) */
  open: boolean;
  /** bola grudada na cola agora */
  glued: boolean;
  bodies: Map<Placed, Body>;
  /** gangorras da fase (level.seesaws), na mesma ordem */
  seesaws: Body[];
  doors: Body[];
  step(): void;
}

interface Belt { dx: number; dy: number; force: number; max: number }
interface Bomb { radius: number; power: number; fuse: number }
interface UD { glue?: number; button?: boolean; door?: boolean; bomb?: Bomb; lit?: number; done?: boolean; portal?: number; hits?: number; weight?: boolean; belt?: Belt; ball?: boolean; star?: number; bucket?: boolean; note?: number | null; color?: string; cool?: number }
const ud = (b: Body) => (b.getUserData() || {}) as UD;

function bar(w: World, x: number, y: number, a: number, len: number, h: number, data: UD, restitution = 0.25, friction = 0.2) {
  const b = w.createBody({ type: 'static', position: Vec2(x, y), angle: a });
  b.createFixture(Box(len / 2, h / 2), { friction, restitution });
  b.setUserData(data);
  return b;
}

type SeesawShape = Extract<Shape, { kind: 'seesaw' }>;
/** Prancha dinâmica presa por junta ao centro, com limite de giro. */
function seesaw(w: World, x: number, y: number, a: number, s: SeesawShape, data: UD, restitution: number, friction: number) {
  const anchor = w.createBody({ type: 'static', position: Vec2(x, y) });
  const b = w.createDynamicBody({ position: Vec2(x, y), angle: a });
  b.createFixture(Box(s.len / 2, s.h / 2), { density: 0.6, friction, restitution });
  b.setUserData(data);
  w.createJoint(new RevoluteJoint({ enableLimit: true, lowerAngle: -s.limit, upperAngle: s.limit }, anchor, b, Vec2(x, y)));
  return b;
}

/** Simulação pura (sem DOM): mesma montagem => mesmo resultado, em qualquer aparelho. */
export interface Events { hit?: (h: Hit) => void; star?: (i: number) => void }

export function createSim(level: Level, pieces: Placed[], on: Events = {}): Sim {
  const w = new World({ gravity: Vec2(0, 14) });
  const wall = (x: number, y: number, hx: number, hy: number) => bar(w, x, y, 0, hx * 2, hy * 2, {});
  wall(12, H + 0.5, 12.5, 0.5); wall(12, -0.5, 12.5, 0.5); wall(-0.5, 7.5, 0.5, 8); wall(W + 0.5, 7.5, 0.5, 8);
  level.fixed.forEach((f, i) => bar(w, f.x, f.y, f.a, f.len, f.h ?? 0.35, { note: noteOf(i) }));

  // balde: paredes inclinadas (funil) + sensor no fundo
  const { x, y, w: bw } = level.bucket;
  for (const s of [-1, 1]) bar(w, x + s * (bw / 2 + 0.25), y - 0.9, s * 0.4, 0.3, 2, {});
  bar(w, x, y + 0.2, 0, bw + 0.8, 0.4, {});   // piso: bucket.y é o nível do chão do balde
  const sens = w.createBody({ type: 'static', position: Vec2(x, y - 0.4) });
  sens.createFixture(Box(bw / 2 - 0.2, 0.5), { isSensor: true });
  sens.setUserData({ bucket: true });

  const ball = w.createDynamicBody({ position: Vec2(level.ball.x, level.ball.y), bullet: true });
  ball.createFixture(Circle(0.3), { density: 1, friction: 0.15, restitution: 0.35 });
  ball.setUserData({ ball: true });

  level.stars.forEach((st, i) => {   // estrelas coletáveis (sensores)
    const b = w.createBody({ type: 'static', position: Vec2(st.x, st.y) });
    b.createFixture(Circle(0.45), { isSensor: true });
    b.setUserData({ star: i });
  });

  const doors = (level.doors ?? []).map(f => bar(w, f.x, f.y, f.a, f.len, f.h ?? 0.35, { door: true }));
  let pressed = false, glueUntil = 0;
  const ssShape = DEFS.seesaw.shape as SeesawShape;
  const seesaws = (level.seesaws ?? []).map((q, i) => seesaw(w, q.x, q.y, q.a, ssShape, { note: noteOf(i + 3), color: DEFS.seesaw.color }, DEFS.seesaw.restitution, DEFS.seesaw.friction));

  const portals: Body[] = [];
  const bodies = new Map<Placed, Body>();
  for (const p of pieces) {
    const d = DEFS[p.type], s = d.shape, data = { note: p.note, color: d.color };
    let b: Body;
    if (s.kind === 'bar') b = bar(w, p.x, p.y, p.a, s.len, s.h, data, d.restitution, d.friction);
    else if (s.kind === 'circle') {
      b = w.createBody({ type: 'static', position: Vec2(p.x, p.y) });
      b.createFixture(Circle(s.r), { restitution: d.restitution, friction: d.friction });
      b.setUserData(data);
    } else if (s.kind === 'fan') {   // carcaça estática; o vento é aplicado em step()
      b = bar(w, p.x, p.y, p.a, s.depth, s.width, data, d.restitution, d.friction);
    } else if (s.kind === 'belt') {   // esteira: barra estática; a força é aplicada em step() enquanto a bola toca
      b = bar(w, p.x, p.y, p.a, s.len, s.h, { ...data, belt: { dx: Math.cos(p.a), dy: Math.sin(p.a), force: s.force, max: s.maxSpeed } }, d.restitution, d.friction);
    } else if (s.kind === 'seesaw') {
      b = seesaw(w, p.x, p.y, p.a, s, data, d.restitution, d.friction);
    } else if (s.kind === 'bomb') {   // bola sólida; ao ser tocada acende o pavio e explode empurrando a bola
      b = w.createBody({ type: 'static', position: Vec2(p.x, p.y) });
      b.createFixture(Circle(s.r), { restitution: d.restitution, friction: d.friction });
      b.setUserData({ ...data, bomb: { radius: s.radius, power: s.power, fuse: s.fuse } });
    } else if (s.kind === 'glue') {   // barra pegajosa: o contato prende a bola por `hold` segundos
      b = bar(w, p.x, p.y, p.a, s.len, s.h, { ...data, glue: s.hold }, d.restitution, d.friction);
    } else if (s.kind === 'button') {   // sensor: a bola passa e aciona
      b = w.createBody({ type: 'static', position: Vec2(p.x, p.y) });
      b.createFixture(Circle(s.r), { isSensor: true });
      b.setUserData({ ...data, button: true });
    } else if (s.kind === 'pendulum') {   // haste + bola pesada numa junta livre no pivô; solta ao começar
      const anchor = w.createBody({ type: 'static', position: Vec2(p.x, p.y) });
      b = w.createDynamicBody({ position: Vec2(p.x, p.y), angle: p.a, angularDamping: 0.15 });
      b.createFixture(Box(s.len / 2, 0.05, Vec2(s.len / 2, 0), 0), { density: 0.2, friction: d.friction, restitution: d.restitution });
      b.createFixture(Circle(Vec2(s.len, 0), s.r), { density: s.density, friction: d.friction, restitution: d.restitution });
      b.setUserData({ ...data, weight: true });
      w.createJoint(new RevoluteJoint({}, anchor, b, Vec2(p.x, p.y)));
    } else if (s.kind === 'magnet') {   // corpo sólido; a atração é aplicada em step()
      b = w.createBody({ type: 'static', position: Vec2(p.x, p.y) });
      b.createFixture(Circle(s.r), { restitution: d.restitution, friction: d.friction });
      b.setUserData(data);
    } else if (s.kind === 'portal') {   // sensor; o i-ésimo portal liga ao (i xor 1)
      b = w.createBody({ type: 'static', position: Vec2(p.x, p.y) });
      b.createFixture(Circle(s.r), { isSensor: true });
      b.setUserData({ ...data, portal: portals.length });
      portals.push(b);
    } else if (s.kind === 'weight') {   // cai assim que o jogo começa
      b = w.createDynamicBody({ position: Vec2(p.x, p.y), bullet: true, angularDamping: 4 });
      b.createFixture(Circle(s.r), { density: s.density, friction: d.friction, restitution: d.restitution });
      b.setUserData({ ...data, weight: true });
    } else {   // braço cinemático com pivô na ponta
      b = w.createKinematicBody({ position: Vec2(p.x, p.y), angle: p.a });
      b.createFixture(Box(s.len / 2, s.h / 2, Vec2(s.len / 2, 0), 0), { restitution: d.restitution, friction: d.friction });
      b.setUserData(data);
    }
    bodies.set(p, b);
  }

  const sim: Sim = { t: 0, collected: level.stars.map(() => false), ball, result: null, winTime: 0, fallT: 0, stuckT: 0, fell: false, open: false, glued: false, bodies, seesaws, doors, step };
  let inSince: number | null = null;
  let warp: Body | null = null, warpCool = 0;   // portal de destino pendente / recarga
  const belts = new Set<Belt>();   // esteiras em contato com a bola agora

  w.on('post-solve', (c, imp) => {
    const fa = c.getFixtureA().getBody(), fb = c.getFixtureB().getBody(), A = ud(fa), B = ud(fb);
    const o = A.ball ? B : B.ball ? A : null;
    const wt = !o && (A.weight || B.weight) ? (A.weight ? fa : fb) : null;   // peso batendo em algo: também soa
    if (wt) {
      const i = imp.normalImpulses[0] || 0, u = ud(wt);
      // só as 3 primeiras batidas contam, cada uma mais fraca (evita vibração/tremor contínuo)
      if (i > 1.5 && (u.cool === undefined || sim.t - u.cool > 0.3) && (u.hits ?? 0) < 3) {
        u.cool = sim.t; u.hits = (u.hits ?? 0) + 1;
        const p = wt.getPosition(); on.hit?.({ heavy: true, strength: 1 / u.hits, note: u.note ?? 0, color: u.color || '#fff', impulse: i / 3, x: p.x, y: p.y });
      }
      return;
    }
    if (!o || o.bucket || o.note == null) return;
    const i = imp.normalImpulses[0] || 0;
    if (i < 0.12) return;
    const now = sim.t;
    if (o.cool !== undefined && now - o.cool < 0.07) return;
    o.cool = now;
    const bp = ball.getPosition();
    on.hit?.({ note: o.note, color: o.color || '#fff', impulse: i, x: bp.x, y: bp.y });
  });
  const touchesBucket = (c: any) => { const A = ud(c.getFixtureA().getBody()), B = ud(c.getFixtureB().getBody()); return (A.bucket && B.ball) || (B.bucket && A.ball); };
  w.on('begin-contact', c => {
    if (touchesBucket(c)) inSince = sim.t;
    const A = ud(c.getFixtureA().getBody()), B = ud(c.getFixtureB().getBody()), bt = A.ball ? B.belt : B.ball ? A.belt : undefined, st = A.ball ? B.star : B.ball ? A.star : undefined;
    const pi = A.ball ? B.portal : B.ball ? A.portal : undefined;
    if (pi !== undefined && sim.t >= warpCool && portals[pi ^ 1]) warp = portals[pi ^ 1];   // teleporta no próximo passo
    const bo = A.ball ? B : B.ball ? A : null;
    if (bo?.bomb && bo.lit === undefined) bo.lit = sim.t;   // acende o pavio
    const bb = A.ball ? B : B.ball ? A : null;
    if (bb?.button && !pressed) { pressed = true; on.hit?.({ note: bb.note ?? 0, color: '#06d6a0', impulse: 1.5, x: ball.getPosition().x, y: ball.getPosition().y }); }
    const gl = A.ball ? B.glue : B.ball ? A.glue : undefined;
    if (gl !== undefined && sim.t >= glueUntil) { glueUntil = sim.t + gl; sim.glued = true; on.hit?.({ note: 0, color: '#ffb703', impulse: 1, x: ball.getPosition().x, y: ball.getPosition().y }); }
    if (bt) belts.add(bt);
    if (st !== undefined && !sim.collected[st]) { sim.collected[st] = true; on.star?.(st); }
  });
  w.on('end-contact', c => {
    if (touchesBucket(c)) inSince = null;
    const A = ud(c.getFixtureA().getBody()), B = ud(c.getFixtureB().getBody()), bt = A.ball ? B.belt : B.ball ? A.belt : undefined;
    if (bt) belts.delete(bt);
  });

  function step() {
    if (sim.result) return;
    sim.t += STEP;
    if (sim.t < glueUntil) { ball.setLinearVelocity(Vec2(0, 0)); ball.setAngularVelocity(0); ball.setGravityScale(0); sim.glued = true; }
    else if (sim.glued) { ball.setGravityScale(1); sim.glued = false; }   // solta
    if (pressed && !sim.open) { sim.open = true; for (const dr of doors) dr.setActive(false); }   // portões abrem
    if (warp) {   // mesma velocidade, saindo do outro portal
      const q = warp.getPosition(); ball.setPosition(Vec2(q.x, q.y)); warpCool = sim.t + 0.4;
      on.hit?.({ note: ud(warp).note ?? 0, color: ud(warp).color || '#fff', impulse: 1.5, x: q.x, y: q.y }); warp = null;
    }
    const bp = ball.getPosition(), v = ball.getLinearVelocity();
    for (const k of belts) if (v.x * k.dx + v.y * k.dy < k.max) ball.applyForceToCenter(Vec2(k.dx * k.force, k.dy * k.force), true);
    for (const [p, b] of bodies) {
      const s = DEFS[p.type].shape;
      if (s.kind === 'magnet') {   // atrai a bola: força cai linearmente até zero no raio do campo
        const dx = p.x - bp.x, dy = p.y - bp.y, dist = Math.max(Math.hypot(dx, dy), 0.3);
        if (dist < s.radius) { const f = s.power * (1 - dist / s.radius); ball.applyForceToCenter(Vec2((dx / dist) * f, (dy / dist) * f), true); }
        continue;
      }
      if (s.kind === 'bomb') {
        const u = ud(b);
        if (u.lit !== undefined && !u.done && sim.t - u.lit >= s.fuse) {   // BUM: empurra a bola para longe, mais forte quanto mais perto
          u.done = true; b.setActive(false);
          const q = b.getPosition(), dx = bp.x - q.x, dy = bp.y - q.y, dist = Math.hypot(dx, dy);
          if (dist < s.radius) { const k = (1 - dist / s.radius) * s.power / Math.max(dist, 0.01); ball.setLinearVelocity(Vec2(v.x + dx * k, v.y + dy * k)); }
          on.hit?.({ heavy: true, strength: 1, blast: s.radius, note: u.note ?? 0, color: '#ffd166', impulse: 3, x: q.x, y: q.y });
        }
        continue;
      }
      if (s.kind === 'fan') {   // vento: zona retangular à frente, força cai com a distância
        const dx = bp.x - p.x, dy = bp.y - p.y, c = Math.cos(p.a), n = Math.sin(p.a);
        const lx = dx * c + dy * n - s.depth / 2, ly = -dx * n + dy * c;
        if (lx > 0 && lx < s.range && Math.abs(ly) < s.width / 2) {
          const f = s.force * (1 - 0.6 * (lx / s.range));
          ball.applyForceToCenter(Vec2(c * f, n * f), true);
        }
        continue;
      }
      if (s.kind !== 'arm') continue;
      const a0 = armAngle(p.a, sim.t - STEP, s), a1 = armAngle(p.a, sim.t, s);
      b.setAngle(a1); b.setAngularVelocity((a1 - a0) / STEP);
    }
    w.step(STEP, 8, 3);
    if (inSince !== null && sim.t - inSince >= HOLD) { sim.result = 'win'; sim.winTime = inSince; return; }
    sim.fallT = ball.getPosition().y > H - 0.45 && inSince === null ? sim.fallT + STEP : 0;
    if (sim.fallT >= FALL_RESET) { sim.result = 'fail'; sim.fell = true; return; }
    const onFloor = ball.getPosition().y > H - 0.45;
    sim.stuckT = !onFloor && inSince === null && ball.getLinearVelocity().length() < 0.15 ? sim.stuckT + STEP : 0;
    if (sim.stuckT >= FALL_RESET) { sim.result = 'fail'; sim.fell = true; return; }   // travou: reinicia sozinho
    if (ball.getPosition().y > H + 2) sim.result = 'fail';
  }
  return sim;
}

/** Roda até acabar (ou até `cap` segundos) e devolve o desfecho, mesmo sem vitória (útil para a busca). */
export function simulateFull(level: Level, pieces: Placed[], cap = 30) {
  const s = createSim(level, pieces);
  while (!s.result && s.t < cap) s.step();
  const win = s.result === 'win';
  return { win, time: win ? s.winTime : s.t, stars: s.collected.filter(Boolean).length };
}

/** Tempo e estrelas se venceu, senão null. */
export function simulate(level: Level, pieces: Placed[], cap = 30): { time: number; stars: number } | null {
  const r = simulateFull(level, pieces, cap);
  return r.win ? { time: r.time, stars: r.stars } : null;
}
