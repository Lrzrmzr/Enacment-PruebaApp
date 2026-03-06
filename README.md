# Recetario por Ingredientes

Aplicación web que permite ingresar entre 2 y 5 ingredientes y obtener una lista de recetas que los contengan, con estimación calórica básica, sugerencias de sustitución, lista de compras interactiva y favoritos persistidos en Firestore.

---

## Reto elegido y alcance

**Reto**: Recetario por ingredientes (calorías y gráfica simple)

**Objetivo**: El usuario ingresa entre 2 y 5 ingredientes y obtiene las recetas de TheMealDB que los contengan todos, con una estimación calórica determinista por receta.

**Supuestos asumidos**:
- La estimación calórica es aproximada: no existe una fuente de datos calóricos por ingrediente en la API gratuita de TheMealDB, por lo que se calcula una base ajustada por número de ingredientes más una varianza determinista derivada del `idMeal`. Es consistente entre sesiones para la misma receta.
- La intersección de ingredientes es estricta: si ninguna receta contiene los 5 ingredientes seleccionados, la lista aparece vacía. Esto es correcto por diseño y refleja la realidad de la API.
- La autenticación es anónima: Firestore asocia los favoritos a un UID anónimo generado automáticamente. La migración a auth real está preparada en reglas y código.
- Los "toques adicionales" elegidos fueron **sustituciones sugeridas** y **lista de compras** (se implementaron ambos).

---

## Comandos de inicio rápido

```bash
# Clonar el repositorio
git clone https://github.com/Lrzrmzr/Enacment-PruebaApp.git
cd recetario

# Instalar dependencias
npm install --legacy-peer-deps

# Crear las credenciales locales (no están en el repo)
cp src/environments/environment.ts src/environments/environment.development.ts
cp src/environments/environment.ts src/environments/environment.prod.ts
# Editar ambos archivos con las claves reales de Firebase

# Servidor de desarrollo
ng serve

# Build de producción
ng build

# Tests
ng test
```

> `--legacy-peer-deps` es necesario porque `@angular/fire@21.0.0-rc.0` es una RC y aún no declara compatibilidad formal con Angular 21 en su `peerDependencies`.

---

## Arquitectura y dependencias

### Stack

| Tecnología | Versión | Rol |
|---|---|---|
| Angular | 21.2.0 | Framework principal (standalone, sin NgModule) |
| @angular/fire | 21.0.0-rc.0 | SDK de Firebase para Angular |
| Firebase | ^12.4.0 | Backend (Firestore + Auth anónimo) |
| TypeScript | ~5.9.2 | Lenguaje |
| RxJS | ~7.8.0 | Programación reactiva |
| SCSS | — | Estilos |
| Vitest | — | Test runner |

### Diagrama de módulos (texto)

```
App (bootstrapApplication)
│
├── app.config.ts          ← provideRouter, provideHttpClient(withFetch), provideFirebaseApp, provideFirestore, provideAuth
│
├── /buscar  ──────────────── RecipeFinderComponent (lazy)
│   ├── IngredientSearchComponent
│   │     └── FindRecipesStateService   ← estado compartido (signal)
│   ├── SubstitutionPanelComponent
│   │     └── SubstitutionService       ← mapa estático, matching multinivel
│   └── TheMealDbService                ← HTTP a TheMealDB (forkJoin + intersección)
│         └── FavoritesService          ← Firestore CRUD + Auth anónimo
│
├── /favoritos ─────────────── FavoritesComponent (lazy)
│   └── FavoritesService (paginación cursor, IntersectionObserver)
│
└── /lista-compras/:idMeal ─── ShoppingListComponent (lazy)
      └── TheMealDbService (getMealById → strIngredient1-20)
```

### Servicios principales

| Servicio | Responsabilidad |
|---|---|
| `TheMealDbService` | Wrapper HTTP sobre TheMealDB: lista de ingredientes, filtro por ingrediente, intersección por `forkJoin`, detalle de receta |
| `FindRecipesStateService` | Estado global de ingredientes seleccionados (signals, MIN=2, MAX=5, replace para sustituciones) |
| `SubstitutionService` | Mapa estático de sustituciones con matching exacto / substring / por palabras |
| `FavoritesService` | CRUD en Firestore, auth anónima, paginación por cursor, observable reactivo `getAllLive()` |

---

## Modelo de datos

### Firestore — colección `Favoritos`

