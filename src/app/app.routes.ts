import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'buscar',
    loadComponent: () =>
      import('./features/find-recipes/components/recipe-finder/recipe-finder.component').then(
        (m) => m.RecipeFinderComponent
      ),
  },
  {
    path: 'lista-compras/:idMeal',
    loadComponent: () =>
      import('./features/shopping-list/shopping-list.component').then(
        (m) => m.ShoppingListComponent
      ),
  },
  {
    path: 'favoritos',
    loadComponent: () =>
      import('./features/favorites/favorites.component').then(
        (m) => m.FavoritesComponent
      ),
  },
  { path: '', redirectTo: 'buscar', pathMatch: 'full' },
];
