import type { DailyNutrition, Ingredient, IngredientVariant, UnitConversion } from '@/models'

export const mockUnitConversion = (overrides: Partial<UnitConversion> = {}): UnitConversion => ({
	id: 1,
	unitName: 'cucharada',
	gramsPerUnit: 15,
	ingredientId: 1,
	...overrides,
})

export const mockIngredientVariant = (
	overrides: Partial<IngredientVariant> = {}
): IngredientVariant => ({
	id: 1,
	name: 'crudo',
	isDefault: true,
	weightFactor: 1,
	ingredientId: 1,
	calories: 100,
	protein: 10,
	carbs: 0,
	fat: 5,
	fiber: 0,
	...overrides,
})

export const mockIngredient = (overrides: Partial<Ingredient> = {}): Ingredient => ({
	id: 1,
	name: 'pollo',
	unit: 'g',
	preferredUnit: 'g',
	variants: [mockIngredientVariant()],
	conversions: [mockUnitConversion()],
	...overrides,
})

export const mockDailyNutrition = (overrides: Partial<DailyNutrition> = {}): DailyNutrition => ({
	date: '2026-04-04',
	calories: 2000,
	protein: 150,
	carbs: 180,
	fat: 70,
	fiber: 25,
	...overrides,
})