```
Favoritos/
  {userId}/              ← UID anónimo o autenticado
    recetas/
      {idMeal}/          ← ID del documento = idMeal (evita duplicados)
        idMeal:           string
        strMeal:          string
        strMealThumb:     string
        estimatedKcal:    number
        estimatedMinutes: number
        savedAt:          Timestamp
        userId:           string
```

**Índices**: la consulta `orderBy('savedAt', 'desc')` con paginación por cursor requiere el índice compuesto `(savedAt DESC)`, que Firestore crea automáticamente en la primera ejecución.

**Reglas resumidas** (`firestore.rules`):
```
match /Favoritos/{userId}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
// Todo lo demás: denegado por defecto
```

---

## Estado y navegación

### Estrategia de estado

- **Signals de Angular** como fuente de verdad para estado local y compartido entre componentes del mismo feature.
- `FindRecipesStateService` es un servicio `providedIn: 'root'` con un signal `selectedIngredients`. Actúa como store mínimo sin librerías externas.
- `toSignal()` convierte observables de Firestore en signals, manteniendo la consistencia reactiva en templates.
- El estado de favoritos es reactivo: `getAllLive()` emite cada vez que Firestore cambia; `RecipeFinderComponent` lo convierte a `Set<string>` para lookups O(1).

### Navegación y lazy-loading

Todas las rutas cargan sus componentes con `loadComponent()`:

| Ruta | Componente | Chunk |
|---|---|---|
| `/buscar` | `RecipeFinderComponent` | principal |
| `/favoritos` | `FavoritesComponent` | ~37 kB |
| `/lista-compras/:idMeal` | `ShoppingListComponent` | separado |
| `/` | redirect a `/buscar` | — |

---

## Decisiones técnicas

1. **Signals en lugar de BehaviorSubject para estado compartido**: Angular 21 tiene soporte de primera clase para signals. Son más simples de debuggear (no requieren `async` pipe ni `subscribe` manual), y `computed()` evita derivaciones manuales. Se optó por no introducir NgRx o Akita dado el tamaño del proyecto.

2. **`switchMap` para cancelar búsquedas concurrentes**: el pipeline de búsqueda en `RecipeFinderComponent` usa un `Subject` + `switchMap`. Si el usuario hace clic en "Buscar" mientras hay una petición en vuelo, la anterior se cancela automáticamente. Esto previene condiciones de carrera y respuestas fuera de orden.

3. **`forkJoin` + intersección client-side**: TheMealDB no tiene un endpoint de filtro múltiple. La estrategia es lanzar una petición por ingrediente en paralelo (`forkJoin`) y calcular la intersección por `idMeal` en el cliente. Es sencillo y funciona bien con 2–5 ingredientes; la limitación es que el número de peticiones crece linealmente con los ingredientes seleccionados.

4. **Estimación calórica determinista**: sin una API de nutrición, se generó una fórmula `base + (ingredientCount - 2) * 75 + (idMeal.slice(-2) % 100)`. Es reproducible entre sesiones para la misma receta y suficientemente variada visualmente para ser útil como referencia relativa.

5. **`runInInjectionContext` para AngularFire fuera del constructor**: `collectionData()` de AngularFire requiere contexto de inyección. Al llamarse dentro de `switchMap` (un operador RxJS que corre en tiempo de ejecución, no en inicialización), se inyectó `Injector` en el servicio y se envuelve la llamada con `runInInjectionContext()`, lo que es la solución oficial de Angular para este patrón.

---

## Escalabilidad y mantenimiento

- **Separación de capas**: servicios HTTP (`TheMealDbService`), servicios de estado (`FindRecipesStateService`), servicios de persistencia (`FavoritesService`) y servicios de dominio (`SubstitutionService`) son independientes. Se pueden reemplazar en aislamiento.
- **Migración a auth real**: el `FavoritesService` ya usa `authState()` y las reglas de Firestore validan `request.auth.uid == userId`. Agregar Google/email auth solo requiere cambiar `signInAnonymously` por el proveedor deseado; los datos de Firestore son inmediatamente compatibles.
- **Crecimiento del catálogo de sustituciones**: el mapa en `SubstitutionService` es un `Record<string, SubstitutionEntry[]>` tipado. Puede migrarse a un JSON externo o a una colección de Firestore sin cambiar la interfaz pública del servicio.
- **Paginación**: `FavoritesService.getPage()` implementa cursor-pagination (no offset), lo que es eficiente y escalable aunque el usuario tenga miles de favoritos.
- **Lazy-loading**: cada ruta es un chunk independiente. Agregar features nuevos no incrementa el bundle inicial.

---

## Seguridad y validaciones

