export type PieceType = 'ramp' | 'bumper' | 'bat' | 'spring' | 'fan' | 'belt' | 'seesaw' | 'weight' | 'portal' | 'bomb' | 'magnet' | 'pendulum' | 'button' | 'glue';

/** Peça que o jogador colocou na cena. */
export interface Placed { type: PieceType; x: number; y: number; a: number; note: number }

export interface FixedBar { x: number; y: number; a: number; len: number; h?: number }

/** Uma fase é só dados: ver src/levels/*.json. */
export interface Level {
  id: number;
  name: string;
  ball: { x: number; y: number };
  bucket: { x: number; y: number; w: number };
  fixed: FixedBar[];
  /** gangorras que já fazem parte da fase (ex.: catapulta); pivô em x,y */
  /** portões da fase: fechados até a bola acionar um botão */
  doors?: FixedBar[];
  seesaws?: { x: number; y: number; a: number }[];
  /** estrelas coletáveis: pegar 1-3 vale mais pontos */
  stars: { x: number; y: number }[];
  inventory: Partial<Record<PieceType, number>>;
  /** tempo de referência (s) e a montagem que o produz; gerados por `npm run solve -- <id>` */
  /** peças que a solução de referência precisa usar (a fase existe para ensinar elas) */
  requires?: PieceType[];
  par: number;
  solution: { type: PieceType; x: number; y: number; a: number }[];
}
