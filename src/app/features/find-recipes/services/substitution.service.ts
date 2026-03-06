import { Injectable } from '@angular/core';
import { Ingredient } from '../models/ingredient.model';
import {
  SubstitutionEntry,
  SubstitutionSuggestion,
} from '../models/substitution.model';

@Injectable({ providedIn: 'root' })
export class SubstitutionService {

  // ── Mapa de sustituciones ──────────────────────────────────────────────────
  private readonly SUBSTITUTIONS: Record<string, SubstitutionEntry[]> = {

    // ── Lácteos ───────────────────────────────────────────────────────────────
    milk: [
      {
        substituteIngredient: 'Almond Milk',
        label: 'Leche de almendra',
        description: 'Sin lactosa, sabor suave y neutro. Ideal para cocinar.',
        ratio: '1 : 1',
        tags: ['vegano', 'sin-lactosa'],
      },
      {
        substituteIngredient: 'Oat Milk',
        label: 'Leche de avena',
        description: 'Cremosa y con buen cuerpo; perfecta para repostería.',
        ratio: '1 : 1',
        tags: ['vegano', 'sin-lactosa'],
      },
      {
        substituteIngredient: 'Coconut Milk',
        label: 'Leche de coco',
        description: 'Más grasa; ideal para curries, sopas y postres.',
        ratio: '1 : 1',
        tags: ['vegano', 'sin-lactosa'],
      },
    ],

    butter: [
      {
        substituteIngredient: 'Olive Oil',
        label: 'Aceite de oliva',
        description: 'Para saltear o cocinar; aporta sabor mediterráneo.',
        ratio: '¾ taza por taza',
        tags: ['vegano', 'sin-lactosa', 'saludable'],
      },
      {
        substituteIngredient: 'Coconut Oil',
        label: 'Aceite de coco',
        description: 'Sustituye 1:1 en repostería; aroma suave y tropical.',
        ratio: '1 : 1',
        tags: ['vegano', 'sin-lactosa'],
      },
      {
        substituteIngredient: 'Applesauce',
        label: 'Puré de manzana',
        description: 'Para masas dulces; reduce la grasa y añade humedad.',
        ratio: '½ taza por taza',
        tags: ['vegano', 'sin-lactosa', 'saludable'],
      },
    ],

    cream: [
      {
        substituteIngredient: 'Coconut Cream',
        label: 'Crema de coco',
        description: 'Misma consistencia espesa; sabor ligeramente dulce.',
        ratio: '1 : 1',
        tags: ['vegano', 'sin-lactosa'],
      },
      {
        substituteIngredient: 'Cashews',
        label: 'Crema de anacardos',
        description: 'Anacardos remojados y licuados; extremadamente cremosa.',
        ratio: '1 : 1',
        tags: ['vegano', 'sin-lactosa', 'saludable'],
      },
    ],

    cheese: [
      {
        substituteIngredient: 'Tofu',
        label: 'Tofu firme',
        description: 'Desmenuzado o en láminas; toma el sabor del adobo.',
        ratio: '1 : 1',
        tags: ['vegano', 'sin-lactosa'],
      },
      {
        substituteIngredient: 'Nutritional Yeast',
        label: 'Levadura nutricional',
        description: 'Aporta sabor a queso y umami sin ningún lácteo.',
        ratio: '3 cdas ≈ 1 porción',
        tags: ['vegano', 'sin-lactosa', 'saludable'],
      },
    ],

    // ── Huevo ─────────────────────────────────────────────────────────────────
    egg: [
      {
        substituteIngredient: 'Banana',
        label: 'Papilla de plátano',
        description: 'Ideal para pancakes, brownies y galletas húmedas.',
        ratio: '½ plátano = 1 huevo',
        tags: ['vegano', 'sin-lactosa'],
      },
      {
        substituteIngredient: 'Flaxseed',
        label: 'Linaza + agua',
        description: '1 cda semilla molida + 3 cda agua; reposar 5 min.',
        ratio: '1 cda = 1 huevo',
        tags: ['vegano', 'sin-lactosa', 'saludable'],
      },
      {
        substituteIngredient: 'Applesauce',
        label: 'Puré de manzana',
        description: 'Para masas húmedas y pasteles; añade dulzor.',
        ratio: '¼ taza = 1 huevo',
        tags: ['vegano', 'sin-lactosa'],
      },
    ],

    // ── Harinas ───────────────────────────────────────────────────────────────
    flour: [
      {
        substituteIngredient: 'Almond Flour',
        label: 'Harina de almendra',
        description: 'Sin gluten y apto para keto; ajustar líquidos.',
        ratio: '1 : 1 (ajustar)',
        tags: ['sin-gluten', 'saludable'],
      },
      {
        substituteIngredient: 'Oats',
        label: 'Harina de avena',
        description: 'Moler avena en casa; más fibra y sabor suave.',
        ratio: '1 : 1',
        tags: ['saludable', 'económico'],
      },
      {
        substituteIngredient: 'Cornflour',
        label: 'Maicena',
        description: 'Solo para espesar salsas y cremas; no para masas.',
        ratio: '1 cda = 2 cda harina',
        tags: ['sin-gluten'],
      },
    ],

    // ── Endulzantes ───────────────────────────────────────────────────────────
    sugar: [
      {
        substituteIngredient: 'Honey',
        label: 'Miel',
        description: 'Reducir ¼ de los líquidos totales de la receta.',
        ratio: '¾ taza = 1 taza azúcar',
        tags: ['saludable'],
      },
      {
        substituteIngredient: 'Maple Syrup',
        label: 'Jarabe de arce',
        description: 'Sabor caramelado natural; 100 % vegano.',
        ratio: '¾ taza = 1 taza azúcar',
        tags: ['vegano', 'saludable'],
      },
    ],

    'brown sugar': [
      {
        substituteIngredient: 'Honey',
        label: 'Miel',
        description: 'Aporta humedad extra; reducir líquidos de la receta.',
        ratio: '¾ taza = 1 taza',
        tags: ['saludable'],
      },
      {
        substituteIngredient: 'Maple Syrup',
        label: 'Jarabe de arce',
        description: 'Sabor similar al azúcar moreno; apto veganos.',
        ratio: '¾ taza = 1 taza',
        tags: ['vegano'],
      },
    ],

    // ── Proteínas ─────────────────────────────────────────────────────────────
    'chicken breast': [
      {
        substituteIngredient: 'Tofu',
        label: 'Tofu firme',
        description: 'Marinar antes de cocinar; absorbe cualquier sabor.',
        ratio: '1 : 1 en peso',
        tags: ['vegano', 'sin-lactosa'],
      },
      {
        substituteIngredient: 'Cauliflower',
        label: 'Coliflor en filetes',
        description: 'Filetes gruesos asados o empanizados; textura firme.',
        ratio: '1 filete ≈ 1 pechuga',
        tags: ['vegano', 'saludable', 'sin-gluten'],
      },
      {
        substituteIngredient: 'Mushrooms',
        label: 'Champiñones portobello',
        description: 'Umami natural; excelente en guisos y salteados.',
        ratio: '1 : 1 en volumen',
        tags: ['vegano', 'sin-lactosa'],
      },
    ],

    chicken: [
      {
        substituteIngredient: 'Tofu',
        label: 'Tofu firme',
        description: 'Marinar antes de cocinar; absorbe cualquier sabor.',
        ratio: '1 : 1 en peso',
        tags: ['vegano', 'sin-lactosa'],
      },
      {
        substituteIngredient: 'Cauliflower',
        label: 'Coliflor',
        description: 'Filetes asados; textura carnosa y sabor suave.',
        ratio: '1 : 1',
        tags: ['vegano', 'saludable', 'sin-gluten'],
      },
    ],

    beef: [
      {
        substituteIngredient: 'Lentils',
        label: 'Lentejas',
        description: 'Cocidas al dente; textura similar en salsas y guisos.',
        ratio: '1 taza = 200 g carne',
        tags: ['vegano', 'saludable', 'económico'],
      },
      {
        substituteIngredient: 'Mushrooms',
        label: 'Champiñones picados',
        description: 'Portobello finamente picado con umami intenso.',
        ratio: '1 : 1 en volumen',
        tags: ['vegano', 'sin-lactosa'],
      },
      {
        substituteIngredient: 'Tofu',
        label: 'Tofu desmenuzado',
        description: 'Desmenuzar y saltear con especias y salsa de soya.',
        ratio: '1 : 1 en peso',
        tags: ['vegano', 'sin-lactosa'],
      },
    ],

    salmon: [
      {
        substituteIngredient: 'Mackerel',
        label: 'Caballa',
        description: 'Rico en omega-3; sabor más intenso pero similar.',
        ratio: '1 : 1',
        tags: ['saludable', 'económico'],
      },
      {
        substituteIngredient: 'Tofu',
        label: 'Tofu marinado',
        description: 'Marinar con tamari y algas; alternativa 100 % vegana.',
        ratio: '1 : 1 en peso',
        tags: ['vegano', 'sin-lactosa'],
      },
    ],

    // ── Vegetales ─────────────────────────────────────────────────────────────
    potato: [
      {
        substituteIngredient: 'Sweet Potato',
        label: 'Camote / Boniato',
        description: 'Más dulce y con mayor contenido de fibra y betacaroteno.',
        ratio: '1 : 1',
        tags: ['saludable', 'sin-gluten'],
      },
      {
        substituteIngredient: 'Cauliflower',
        label: 'Coliflor',
        description: 'Bajo en carbohidratos; perfecto para purés y gratinados.',
        ratio: '1 : 1',
        tags: ['saludable', 'sin-gluten', 'vegano'],
      },
    ],

    potatoes: [
      {
        substituteIngredient: 'Sweet Potato',
        label: 'Camote / Boniato',
        description: 'Más dulce y con mayor contenido de fibra y betacaroteno.',
        ratio: '1 : 1',
        tags: ['saludable', 'sin-gluten'],
      },
      {
        substituteIngredient: 'Cauliflower',
        label: 'Coliflor',
        description: 'Bajo en carbohidratos; perfecto para purés y gratinados.',
        ratio: '1 : 1',
        tags: ['saludable', 'sin-gluten', 'vegano'],
      },
    ],

    // ── Condimentos y aceites ─────────────────────────────────────────────────
    'soy sauce': [
      {
        substituteIngredient: 'Tamari',
        label: 'Tamari',
        description: 'Salsa de soja sin gluten; sabor más suave y profundo.',
        ratio: '1 : 1',
        tags: ['sin-gluten', 'vegano'],
      },
      {
        substituteIngredient: 'Worcestershire Sauce',
        label: 'Salsa inglesa',
        description: 'Sabor umami complejo; contiene anchoas (no vegano).',
        ratio: '1 : 1',
        tags: ['sin-gluten'],
      },
    ],

    'olive oil': [
      {
        substituteIngredient: 'Avocado Oil',
        label: 'Aceite de aguacate',
        description: 'Punto de humo más alto; ideal para frituras suaves.',
        ratio: '1 : 1',
        tags: ['vegano', 'saludable'],
      },
      {
        substituteIngredient: 'Coconut Oil',
        label: 'Aceite de coco',
        description: 'Estable a altas temperaturas; aroma suave tropical.',
        ratio: '1 : 1',
        tags: ['vegano'],
      },
    ],

    oil: [
      {
        substituteIngredient: 'Olive Oil',
        label: 'Aceite de oliva',
        description: 'Más antioxidantes; aporta sabor mediterráneo.',
        ratio: '1 : 1',
        tags: ['vegano', 'saludable'],
      },
      {
        substituteIngredient: 'Coconut Oil',
        label: 'Aceite de coco',
        description: 'Muy estable al calor; aroma suave.',
        ratio: '1 : 1',
        tags: ['vegano'],
      },
    ],
  };

