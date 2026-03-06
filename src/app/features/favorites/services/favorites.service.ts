import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import { Auth, authState, signInAnonymously } from '@angular/fire/auth';
import {
  Firestore,
  CollectionReference,
  QueryDocumentSnapshot,
  Timestamp,
  collection,
  collectionData,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  startAfter,
} from '@angular/fire/firestore';
import { Observable, from, of, switchMap, map, filter, take } from 'rxjs';

import {
  FavoriteRecipe,
  FavoriteRecipeInput,
  FavoritesPage,
} from '../models/favorite-recipe.model';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private injector = inject(Injector);

  // authState$ creado en contexto de inyección (al instanciar el servicio)
  private authState$ = authState(this.auth);

  readonly PAGE_SIZE = 12;

  constructor() {
    // Auto sign-in anónimo si no hay usuario activo.
    // Cuando se integre Auth real, esta línea se elimina.
    this.authState$
      .pipe(
        take(1),
        filter((user) => user === null),
        switchMap(() => from(signInAnonymously(this.auth)))
      )
      .subscribe({
        error: (e) => console.warn('[FavoritesService] signInAnonymously falló:', e),
      });
  }

  // ── Helpers privados ───────────────────────────────────────────────────────

  /** Emite el UID del usuario actual (espera hasta que haya sesión) */
  private userId$(): Observable<string> {
    return this.authState$.pipe(
      filter((u): u is NonNullable<typeof u> => u !== null),
      take(1),
      map((u) => u.uid)
    );
  }

  private recipesCol(uid: string): CollectionReference<FavoriteRecipe> {
    return collection(
      this.firestore,
      `Favoritos/${uid}/recetas`
    ) as CollectionReference<FavoriteRecipe>;
  }

  // ── API pública ────────────────────────────────────────────────────────────

  /**
   * Guarda una receta en Firestore.
   * Usa el `idMeal` como ID del documento para evitar duplicados.
   */
  add(input: FavoriteRecipeInput): Observable<void> {
    return this.userId$().pipe(
      switchMap((uid) => {
        const docRef = doc(this.recipesCol(uid), input.idMeal);
        const data: FavoriteRecipe = {
          ...input,
          savedAt: Timestamp.now(),
          userId: uid,
        };
        return from(setDoc(docRef, data));
      })
    );
  }

  /** Elimina una receta de favoritos por su idMeal */
  remove(idMeal: string): Observable<void> {
    return this.userId$().pipe(
      switchMap((uid) =>
        from(deleteDoc(doc(this.recipesCol(uid), idMeal)))
      )
    );
  }

  /**
   * Carga una página de favoritos ordenada por fecha de guardado (desc).
   * Pasa `lastSnap` para obtener la siguiente página (paginación por cursor).
   */
  getPage(lastSnap?: QueryDocumentSnapshot<FavoriteRecipe>): Observable<FavoritesPage> {
    return this.userId$().pipe(
      switchMap((uid) => {
        const col = this.recipesCol(uid);
        const q = lastSnap
          ? query(col, orderBy('savedAt', 'desc'), startAfter(lastSnap), limit(this.PAGE_SIZE))
          : query(col, orderBy('savedAt', 'desc'), limit(this.PAGE_SIZE));

        return from(getDocs(q)).pipe(
          map((snapshot) => ({
            items: snapshot.docs.map((d) => d.data()),
            lastSnap: (snapshot.docs.at(-1) ?? null) as QueryDocumentSnapshot<FavoriteRecipe> | null,
            hasMore: snapshot.docs.length === this.PAGE_SIZE,
          }))
        );
      })
    );
  }

  /**
   * Observable reactivo de TODOS los favoritos del usuario.
   * Ideal para sincronizar el ícono de favorito en el grid de RecipeFinderComponent.
   */
  getAllLive(): Observable<FavoriteRecipe[]> {
    return this.authState$.pipe(
      switchMap((user) => {
        if (!user) return of([]);
        const col = this.recipesCol(user.uid);
        return runInInjectionContext(this.injector, () =>
          collectionData(query(col, orderBy('savedAt', 'desc')))
        ) as Observable<FavoriteRecipe[]>;
      })
    );
  }
}
