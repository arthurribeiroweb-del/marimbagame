import { W, H, FALL_RESET } from '../sim/world';
import { DEFS, ringRadius, handleOf } from '../pieces/defs';
import { game } from '../game';
import type { Placed } from '../types';

const view = { S: 40, OX: 0, OY: 0 };

export function resize(cv: HTMLCanvasElement) {
  const r = cv.getBoundingClientRect(), dpr = devicePixelRatio || 1;
  cv.width = r.width * dpr; cv.height = r.height * dpr;
  view.S = Math.min(cv.width / W, cv.height / H); view.OX = (cv.width - W * view.S) / 2; view.OY = (cv.height - H * view.S) / 2;
}

export function toWorld(cv: HTMLCanvasElement, e: { clientX: number; clientY: number }) {
  const r = cv.getBoundingClientRect(), d = devicePixelRatio || 1;
  return { x: ((e.clientX - r.left) * d - view.OX) / view.S, y: ((e.clientY - r.top) * d - view.OY) / view.S };
}

function starPath(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
}

export function draw(cv: HTMLCanvasElement) {
  const g = cv.getContext('2d')!, { S, OX, OY } = view, { level, sim } = game, now = performance.now();
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#12141c'; g.fillRect(0, 0, cv.width, cv.height);
  g.setTransform(S, 0, 0, S, OX + (Math.random() - 0.5) * game.shake * S, OY + (Math.random() - 0.5) * game.shake * S);
  g.fillStyle = '#181b27'; g.fillRect(0, 0, W, H);

  const rect = (x: number, y: number, a: number, x0: number, w: number, h: number, col: string, glow = false) => {
    g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = col;
    if (glow) { g.shadowColor = col; g.shadowBlur = 0.5 * S; }
    g.beginPath(); g.roundRect(x0, -h / 2, w, h, Math.min(h / 2, 0.15)); g.fill(); g.restore();
  };
  const win = game.outcome?.kind === 'win';

  level.doors?.forEach(f => {   // portões: laranjas e fechados; abertos viram só o contorno
    if (sim?.open) { g.save(); g.strokeStyle = '#ff9e0066'; g.lineWidth = 0.06; g.setLineDash([0.2, 0.2]); g.translate(f.x, f.y); g.rotate(f.a); g.strokeRect(-f.len / 2, -(f.h ?? 0.35) / 2, f.len, f.h ?? 0.35); g.restore(); }
    else rect(f.x, f.y, f.a, -f.len / 2, f.len, f.h ?? 0.35, '#ff9e00');
  });
  for (const f of level.fixed) rect(f.x, f.y, f.a, -f.len / 2, f.len, f.h ?? 0.35, '#5a607a');

  // balde (funil + carinha)
  const { x, y, w: bw } = level.bucket, bob = win ? Math.sin(now / 120) * 0.08 : 0;
  g.fillStyle = '#06d6a026'; g.beginPath();
  g.moveTo(x - bw / 2 - 0.9, y - 1.9); g.lineTo(x + bw / 2 + 0.9, y - 1.9); g.lineTo(x + bw / 2, y); g.lineTo(x - bw / 2, y); g.fill();
  rect(x, y + 0.2, 0, -(bw + 0.8) / 2, bw + 0.8, 0.4, '#0a8f70');
  for (const s of [-1, 1]) rect(x + s * (bw / 2 + 0.25), y - 0.9, s * 0.4, -0.15, 0.3, 2, '#06d6a0', win);
  g.save(); g.translate(x, y - 1.35 + bob); g.fillStyle = g.strokeStyle = '#e8fff7'; g.lineWidth = 0.1; g.lineCap = 'round';
  for (const s of [-1, 1]) { g.beginPath(); if (win) g.arc(s * 0.55, 0, 0.18, Math.PI, 0); else g.arc(s * 0.55, 0, 0.14, 0, 7); win ? g.stroke() : g.fill(); }
  g.beginPath(); g.arc(0, 0.2, win ? 0.55 : 0.4, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); g.restore();

  // estrelas coletáveis
  level.stars.forEach((s, i) => {
    const got = sim?.collected[i], pulse = 1 + Math.sin(now / 300 + i) * 0.08;
    g.save();
    if (got) { g.globalAlpha = 0.25; g.strokeStyle = '#ffd166'; g.lineWidth = 0.08; starPath(g, s.x, s.y, 0.5); g.stroke(); }
    else { g.fillStyle = '#ffd166'; g.shadowColor = '#ffd166'; g.shadowBlur = 0.6 * S; starPath(g, s.x, s.y, 0.5 * pulse); g.fill(); }
    g.restore();
  });

  // gangorras da fase (catapulta)
  const ss = DEFS.seesaw.shape as Extract<typeof DEFS.seesaw.shape, { kind: 'seesaw' }>;
  level.seesaws?.forEach((q, i) => {
    const a = sim ? sim.seesaws[i].getAngle() : q.a;
    g.fillStyle = '#ff9e0055'; g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(q.x - 0.6, q.y + 1.1); g.lineTo(q.x + 0.6, q.y + 1.1); g.fill();
    rect(q.x, q.y, a, -ss.len / 2, ss.len, ss.h, DEFS.seesaw.color);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(q.x, q.y, 0.2, 0, 7); g.fill();
  });

  // peças (+ fantasma da que está sendo colocada)
  const ghost: Placed | null = game.placing && !sim ? { type: game.placing, x: game.mouse.x, y: game.mouse.y, a: game.pa, note: 0 } : null;
  for (const p of ghost ? [...game.pieces, ghost] : game.pieces) {
    const d = DEFS[p.type], s = d.shape, sel = p === game.sel || p === ghost, b = sim?.bodies.get(p), a = b ? b.getAngle() : p.a;
    g.globalAlpha = p === ghost ? 0.5 : 1;
    if (s.kind === 'bar') rect(p.x, p.y, a, -s.len / 2, s.len, s.h, d.color, sel);
    else if (s.kind === 'belt') {
      rect(p.x, p.y, a, -s.len / 2, s.len, s.h, d.color, sel);
      g.save(); g.translate(p.x, p.y); g.rotate(a); g.strokeStyle = '#12141c'; g.lineWidth = 0.07; g.lineCap = 'round'; g.lineJoin = 'round';
      for (let k = 0; k < 4; k++) {   // setas que correm no sentido da esteira
        const x = (((now / (sim ? 500 : 2500) + k / 4) % 1) - 0.5) * (s.len - 0.5);
        g.beginPath(); g.moveTo(x - 0.1, -0.08); g.lineTo(x + 0.08, 0); g.lineTo(x - 0.1, 0.08); g.stroke();
      }
      g.restore();
    }
    else if (s.kind === 'portal') {   // A (azul) e B (laranja): o 1º colocado liga ao 2º
      const ps = game.pieces.filter(q => q.type === 'portal'), idx = p === ghost ? ps.length : ps.indexOf(p), col = idx % 2 ? '#ff9e00' : '#4cc9f0';
      if (p === ps[0] && ps[1]) { g.save(); g.strokeStyle = '#ffffff22'; g.lineWidth = 0.05; g.setLineDash([0.2, 0.25]); g.beginPath(); g.moveTo(ps[0].x, ps[0].y); g.lineTo(ps[1].x, ps[1].y); g.stroke(); g.restore(); }
      g.save(); g.translate(p.x, p.y); g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = 0.6 * S;
      g.lineWidth = 0.14; g.beginPath(); g.ellipse(0, 0, s.r * 0.75, s.r, 0, 0, 7); g.stroke();
      g.lineWidth = 0.07; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(0, 0, s.r * 0.5, s.r * 0.72, 0, now / 400 + k * 2.1, now / 400 + k * 2.1 + 1.3); g.stroke(); }
      g.shadowBlur = 0; g.fillStyle = col; g.font = '700 0.45px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(idx % 2 ? 'B' : 'A', 0, 0.03); g.restore();
    }
    else if (s.kind === 'glue') {   // barra com gotas pingando por baixo
      rect(p.x, p.y, a, -s.len / 2, s.len, s.h, d.color, sel);
      g.save(); g.translate(p.x, p.y); g.rotate(a); g.fillStyle = d.color;
      for (const k of [-0.7, 0, 0.7]) { const l = 0.15 + 0.1 * Math.sin(now / 500 + k * 5) + 0.12; g.beginPath(); g.roundRect(k * s.len / 2 - 0.07, 0.1, 0.14, l + 0.2, 0.07); g.fill(); }
      g.restore();
    }
    else if (s.kind === 'button') {   // botão vermelho; fica verde e afunda quando acionado
      const on = !!sim?.open;
      g.save(); g.translate(p.x, p.y + 0.3); g.fillStyle = '#adb5bd'; g.beginPath(); g.roundRect(-0.55, 0, 1.1, 0.22, 0.05); g.fill();
      g.fillStyle = on ? '#06d6a0' : d.color; if (sel) { g.shadowColor = d.color; g.shadowBlur = 0.5 * S; }
      g.beginPath(); g.arc(0, 0, 0.42, Math.PI, 0); g.fill(); g.restore();
    }
    else if (s.kind === 'pendulum') {
      g.save(); g.translate(p.x, p.y); g.rotate(a);
      g.strokeStyle = '#adb5bd'; g.lineWidth = 0.1; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(s.len, 0); g.stroke();
      g.fillStyle = d.color; if (sel) { g.shadowColor = d.color; g.shadowBlur = 0.5 * S; }
      g.beginPath(); g.arc(s.len, 0, s.r, 0, 7); g.fill(); g.shadowBlur = 0;
      g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 0.17, 0, 7); g.fill(); g.restore();
    }
    else if (s.kind === 'magnet') {   // ímã vermelho com anéis que correm para dentro (campo)
      g.save(); g.translate(p.x, p.y);
      g.strokeStyle = d.color; g.lineWidth = 0.05; g.lineCap = 'round';
      for (let k = 0; k < 3; k++) { const u = 1 - (((now / 1400 + k / 3) % 1)); g.globalAlpha *= 0.5 * (1 - u + 0.2); g.beginPath(); g.arc(0, 0, s.r + u * (s.radius - s.r), 0, 7); g.stroke(); g.globalAlpha = p === ghost ? 0.5 : 1; }
      g.fillStyle = d.color; if (sel) { g.shadowColor = d.color; g.shadowBlur = 0.5 * S; }
      g.beginPath(); g.arc(0, 0, s.r, 0, 7); g.fill(); g.shadowBlur = 0;
      g.fillStyle = '#e8eaf2'; g.fillRect(-0.28, -0.27, 0.2, 0.2); g.fillRect(0.08, -0.27, 0.2, 0.2);
      g.restore();
    }
    else if (s.kind === 'bomb') {   // granada: ao ser tocada o pino solta e voa, a alavanca abre, e então explode
      const u = (b?.getUserData() ?? {}) as { lit?: number }, dt = u.lit !== undefined && sim ? sim.t - u.lit : -1, lit = dt >= 0;
      if (b && !b.isActive()) { g.globalAlpha = 1; continue; }   // já explodiu
      g.save(); g.translate(p.x, p.y);
      if (sel) { g.shadowColor = d.color; g.shadowBlur = 0.5 * S; }
      g.fillStyle = lit && Math.floor(now / 70) % 2 ? '#d9534f' : d.color;
      g.beginPath(); g.ellipse(0, 0.05, 0.4, 0.5, 0, 0, 7); g.fill(); g.shadowBlur = 0;
      g.strokeStyle = '#3d5a2a'; g.lineWidth = 0.05; g.beginPath(); g.moveTo(-0.37, -0.1); g.lineTo(0.37, -0.1); g.moveTo(-0.33, 0.2); g.lineTo(0.33, 0.2); g.moveTo(0, -0.4); g.lineTo(0, 0.55); g.stroke();
      g.fillStyle = '#3d5a2a'; g.beginPath(); g.roundRect(-0.14, -0.62, 0.28, 0.2, 0.05); g.fill();
      g.strokeStyle = '#adb5bd'; g.lineWidth = 0.09; g.lineCap = 'round'; g.beginPath();   // alavanca: abre depois que o pino sai
      if (lit) { g.moveTo(0.12, -0.6); g.quadraticCurveTo(0.65, -0.6, 0.62, -0.1); } else { g.moveTo(0.12, -0.6); g.quadraticCurveTo(0.42, -0.55, 0.4, 0.1); }
      g.stroke();
      if (!lit) { g.strokeStyle = '#ffd166'; g.lineWidth = 0.06; g.beginPath(); g.arc(-0.24, -0.62, 0.12, 0, 7); g.stroke(); }   // pino no lugar
      else if (dt < 0.3) { g.globalAlpha *= 1 - dt / 0.3; g.strokeStyle = '#ffd166'; g.lineWidth = 0.06; g.beginPath(); g.arc(-0.24 - 3 * dt, -0.62 - 2.4 * dt + 9 * dt * dt, 0.12, 0, 7); g.stroke(); }   // pino voando
      g.restore(); g.globalAlpha = p === ghost ? 0.5 : 1;
      if (ghost === p) { g.strokeStyle = '#6a994e88'; g.lineWidth = 0.05; g.setLineDash([0.15, 0.2]); g.beginPath(); g.arc(p.x, p.y, s.radius, 0, 7); g.stroke(); g.setLineDash([]); }   // alcance da explosão
    }
    else if (s.kind === 'weight') {   // peso: bola de ferro; usa a posição da simulação quando está caindo
      const pos = b ? b.getPosition() : p, ang = b ? b.getAngle() : 0;
      g.save(); g.translate(pos.x, pos.y); g.rotate(ang); g.fillStyle = d.color; if (sel) { g.shadowColor = d.color; g.shadowBlur = 0.5 * S; }
      g.beginPath(); g.arc(0, 0, s.r, 0, 7); g.fill(); g.shadowBlur = 0; g.strokeStyle = '#fff4'; g.lineWidth = 0.08; g.beginPath(); g.arc(0, 0, s.r - 0.1, 3.5, 4.6); g.stroke(); g.fillStyle = '#12141c'; g.font = '700 0.42px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('KG', 0, 0.02); g.restore();
    }
    else if (s.kind === 'seesaw') {
      g.fillStyle = '#ff9e0055'; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - 0.6, p.y + 1.1); g.lineTo(p.x + 0.6, p.y + 1.1); g.fill();
      rect(p.x, p.y, a, -s.len / 2, s.len, s.h, d.color, sel);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(p.x, p.y, 0.2, 0, 7); g.fill();
    }
    else if (s.kind === 'fan') {
      g.save(); g.translate(p.x, p.y); g.rotate(a);
      g.fillStyle = 'rgba(155,246,255,0.08)'; g.fillRect(s.depth / 2, -s.width / 2, s.range, s.width);
      g.strokeStyle = d.color; g.lineWidth = 0.06; g.lineCap = 'round';
      for (let k = 0; k < 3; k++) for (const o of [-0.35, 0, 0.35]) {   // sopro: traços que correm no sentido do vento
        const u = ((now / 900 + k / 3 + o) % 1 + 1) % 1, x = s.depth / 2 + u * s.range, y = o * s.width;
        g.globalAlpha *= 1 - u; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 0.35, y); g.stroke(); g.globalAlpha = p === ghost ? 0.5 : 1;
      }
      g.restore();
      rect(p.x, p.y, a, -s.depth / 2, s.depth, s.width, d.color, sel);
    }
    else if (s.kind === 'arm') { rect(p.x, p.y, a, 0, s.len, s.h, d.color, sel); g.fillStyle = '#fff'; g.beginPath(); g.arc(p.x, p.y, 0.22, 0, 7); g.fill(); }
    else { g.save(); g.fillStyle = d.color; if (sel) { g.shadowColor = d.color; g.shadowBlur = 0.5 * S; } g.beginPath(); g.arc(p.x, p.y, s.r, 0, 7); g.fill(); g.restore(); }
    if (sel && !sim) { g.strokeStyle = '#fff'; g.lineWidth = 0.05; g.setLineDash([0.2, 0.2]); g.beginPath(); g.arc(p.x, p.y, ringRadius(p.type), 0, 7); g.stroke(); g.setLineDash([]); }
    const h = p === game.sel && !sim ? handleOf(p) : null;   // alça: arraste para girar livremente
    if (h) { g.save(); g.fillStyle = '#fff'; g.beginPath(); g.arc(h.x, h.y, 0.28, 0, 7); g.fill(); g.fillStyle = '#12141c'; g.font = '0.4px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⟳', h.x, h.y); g.restore(); }
  }
  g.globalAlpha = 1;

  game.trail.forEach((t, i, arr) => { g.fillStyle = `rgba(255,255,255,${(i / arr.length) * 0.25})`; g.beginPath(); g.arc(t.x, t.y, (0.3 * i) / arr.length, 0, 7); g.fill(); });
  for (const f of game.fx) { g.strokeStyle = f.c; g.globalAlpha = 1 - f.t; g.lineWidth = 0.08; g.beginPath(); g.arc(f.x, f.y, 0.3 + f.t * (f.big ?? 1.2), 0, 7); g.stroke(); g.globalAlpha = 1; }

  if (game.pad && !sim && !game.outcome) {   // cursor do controle
    g.strokeStyle = '#fff'; g.lineWidth = 0.07; g.beginPath(); g.arc(game.pad.x, game.pad.y, 0.35, 0, 7); g.stroke();
    g.fillStyle = '#ffd166'; g.beginPath(); g.arc(game.pad.x, game.pad.y, 0.1, 0, 7); g.fill();
  }
  if (sim && (sim.fallT > 0 || sim.stuckT > 0) && !sim.result) {   // barra de reinício automático
    const t = Math.max(sim.fallT, sim.stuckT), k = t / FALL_RESET, bx = W / 2 - 4, by = 2.2;
    g.save(); g.fillStyle = '#000a'; g.beginPath(); g.roundRect(bx - 0.3, by - 0.3, 8.6, 1.9, 0.3); g.fill();
    g.fillStyle = '#3a3f58'; g.beginPath(); g.roundRect(bx, by + 0.75, 8, 0.5, 0.25); g.fill();
    g.fillStyle = '#f72585'; g.beginPath(); g.roundRect(bx, by + 0.75, 8 * k, 0.5, 0.25); g.fill();
    g.fillStyle = '#e8eaf2'; g.font = '700 0.55px system-ui'; g.textAlign = 'center'; g.textBaseline = 'top';
    g.fillText(`${sim.stuckT > sim.fallT ? "Travou" : "Caiu"}! Reiniciando em ${Math.max(0, FALL_RESET - t).toFixed(1)}s`, W / 2, by); g.restore();
  }
  const bp = sim ? sim.ball.getPosition() : level.ball;
  g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 0.4 * S; g.beginPath(); g.arc(bp.x, bp.y, 0.3, 0, 7); g.fill(); g.shadowBlur = 0;
}
