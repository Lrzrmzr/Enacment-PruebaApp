import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { TheMealDbService } from '../../services/the-meal-db.service';
import { FindRecipesStateService } from '../../services/find-recipes-state.service';
import { Ingredient } from '../../models/ingredient.model';

@Component({
  selector: 'app-ingredient-search',
  standalone: true,
  imports: [],
  templateUrl: './ingredient-search.component.html',
  styleUrl: './ingredient-search.component.scss',
})
export class IngredientSearchComponent implements OnInit {
  private mealDbService = inject(TheMealDbService);
  private destroyRef = inject(DestroyRef);
  readonly state = inject(FindRecipesStateService);

  // ── Signals locales (UI de búsqueda) ──────────────────────────────────────
  allIngredients = signal<Ingredient[]>([]);
  searchQuery = signal('');
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  /** Lista filtrada: máximo 15 resultados, solo si hay query */
  filteredIngredients = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return [];
    return this.allIngredients()
      .filter((i) => i.strIngredient.toLowerCase().includes(query))
      .slice(0, 15);
  });

  // ── RxJS: canal de búsqueda con debounce ───────────────────────────────────
  private searchInput$ = new Subject<string>();

  ngOnInit(): void {
    // Conectar Subject → signal con debounce
    this.searchInput$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((query) => this.searchQuery.set(query));

    // Cargar todos los ingredientes una sola vez
    this.isLoading.set(true);
    this.mealDbService
      .getAllIngredients()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ingredients) => {
          this.allIngredients.set(ingredients);
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('No se pudo cargar la lista de ingredientes.');
          this.isLoading.set(false);
        },
      });
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  onSearchInput(event: Event): void {
    this.searchInput$.next((event.target as HTMLInputElement).value);
  }

  getThumbUrl(name: string): string {
    return this.mealDbService.getIngredientThumbUrl(name);
  }
}
