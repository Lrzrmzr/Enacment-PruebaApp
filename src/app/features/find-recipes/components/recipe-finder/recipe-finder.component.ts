import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, map, of, switchMap, take, tap } from 'rxjs';

import { FindRecipesStateService } from '../../services/find-recipes-state.service';
import { TheMealDbService } from '../../services/the-meal-db.service';
import { FavoritesService } from '../../../favorites/services/favorites.service';
import { IngredientSearchComponent } from '../ingredient-search/ingredient-search.component';
import { SubstitutionPanelComponent } from '../substitution-panel/substitution-panel.component';
import { Meal, RecipeCard } from '../../models/ingredient.model';

@Component({
  selector: 'app-recipe-finder',
  standalone: true,
  imports: [IngredientSearchComponent, SubstitutionPanelComponent, RouterLink],
  templateUrl: './recipe-finder.component.html',
  styleUrl: './recipe-finder.component.scss',
})
export class RecipeFinderComponent {
  readonly state = inject(FindRecipesStateService);
  private mealDb = inject(TheMealDbService);
  private favoritesService = inject(FavoritesService);

  // ── Signals ────────────────────────────────────────────────────────────────
  recipes = signal<RecipeCard[]>([]);
  isSearching = signal(false);
  searchError = signal<string | null>(null);
  hasSearched = signal(false);

  /**
   * Set reactivo de IDs favoritos obtenido desde Firestore (getAllLive).
   * Se actualiza automáticamente cuando el usuario guarda/elimina favoritos.
   */
  private favoriteIds = toSignal(
    this.favoritesService.getAllLive().pipe(
      map((favs) => new Set(favs.map((f) => f.idMeal)))
    ),
    { initialValue: new Set<string>() }
  );

  // ── RxJS: pipeline de búsqueda con cancelación automática (switchMap) ──────
  private searchTrigger$ = new Subject<string[]>();

  constructor() {
    this.searchTrigger$
      .pipe(
        tap(() => {
          this.isSearching.set(true);
          this.searchError.set(null);
          this.hasSearched.set(true);
          this.recipes.set([]);
        }),
        switchMap((ingredients) =>
          this.mealDb.getMealsByIngredients(ingredients).pipe(
            catchError(() => {
              this.searchError.set('Error al buscar recetas. Intenta de nuevo.');
              return of([] as Meal[]);
            })
          )
        ),
        tap(() => this.isSearching.set(false)),
        takeUntilDestroyed()
      )
      .subscribe((meals) => {
        const ingredientCount = this.state.selectedIngredients().length;
        const cards: RecipeCard[] = meals.map((m) => ({
          ...m,
          estimatedKcal: this.calcKcal(m.idMeal, ingredientCount),
          estimatedMinutes: this.calcMinutes(m.idMeal, ingredientCount),
        }));
        this.recipes.set(cards);
      });
  }

  // ── Acciones ───────────────────────────────────────────────────────────────
  searchRecipes(): void {
    if (!this.state.canSearch()) return;
    this.searchTrigger$.next(
      this.state.selectedIngredients().map((i) => i.strIngredient)
    );
  }

  isFavorite(idMeal: string): boolean {
    return this.favoriteIds().has(idMeal);
  }

  toggleFavorite(recipe: RecipeCard): void {
    if (this.isFavorite(recipe.idMeal)) {
      this.favoritesService.remove(recipe.idMeal).pipe(take(1)).subscribe();
    } else {
      this.favoritesService
        .add({
          idMeal: recipe.idMeal,
          strMeal: recipe.strMeal,
          strMealThumb: recipe.strMealThumb,
          estimatedKcal: recipe.estimatedKcal,
          estimatedMinutes: recipe.estimatedMinutes,
        })
        .pipe(take(1))
        .subscribe();
    }
  }

  getMealDetailUrl(idMeal: string): string {
    return `https://www.themealdb.com/meal/${idMeal}`;
  }

  // ── Estimaciones deterministas por idMeal ──────────────────────────────────
  private calcKcal(idMeal: string, ingredientCount: number): number {
    const base = 300 + (ingredientCount - 2) * 75;
    const variance = parseInt(idMeal.slice(-2), 10) % 100;
    return base + variance;
  }

  private calcMinutes(idMeal: string, ingredientCount: number): number {
    const base = 25 + (ingredientCount - 2) * 5;
    const variance = (parseInt(idMeal.slice(-1), 10) % 6) * 3;
    return base + variance;
  }
}