  // ── API pública ────────────────────────────────────────────────────────────

  /**
   * Devuelve sugerencias de sustitución para cada ingrediente seleccionado
   * que tenga al menos una coincidencia en el mapa interno.
   */
  getSubstitutions(ingredients: Ingredient[]): SubstitutionSuggestion[] {
    return ingredients
      .map((ingredient) => ({
        originalIngredient: ingredient,
        substitutes: this.findEntries(ingredient.strIngredient),
      }))
      .filter((s) => s.substitutes.length > 0);
  }

  // ── Matching multinivel ────────────────────────────────────────────────────
  private findEntries(ingredientName: string): SubstitutionEntry[] {
    const normalized = ingredientName.toLowerCase().trim();

    // 1. Coincidencia exacta
    if (this.SUBSTITUTIONS[normalized]) {
      return this.SUBSTITUTIONS[normalized];
    }

    // 2. La clave está contenida en el nombre del ingrediente (o viceversa)
    for (const key of Object.keys(this.SUBSTITUTIONS)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return this.SUBSTITUTIONS[key];
      }
    }

    // 3. Coincidencia por palabras significativas (> 3 chars)
    const words = normalized.split(/\s+/).filter((w) => w.length > 3);
    for (const key of Object.keys(this.SUBSTITUTIONS)) {
      const keyWords = key.split(/\s+/).filter((w) => w.length > 3);
      if (words.some((w) => keyWords.includes(w))) {
        return this.SUBSTITUTIONS[key];
      }
    }

    return [];
  }
}
