import {
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take } from 'rxjs';

import { FavoritesService } from './services/favorites.service';
import { FavoriteRecipe, FavoritesPage } from './models/favorite-recipe.model';
import { QueryDocumentSnapshot } from '@angular/fire/firestore';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './favorites.component.html',
  styleUrl: './favorites.component.scss',
})
export class FavoritesComponent {
  private favoritesService = inject(FavoritesService);
  private zone = inject(NgZone);
  private destroyRef = inject(DestroyRef);

  // ── Señal del elemento centinela (para IntersectionObserver) ───────────────
  private sentinel = viewChild<ElementRef<HTMLDivElement>>('sentinel');
  private observer: IntersectionObserver | null = null;
  private lastSnap: QueryDocumentSnapshot<FavoriteRecipe> | null = null;

  // ── Signals de estado ──────────────────────────────────────────────────────
  favorites = signal<FavoriteRecipe[]>([]);
  isLoading = signal(true);
  isLoadingMore = signal(false);
  hasMore = signal(false);
  errorMessage = signal<string | null>(null);
  /** IDs de ítems en proceso de eliminación (para feedback visual) */
  removingIds = signal<Set<string>>(new Set());

  constructor() {
    // Limpieza del observer al destruir el componente
    this.destroyRef.onDestroy(() => this.observer?.disconnect());

    // Configura el IntersectionObserver cuando el centinela esté en el DOM
    effect(() => {
      const el = this.sentinel()?.nativeElement;
      if (el && !this.observer) {
        this.setupObserver(el);
      }
    });

    // Carga inicial
    this.loadPage();
  }

  // ── IntersectionObserver ───────────────────────────────────────────────────
  private setupObserver(el: HTMLElement): void {
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && this.hasMore() && !this.isLoadingMore()) {
          this.zone.run(() => this.loadMore());
        }
      },
      { rootMargin: '200px', threshold: 0 }
    );
    this.observer.observe(el);
  }

  // ── Carga de datos ─────────────────────────────────────────────────────────
  private loadPage(): void {
    this.isLoading.set(true);

    this.favoritesService
      .getPage()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page: FavoritesPage) => {
          this.favorites.set(page.items);
          this.lastSnap = page.lastSnap;
          this.hasMore.set(page.hasMore);
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set(
            'Error al cargar favoritos. Verifica la configuración de Firebase.'
          );
          this.isLoading.set(false);
        },
      });
  }

  loadMore(): void {
    if (!this.hasMore() || this.isLoadingMore() || !this.lastSnap) return;

    this.isLoadingMore.set(true);

    this.favoritesService
      .getPage(this.lastSnap)
      .pipe(take(1))
      .subscribe({
        next: (page: FavoritesPage) => {
          this.favorites.update((current) => [...current, ...page.items]);
          this.lastSnap = page.lastSnap;
          this.hasMore.set(page.hasMore);
          this.isLoadingMore.set(false);
        },
        error: () => this.isLoadingMore.set(false),
      });
  }

  // ── Acciones ───────────────────────────────────────────────────────────────
  /**
   * Eliminación optimista: remueve de la UI de inmediato y confirma con Firestore.
   * Si hay error, revierte el ítem a su posición original.
   */
  removeFavorite(idMeal: string): void {
    const removed = this.favorites().find((f) => f.idMeal === idMeal);
    this.removingIds.update((ids) => new Set([...ids, idMeal]));
    this.favorites.update((list) => list.filter((f) => f.idMeal !== idMeal));

    this.favoritesService
      .remove(idMeal)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.removingIds.update((ids) => {
            const next = new Set(ids);
            next.delete(idMeal);
            return next;
          });
        },
        error: () => {
          // Rollback: reinserta en orden descendente por savedAt
          if (removed) {
            this.favorites.update((list) =>
              [...list, removed].sort(
                (a, b) => b.savedAt.toMillis() - a.savedAt.toMillis()
              )
            );
          }
          this.removingIds.update((ids) => {
            const next = new Set(ids);
            next.delete(idMeal);
            return next;
          });
        },
      });
  }

  isRemoving(idMeal: string): boolean {
    return this.removingIds().has(idMeal);
  }

  getMealDetailUrl(idMeal: string): string {
    return `https://www.themealdb.com/meal/${idMeal}`;
  }

  formatDate(savedAt: { toDate(): Date }): string {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(savedAt.toDate());
  }
}
