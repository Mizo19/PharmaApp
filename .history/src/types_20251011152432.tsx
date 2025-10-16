// src/types.ts
export type Medicine = {
  id?: number;
  code?: string;
  nom_medicament?: string;
  forme?: string;
  ppv?: number;
  presentation?: string;
  datE_PER?: string; // MMYYYY
  quantite?: number;
};
