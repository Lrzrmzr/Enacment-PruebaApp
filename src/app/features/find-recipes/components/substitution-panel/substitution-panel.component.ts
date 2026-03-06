import { Component, computed, inject, signal } from '@angular/core';

import { FindRecipesStateService } from '../../services/find-recipes-state.service';
import { SubstitutionService } from '../../services/substitution.service';
import { TheMealDbService } from '../../services/the-meal-db.service';
import { Ingredient } from '../../models/ingredient.model';
import { SubstitutionEntry } from '../../models/substitution.model';

@Component({
  selector: 'app-substitution-panel',
  standalone: true,
  imports: [],
  templateUrl: './substitution-panel.component.html',
  styleUrl: './substitution-panel.component.scss',
})
export class SubstitutionPanelComponent {
  readonly state = inject(FindRecipesStateService);
  private substitutionService = inject(SubstitutionService);
  private mealDb = inject(TheMealDbService);

  // Panel abierto por defecto
  isOpen = signal(true);

  // ── Sugerencias reactivas: se recalculan al cambiar selectedIngredients ────
  suggestions = computed(() =>
    this.substitutionService.getSubstitutions(this.state.selectedIngredients())
  );

  hasSuggestions = computed(() => this.suggestions().length > 0);

  // ── Acciones ───────────────────────────────────────────────────────────────
  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  /**
   * Reemplaza el ingrediente original por el sustituto elegido.
   * Construye un objeto Ingredient sintético usando el nombre del sustituto
   * para que la imagen de TheMealDB cargue correctamente.
   */
  applySubstitute(original: Ingredient, entry: SubstitutionEntry): void {
    const substituteIngredient: Ingredient = {
      idIngredient: `sub-${entry.substituteIngredient.replace(/\s+/g, '-').toLowerCase()}`,
      strIngredient: entry.substituteIngredient,
      strDescription: entry.description,
      strThumb: this.mealDb.getIngredientThumbUrl(entry.substituteIngredient),
      strType: null,
    };
    this.state.replace(original, substituteIngredient);
  }

  getThumb(name: string): string {
    return this.mealDb.getIngredientThumbUrl(name);
  }
}
