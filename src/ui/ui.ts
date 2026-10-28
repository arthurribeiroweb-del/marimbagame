import { DEFS, PIECE_TYPES } from '../pieces/defs';
import { LEVELS } from '../levels';
import * as store from '../storage';
import { MIN_STARS, minPieces, game, playing, left, canPlace, jokersLeft, pick, rotate, remove, play, reset, loadLevel, unlocked } from '../game';

const $ = (id: string) => document.getElementById(id)!;
const stars = (n: number, total = 3) => '★'.repeat(n) + '☆'.repeat(total - n);

/** Redesenha a parte HTML (barra lateral, título, menu, resultado). O canvas é desenhado à parte, todo frame. */
export function render() {
  const run = playing();
  $('lvl').textContent = `Fase ${game.level.id} · ${game.level.name}`;
  $('inv').innerHTML = '';
  for (const t of PIECE_TYPES) {
    if (!game.level.inventory[t] && game.jokers <= 0) continue;   // com coringas, qualquer peça pode entrar
    const b = document.createElement('button'), d = DEFS[t];
    b.innerHTML = `${d.icon.replace(/COLOR/g, d.color)}<span class="n">${left(t) > 0 ? left(t) : jokersLeft() > 0 ? '★' : 0}</span>`;
    b.disabled = run || !canPlace(t); b.title = d.label; b.setAttribute('aria-label', d.label);
    b.className = game.placing === t ? 'on' : ''; b.onclick = () => pick(t);
    $('inv').appendChild(b);
  }
  $('jk').textContent = game.jokers > 0 ? `★ ${jokersLeft()} coringa(s): peça extra de qualquer tipo` : 'Economize peças para ganhar coringas ★';
  $('stage').classList.toggle('placing', !!game.placing);
  $('play').toggleAttribute('disabled', run);
  ($('rotL') as HTMLButtonElement).disabled = ($('rotR') as HTMLButtonElement).disabled = run || !(game.sel || game.placing);
  ($('del') as HTMLButtonElement).disabled = run || !game.sel;
  renderOutcome();
}

function renderOutcome() {
  const o = game.outcome, m = $('msg');
  if (!o) { m.style.display = 'none'; return; }
  const next = game.levelIndex + 1 < LEVELS.length;
  m.style.display = 'flex';
  m.innerHTML = o.kind === 'low'
    ? `<div class="card"><h2>Quase!</h2><div class="big">${stars(o.stars, game.level.stars.length)}</div><p class="dim">Para passar de fase pegue pelo menos ${MIN_STARS} estrelas.</p><div class="row"><button id="again" class="pri">Tentar de novo</button></div></div>`
    : o.kind === 'fail'
    ? `<div class="card"><h2>Não foi dessa vez</h2><p class="dim">Ajuste as peças e tente de novo.</p><div class="row"><button id="again" class="pri">Tentar de novo</button></div></div>`
    : `<div class="card"><h2>Fase completa!</h2><div class="big">${stars(o.stars, game.level.stars.length)}</div>
       <p class="score">${o.score.toLocaleString('pt-BR')} pontos${o.newBest ? ' · novo recorde!' : ''}</p>
       <p class="dim">⏱ ${o.time.toFixed(2)}s · referência ${game.level.par.toFixed(2)}s<br>🧩 ${o.pieces} peça(s) · mínimo conhecido ${minPieces(game.level)} · economia +${o.eco}${o.jokersWon ? '<br>★ +' + o.jokersWon + ' coringa(s) guardado(s)!' : ''}<br>recorde: ${o.best.score.toLocaleString('pt-BR')} pts</p>
       <div class="row"><button id="again">Tentar de novo</button>${next ? '<button id="next" class="pri">Próxima fase ▶</button>' : ''}</div></div>`;
  $('again').onclick = reset;
  if (o.kind === 'win' && next) $('next').onclick = () => loadLevel(game.levelIndex + 1);
}

let lastHud = '';
/** Faixa fora da cena: tempo, referência, peças e estrelas (não fica atrás da bolinha). Chamada todo frame; só mexe no DOM se mudou. */
export function updateHud() {
  const sim = game.sim, o = game.outcome, win = o?.kind === 'win', L = game.level;
  const time = win ? o.time : sim ? sim.t : 0, got = sim ? sim.collected.filter(Boolean).length : 0;
  const html = `<span class="t ${win ? 'win' : ''}">⏱ ${time.toFixed(2)}s</span><span class="dim">referência ${L.par.toFixed(2)}s</span><span class="dim">🧩 ${game.pieces.length} · mínimo ${Math.max(1, L.solution.length)}</span><span class="st">${stars(got, L.stars.length)}</span>`;
  if (html !== lastHud) { $('hud').innerHTML = html; lastHud = html; }
}

export function openMenu() {
  const prog = store.load();
  $('menu').style.display = 'flex';
  $('levels').innerHTML = '';
  LEVELS.forEach((l, i) => {
    const r = prog[l.id], ok = unlocked(i), b = document.createElement('button');
    b.disabled = !ok;
    b.innerHTML = `<b>${l.id}</b><span>${l.name}</span><span class="st">${ok ? stars(r?.stars ?? 0, l.stars.length) : '🔒'}</span><span class="dim">${r ? r.score.toLocaleString('pt-BR') + ' pts' : ok ? '—' : ''}</span>`;
    b.onclick = () => { $('menu').style.display = 'none'; loadLevel(i); };
    $('levels').appendChild(b);
  });
}

export function bindUi() {
  $('play').onclick = play; $('reset').onclick = reset;
  $('rotL').onclick = () => rotate(-0.15); $('rotR').onclick = () => rotate(0.15); $('del').onclick = () => remove();
  $('menuBtn').onclick = openMenu; $('closeMenu').onclick = () => { $('menu').style.display = 'none'; };
}
