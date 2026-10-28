const PENTA = [0, 2, 4, 7, 9];   // pentatônica maior: qualquer combinação soa musical

/** i-ésima nota da escala, em semitons acima do dó central. */
export const noteOf = (i: number) => PENTA[i % 5] + 12 * Math.floor(i / 5);
