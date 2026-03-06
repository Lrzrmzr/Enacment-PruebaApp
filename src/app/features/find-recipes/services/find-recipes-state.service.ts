import { Injectable, computed, signal } from '@angular/core';
import { Ingredient } from '../models/ingredient.model';

@Injectable({ providedIn: 'root' })
export class FindRecipesStateService {
  readonly MIN = 2;
  readonly MAX = 5;

  // ── Estado compartido ──────────────────────────────────────────────────────
  selectedIngredients = signal<Ingredient[]>([]);

  // ── Derivados ──────────────────────────────────────────────────────────────
  canSearch = computed(() => {
    const n = this.selectedIngredients().length;
    return n >= this.MIN && n <= this.MAX;
  });

  canAddMore = computed(() => this.selectedIngredients().length < this.MAX);

  selectionCount = computed(() => this.selectedIngredients().length);

  // ── Mutaciones ─────────────────────────────────────────────────────────────
  add(ingredient: Ingredient): void {
    if (!this.canAddMore() || this.isSelected(ingredient)) return;
    this.selectedIngredients.update((list) => [...list, ingredient]);
  }

  remove(ingredient: Ingredient): void {
    this.selectedIngredients.update((list) =>
      list.filter((i) => i.idIngredient !== ingredient.idIngredient)
    );
  }

  isSelected(ingredient: Ingredient): boolean {
    return this.selectedIngredients().some(
      (i) => i.idIngredient === ingredient.idIngredient
    );
  }

  /**
   * Reemplaza un ingrediente por un sustituto manteniendo su posición en la lista.
   */
  replace(original: Ingredient, substitute: Ingredient): void {
    this.selectedIngredients.update((list) =>
      list.map((i) =>
        i.idIngredient === original.idIngredient ? substitute : i
      )
    );
  }
}
