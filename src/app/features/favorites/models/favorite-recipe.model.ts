import { Timestamp, QueryDocumentSnapshot } from '@angular/fire/firestore';

export interface FavoriteRecipe {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  /** Estimación calórica calculada al momento de guardar */
  estimatedKcal: number;
  /** Tiempo estimado en minutos calculado al momento de guardar */
  estimatedMinutes: number;
  savedAt: Timestamp;
  /** UID del usuario (anónimo o autenticado) */
  userId: string;
}

/** Entrada para guardar un favorito (campos del servidor se añaden en el servicio) */
export type FavoriteRecipeInput = Omit<FavoriteRecipe, 'savedAt' | 'userId'>;

/** Resultado de una página de favoritos */
export interface FavoritesPage {
  items: FavoriteRecipe[];
  lastSnap: QueryDocumentSnapshot<FavoriteRecipe> | null;
  hasMore: boolean;
}
