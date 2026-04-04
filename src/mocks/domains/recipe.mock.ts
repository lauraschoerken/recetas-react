import type {
	CreateRecipeData,
	Recipe,
	RecipeComponent,
	RecipeComponentOption,
	RecipeNutrition,
} from '@/models'

import { mockIngredient } from './ingredient.mock'

export const mockRecipeNutrition = (overrides: Partial<RecipeNutrition> = {}): RecipeNutrition => ({
	calories: 500,
	protein: 40,
	carbs: 30,
	fat: 20,
	fiber: 8,
	...overrides,
})

export const mockRecipeComponentOption = (
	overrides: Partial<RecipeComponentOption> = {}
): RecipeComponentOption => ({
	id: 1,
	name: 'base',
	isDefault: true,
	quantity: 100,
	unit: 'g',
	recipeServings: 1,
	ingredient: {
		id: 1,
		name: 'pollo',
		unit: 'g',
	},
	...overrides,
})

export const mockRecipeComponent = (overrides: Partial<RecipeComponent> = {}): RecipeComponent => ({
	id: 1,
	name: 'proteina',
	sortOrder: 0,
	isOptional: false,
	defaultEnabled: true,
	options: [mockRecipeComponentOption()],
	...overrides,
})

export const mockRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
	id: 1,
	title: 'Pollo al horno',
	description: 'Receta de prueba',
	instructions: 'Paso 1',
	imageUrl: null,
	servings: 2,
	isPublic: false,
	userId: 1,
	createdAt: '2026-04-04T00:00:00.000Z',
	updatedAt: '2026-04-04T00:00:00.000Z',
	ingredients: [mockIngredient({ quantity: 300 })],
	components: [mockRecipeComponent()],
	nutrition: mockRecipeNutrition(),
	nutritionPerServing: mockRecipeNutrition({ calories: 250 }),
	...overrides,
})

export const mockCreateRecipeData = (
	overrides: Partial<CreateRecipeData> = {}
): CreateRecipeData => ({
	title: 'Nueva receta',
	ingredients: [{ name: 'pollo', quantity: 200, unit: 'g' }],
	...overrides,
})
