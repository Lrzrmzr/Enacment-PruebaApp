import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TheMealDbService } from '../find-recipes/services/the-meal-db.service';
import {
  MealDetail,
  ShoppingListItem,
} from '../find-recipes/models/meal-detail.model';

@Component({
  selector: 'app-shopping-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './shopping-list.component.html',
  styleUrl: './shopping-list.component.scss',
})
export class ShoppingListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private mealDb = inject(TheMealDbService);
  private destroyRef = inject(DestroyRef);

  // ── Signals ────────────────────────────────────────────────────────────────
  mealName = signal('');
  mealThumb = signal('');
  mealCategory = signal('');
  items = signal<ShoppingListItem[]>([]);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  // ── Computed ───────────────────────────────────────────────────────────────
  checkedCount = computed(() => this.items().filter((i) => i.checked).length);
  totalCount = computed(() => this.items().length);
  progressPercent = computed(() =>
    this.totalCount() === 0
      ? 0
      : Math.round((this.checkedCount() / this.totalCount()) * 100)
  );
  allChecked = computed(
    () => this.totalCount() > 0 && this.checkedCount() === this.totalCount()
  );
  pendingCount = computed(() => this.totalCount() - this.checkedCount());

  // ── Init ───────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const idMeal = this.route.snapshot.paramMap.get('idMeal');
    if (!idMeal) {
      this.errorMessage.set('No se especificó ninguna receta.');
      return;
    }
    this.loadMeal(idMeal);
  }

  private loadMeal(idMeal: string): void {
    this.isLoading.set(true);
    this.mealDb
      .getMealById(idMeal)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (meal) => {
          if (!meal) {
            this.errorMessage.set('Receta no encontrada.');
            this.isLoading.set(false);
            return;
          }
          this.mealName.set(meal.strMeal);
          this.mealThumb.set(meal.strMealThumb);
          this.mealCategory.set(meal.strCategory ?? '');
          this.items.set(this.extractItems(meal));
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('Error al cargar la receta. Intenta de nuevo.');
          this.isLoading.set(false);
        },
      });
  }

  /** Extrae los pares strIngredient/strMeasure (1–20) no vacíos */
  private extractItems(meal: MealDetail): ShoppingListItem[] {
    const items: ShoppingListItem[] = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      if (ingredient?.trim()) {
        items.push({
          ingredient: ingredient.trim(),
          measure: measure?.trim() || '',
          checked: false,
        });
      }
    }
    return items;
  }

  // ── Acciones de checklist ──────────────────────────────────────────────────
  toggleItem(index: number): void {
    this.items.update((list) =>
      list.map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item
      )
    );
  }

  toggleAll(): void {
    const next = !this.allChecked();
    this.items.update((list) => list.map((i) => ({ ...i, checked: next })));
  }

  clearChecked(): void {
    this.items.update((list) => list.map((i) => ({ ...i, checked: false })));
  }

  // ── Exportar ───────────────────────────────────────────────────────────────
  exportText(): void {
    const separator = '─'.repeat(38);
    const lines = [
      `🛒 LISTA DE COMPRAS`,
      `📋 ${this.mealName()}`,
      separator,
      ...this.items().map(
        (item) =>
          `${item.checked ? '[✓]' : '[ ]'}  ${item.measure ? item.measure + '  ' : ''}${item.ingredient}`
      ),
      separator,
      `Progreso: ${this.checkedCount()}/${this.totalCount()} ingredientes`,
    ];

    const blob = new Blob([lines.join('\n')], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lista-${this.mealName().replace(/\s+/g, '-').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  exportPdf(): void {
    window.print();
  }
}
