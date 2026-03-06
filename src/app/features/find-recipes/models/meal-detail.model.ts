/**
 * Detalle completo de una receta de TheMealDB (lookup.php?i=)
 * Los campos strIngredient1-20 y strMeasure1-20 se modelan con index signature.
 */
export interface MealDetail {
  idMeal: string;
  strMeal: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strMealThumb: string;
  strTags: string | null;
  strYoutube: string | null;
  strSource: string | null;
  [key: string]: string | null | undefined;
}

export interface MealDetailResponse {
  meals: MealDetail[] | null;
}

/** Ítem de la lista de compras generado a partir de un MealDetail */
export interface ShoppingListItem {
  ingredient: string;
  measure: string;
  checked: boolean;
}
