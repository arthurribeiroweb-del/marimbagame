# Arquitetura (estado atual — etapa 2)

## Stack
TypeScript + Vite · Planck.js (Box2D) · Canvas 2D · Web Audio. Distribuição: web; mobile (Capacitor) e desktop (Tauri) depois.

## Comandos
```
npm run dev          # servidor local em :8765
npm test             # vitest: soluções das fases, determinismo
npm run build        # tsc + vite build
npm run solve -- N 60  # busca automática da melhor montagem da fase N (grava par e solution no JSON)
```

## Estrutura
```
src/
  types.ts        Level, Placed, PieceType
  sim/world.ts    simulação pura (sem DOM): createSim, simulate. Passo fixo 1/60, determinística
  pieces/defs.ts  DEFS: cada peça é DADOS (forma, cor, restituição, ícone). Peça nova = nova entrada
  levels/         level1..N.json + index.ts (ordem). Fase nova = JSON + 1 linha
  audio/          scale.ts (pentatônica), marimba.ts (sintetizador)
  game.ts         estado + ações (pick/place/rotate/play/reset/frame), pontuação, salvar progresso
  storage.ts      progresso em localStorage
  render/draw.ts  tudo que é canvas
  input/input.ts  mouse + toque (pointer events) e teclado
  ui/ui.ts        barra lateral, menu de fases, tela de resultado
tools/solve.ts    busca aleatória + hill-climb da melhor montagem
tests/            soluções gravadas de cada fase têm que vencer no tempo `par`
```

## Regras que evitam retrabalho
1. **Simulação separada do desenho.** `sim/` não conhece DOM; mesma montagem = mesmo resultado em qualquer aparelho, e roda em Node (testes e solver).
2. **Peças orientadas a dados** (`pieces/defs.ts`): física, desenho, ícone e seleção saem da mesma definição.
3. **Fases em JSON** com `solution` e `par` gerados por `npm run solve`. Os testes quebram se a física mudar e a fase deixar de ser resolvível.
4. **Eventos da sim viram som/efeito** por callbacks (`hit`, `star`), sem a física chamar o áudio.

## Pontuação
`1000 (vitória) + 1000 × estrelas coletadas + até 500 de bônus de tempo (500 × min(1, par/tempo))`. Recorde por fase em localStorage.

## Pendências conhecidas
- O solver é aleatório + hill-climb: `par` é uma boa referência, não um ótimo provado.
- Editor de fases (etapa 3) ainda não existe.
