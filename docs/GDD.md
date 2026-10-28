# GDD — Jogo de Física com Marimba (nome provisório)

## Conceito
Puzzle de física estilo The Incredible Machine. Uma bolinha sai do ponto A e precisa cair num balde no ponto B. O jogador posiciona peças de um inventário limitado, aperta Play e a física resolve. Cada peça que a bolinha toca emite uma nota de marimba: a solução da fase vira uma melodia.

## Pilares
1. **Previsível, nunca aleatório.** A mesma montagem dá sempre o mesmo resultado.
2. **Reação em cadeia.** A graça é um elo acionar o próximo (taco -> trampolim -> balde).
3. **Música é feedback.** Som a cada toque; a fase resolvida soa bem.
4. **Várias soluções.** O inventário limita, mas não dita um único caminho.

## Loop da fase
1. Vê bolinha, balde e obstáculos fixos.
2. Arrasta peças do inventário para a cena (posição + rotação).
3. Play. Se falhar, Reset e ajusta (peças ficam no lugar).
4. Vitória: bolinha no balde. Estrelas: (1) passou, (2) poucas peças, (3) coletou item opcional.

## Peças (introduzir 1 nova a cada 3-5 fases)
| Peça | Regra |
|---|---|
| Rampa / barra | Superfície fixa, ângulo livre. |
| Trampolim (bumper) | Devolve a bola com mais energia. |
| Elástico / estilingue | Acumula e lança. |
| Taco automático | Bate em intervalo fixo; o timing é o puzzle. |
| Esteira | Empurra a bola em uma direção. |
| Ventilador / ímã / gelo / portal | Fases avançadas. |

Cada peça tem uma nota; a escala é pentatônica para sempre soar musical.

## Progressão
- Fases 1-5: uma peça, solução óbvia (tutorial disfarçado).
- 6-15: duas a três peças, ângulo e timing importam.
- 16+: obstáculos móveis, dois baldes, inventário apertado.

## Escopo v1
Navegador (desktop + toque). Fases criadas só por nós, ~30. Visual minimalista (cores sólidas, formas simples). Salvar progresso local.

## Fora do v1
Fases de usuários, ranking online, Steam/app nativo.

## Riscos
- Física caótica demais frustra -> bola leve, pouco atrito, sem aleatoriedade.
- Fase sem solução -> toda fase é testada com solução gravada.