- **Reglas de Firestore**: solo el propietario del UID puede leer o escribir su subcolección de favoritos. Todo el resto del árbol de documentos está bloqueado con `allow read, write: if false`.
- **Manejo de secretos**: las claves de Firebase **no están en el repositorio**. Los archivos `environment.development.ts` y `environment.prod.ts` están en `.gitignore`. Solo existe `environment.ts` como plantilla con placeholders. El historial de git fue reescrito con `filter-branch` para eliminar un commit que contenía claves reales.
- **API Key de Firebase**: las API keys de Firebase para web son inherentemente públicas (van en el bundle del navegador). La seguridad real recae en las Security Rules. Adicionalmente, la key está restringida por HTTP referrer en Google Cloud Console para prevenir uso desde orígenes no autorizados.
- **Inputs del usuario**: la búsqueda de ingredientes es client-side (filtro sobre la lista descargada de TheMealDB). No se construyen queries de Firestore a partir de input del usuario libre; el `idMeal` para favoritos viene de la API, no del usuario.
- **`encodeURIComponent`** en todas las URLs construidas hacia TheMealDB para prevenir inyección en query strings.

---

## Rendimiento

- **Ingredientes cargados una vez**: `getAllIngredients()` se llama al montar `IngredientSearchComponent` y el resultado se guarda en un signal. El filtro de búsqueda es client-side sobre esa lista en memoria, sin peticiones adicionales mientras el usuario escribe.
- **Debounce en búsqueda de ingredientes**: `IngredientSearchComponent` aplica debounce con RxJS antes de filtrar, evitando renders innecesarios en cada keystroke.
- **Peticiones agrupadas con `forkJoin`**: las N peticiones por ingrediente se lanzan en paralelo, no secuencialmente. El tiempo de respuesta es el del más lento, no la suma.
- **`switchMap` cancela peticiones obsoletas**: si el usuario lanza una segunda búsqueda antes de que termine la primera, la petición anterior se cancela (unsubscribe del observable HTTP).
- **Paginación por cursor en favoritos**: `FavoritesComponent` usa `IntersectionObserver` para cargar la siguiente página solo cuando el usuario llega al final de la lista. La página es de 12 elementos (`PAGE_SIZE = 12`).
- **Lazy-loading de chunks**: el bundle inicial solo contiene el AppComponent y el router; cada feature se descarga bajo demanda.

---

## Accesibilidad

- Los inputs de búsqueda tienen `placeholder` descriptivo y están asociados a su label visualmente.
- Los botones de acción (favorito, lista de compras) tienen texto visible o `aria-label` implícito en el contexto de la tarjeta.
- El progreso de la lista de compras se comunica visualmente con una barra de progreso y textualmente con el contador `(X/Y ingredientes)`.
- La lista de compras tiene versión imprimible (`@media print`) que oculta la navegación y muestra solo el contenido relevante.
- El contraste de colores sigue la paleta naranja definida en SCSS con valores hex fijos (se evitó `darken()`/`lighten()` de SCSS deprecados, usando `color-mix()` o valores fijos).
- La navegación por teclado funciona en todos los formularios e ítems de lista.

---

## Uso de IA

**Dónde se usó**: Claude (Anthropic) fue el asistente principal durante todo el desarrollo. Se usó para:

- **Arquitectura inicial**: definir la estructura de features, servicios y modelos antes de escribir la primera línea de código.
- **Generación de componentes y servicios**: scaffolding de `FavoritesService`, `SubstitutionService`, `ShoppingListComponent` y sus respectivos modelos y templates.
- **Tabla base de sustituciones**: el mapa `SUBSTITUTIONS` en `SubstitutionService` (~20 categorías de ingredientes con sustitutos, ratios y tags) fue generado con IA, revisado y ajustado manualmente para asegurar coherencia culinaria.
- **Estimación calórica**: la fórmula determinista `base + variance` fue propuesta y refinada con IA para que fuera reproducible sin una API externa.
- **Resolución de errores de AngularFire**: diagnóstico y corrección del warning de injection context en `collectionData()` y del error `auth/configuration-not-found`.
- **Limpieza de historial de git**: el flujo completo de `filter-branch` + `reflog expire` + `gc` + `force push` fue diseñado y ejecutado con asistencia de IA.

**Resumen de prompts**: los prompts fueron siempre en forma de contexto técnico preciso ("tenemos Angular 21 standalone, @angular/fire RC, necesito que...") más una instrucción concreta. Se evitó pedir "genera toda la app" y se fue feature por feature.

