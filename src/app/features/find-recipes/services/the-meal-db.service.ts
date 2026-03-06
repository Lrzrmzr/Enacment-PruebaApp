import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of } from 'rxjs';

import {
  Ingredient,
  IngredientListResponse,
  Meal,
  MealFilterResponse,
} from '../models/ingredient.model';
import { MealDetail, MealDetailResponse } from '../models/meal-detail.model';

const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';
const IMG_BASE = 'https://www.themealdb.com/images/ingredients';

@Injectable({ providedIn: 'root' })
export class TheMealDbService {
  private http = inject(HttpClient);

  /** Devuelve todos los ingredientes disponibles en TheMealDB */
  getAllIngredients(): Observable<Ingredient[]> {
    return this.http
      .get<IngredientListResponse>(`${BASE_URL}/list.php?i=list`)
      .pipe(map((res) => res.meals ?? []));
  }

  /** Devuelve recetas que contienen UN ingrediente dado */
  getMealsByIngredient(ingredient: string): Observable<Meal[]> {
    return this.http
      .get<MealFilterResponse>(
        `${BASE_URL}/filter.php?i=${encodeURIComponent(ingredient)}`
      )
      .pipe(map((res) => res.meals ?? []));
  }

  /**
   * Devuelve recetas que contienen TODOS los ingredientes indicados.
   * Realiza una llamada por ingrediente (forkJoin) y calcula la intersección
   * por idMeal.
   */
  getMealsByIngredients(ingredients: string[]): Observable<Meal[]> {
    if (ingredients.length === 0) return of([]);
    if (ingredients.length === 1) return this.getMealsByIngredient(ingredients[0]);

    const requests = ingredients.map((i) => this.getMealsByIngredient(i));

    return forkJoin(requests).pipe(
      map((resultsPerIngredient) => {
        // Si algún ingrediente no tiene recetas, la intersección es vacía
        if (resultsPerIngredient.some((r) => r.length === 0)) return [];

        // Reducción: mantener solo las recetas presentes en TODOS los arrays
        return resultsPerIngredient.reduce((acc, meals) => {
          const ids = new Set(meals.map((m) => m.idMeal));
          return acc.filter((m) => ids.has(m.idMeal));
        });
      })
    );
  }

  /**
   * Devuelve el detalle completo de una receta (lookup.php?i=).
   * Incluye strIngredient1-20 y strMeasure1-20.
   */
  getMealById(idMeal: string): Observable<MealDetail | null> {
    return this.http
      .get<MealDetailResponse>(`${BASE_URL}/lookup.php?i=${idMeal}`)
      .pipe(map((res) => res.meals?.[0] ?? null));
  }

  /** URL de la miniatura del ingrediente (~48×48 px) */
  getIngredientThumbUrl(name: string): string {
    return `${IMG_BASE}/${encodeURIComponent(name)}-Small.png`;
  }
}
