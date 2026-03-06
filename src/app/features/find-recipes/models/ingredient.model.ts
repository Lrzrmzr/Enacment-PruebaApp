// ── Ingredient ────────────────────────────────────────────────────────────────

export interface Ingredient {
  idIngredient: string;
  strIngredient: string;
  strDescription: string | null;
  strThumb: string;
  strType: string | null;
}

export interface IngredientListResponse {
  meals: Ingredient[];
}

// ── Meal ──────────────────────────────────────────────────────────────────────

export interface Meal {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
}

export interface MealFilterResponse {
  meals: Meal[] | null;
}

// ── RecipeCard (Meal + estimaciones calculadas) ───────────────────────────────

export interface RecipeCard extends Meal {
  estimatedKcal: number;
  estimatedMinutes: number;
}
