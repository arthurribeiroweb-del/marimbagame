import { game, frame, setOnChange, loadLevel, unlocked, play, place, reset } from './game';
import { LEVELS } from './levels';
import { draw, resize } from './render/draw';
import { bindInput } from './input/input';
import { audio } from './audio/marimba';
import { pollGamepad } from './input/gamepad';
import { bindUi, render, updateHud } from './ui/ui';
import { simulate } from './sim/world';

const cv = document.getElementById('cv') as HTMLCanvasElement;
setOnChange(render);
bindUi(); bindInput(cv, render);
new ResizeObserver(() => resize(cv)).observe(cv);   // acompanha qualquer mudança de layout (janela, faixa de HUD)

// começa na primeira fase ainda não liberada para o fim (ou a última)
loadLevel(Math.max(0, LEVELS.findIndex((_, i) => !unlocked(i + 1))));
resize(cv);

let last = performance.now();
const loop = (now: number) => { const dt = (now - last) / 1000; pollGamepad(dt); frame(dt); last = now; draw(cv); updateHud(); requestAnimationFrame(loop); };
requestAnimationFrame(loop);

// ganchos de teste no console (não fazem parte do jogo)
(window as unknown as Record<string, unknown>).__game = { game, audio, play, place, reset, simulate, loadLevel, frame, pollGamepad };