**Riesgos y mitigación**:
- *Riesgo*: el código generado puede no reflejar las APIs exactas de versiones muy recientes (Angular 21, @angular/fire RC). *Mitigación*: se validó cada snippet contra la documentación oficial y los errores de compilación del compilador de TypeScript antes de aceptarlo.
- *Riesgo*: la tabla de sustituciones es una aproximación culinaria, no una fuente médica o dietética. *Mitigación*: se añade como sugerencia, no como prescripción. El usuario puede ignorarla.

---

## Resumen de sesión de desarrollo

A continuación se listan los pasos principales ejecutados desde cero para construir el proyecto.

### Creación y configuración inicial

```bash
# Crear proyecto Angular 21
ng new recetario --standalone --routing --style=scss

# Instalar AngularFire (versión RC compatible con Angular 21)
npm install @angular/fire@21.0.0-rc.0 firebase --legacy-peer-deps

# Agregar configuración de Firebase en app.config.ts
# provideFirebaseApp + provideFirestore + provideAuth
```

### Estructura de environments

```bash
# environment.ts → plantilla con placeholders (commiteada)
# environment.development.ts → claves reales (en .gitignore)
# environment.prod.ts → claves reales (en .gitignore)
```

### Firebase Console — acciones manuales necesarias

1. Crear proyecto en [Firebase Console](https://console.firebase.google.com)
2. Habilitar **Firestore** en modo producción
3. Publicar las reglas de `firestore.rules`
4. Habilitar **Authentication → Sign-in method → Anónimo**
5. Restringir la API Key por HTTP referrer en [Google Cloud Console](https://console.cloud.google.com)

### Limpieza de historial de git

En un commit temprano se incluyó `environment.ts` con claves reales. Se eliminaron del historial completo:

```bash
# Reescribir todos los commits reemplazando environment.ts con placeholders
git filter-branch --force --tree-filter \
  'if [ -f src/environments/environment.ts ]; then cp /tmp/env_placeholder.ts src/environments/environment.ts; fi' \
  -- --all

# Limpiar refs del historial antiguo
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Publicar historial limpio
git push origin --force --all
```

### Corrección de warnings de AngularFire

`FavoritesService` fue actualizado para que `authState()` y `collectionData()` se ejecuten dentro del contexto de inyección:

- `authState$` se instancia como propiedad de clase (se ejecuta en injection context al crear el servicio)
- `collectionData()` dentro de `getAllLive()` se envuelve con `runInInjectionContext(this.injector, ...)`

### Despliegue (Firebase Hosting)

```bash
# Instalar Firebase CLI si no está instalado
npm install -g firebase-tools

# Login y configuración
firebase login
firebase init hosting

# Build + deploy
ng build
firebase deploy
```

---

## Limitaciones y siguientes pasos

**Limitaciones actuales**:
- La estimación calórica no es real: es una aproximación matemática sin datos nutricionales reales.
- La intersección de ingredientes depende de TheMealDB, que tiene cobertura limitada para combinaciones muy específicas. Es normal que aparezcan 0 resultados.
- La autenticación es anónima: si el usuario limpia su navegador, pierde sus favoritos.
- El mapa de sustituciones cubre ~20 ingredientes comunes; no es exhaustivo.

**Siguientes pasos naturales**:
- Integrar una API de nutrición real (Edamam, Nutritionix) para reemplazar la estimación calórica.
- Implementar autenticación con Google u otros proveedores para persistencia real de favoritos entre dispositivos.
- Agregar una barra visual (bar chart) de calorías por ingrediente seleccionado.
- Ampliar el mapa de sustituciones o migrarlo a Firestore para poder editarlo sin redespliegue.
- Agregar tests unitarios para `SubstitutionService` y `FindRecipesStateService` (la lógica de intersección y el matching multinivel son buenos candidatos).

---

## Nota personal

Este proyecto es la segunda vez que trabajo con Angular; la primera fue hace varios años, cuando el framework era bastante diferente (NgModule era obligatorio, los signals no existían). Retomar Angular 21 con arquitectura standalone fue un salto grande, y prácticamente todo el modelo mental de "cómo se estructura una app Angular" tuve que atualizarme con respecto a ello.

Firebase es nuevo para mí, aunque tengo experiencia con servicios similares (bases de datos en tiempo real y autenticación serverless en otros ecosistemas). La curva fue principalmente entender el SDK de AngularFire y sus particularidades con el contexto de inyección de Angular, no los conceptos de Firestore en sí.
