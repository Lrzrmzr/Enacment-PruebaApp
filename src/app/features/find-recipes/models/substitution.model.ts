import { Ingredient } from './ingredient.model';

export type SubstitutionTag =
  | 'vegano'
  | 'sin-lactosa'
  | 'sin-gluten'
  | 'saludable'
  | 'económico';

/** Un sustituto posible para un ingrediente */
export interface SubstitutionEntry {
  /** Nombre del ingrediente sustituto (coincide con TheMealDB para imagen) */
  substituteIngredient: string;
  /** Etiqueta visible al usuario */
  label: string;
  /** Por qué usar este sustituto */
  description: string;
  /** Proporción de conversión */
  ratio: string;
  tags: SubstitutionTag[];
}

/** Grupo de sustituciones para un ingrediente seleccionado */
export interface SubstitutionSuggestion {
  originalIngredient: Ingredient;
  substitutes: SubstitutionEntry[];
}
