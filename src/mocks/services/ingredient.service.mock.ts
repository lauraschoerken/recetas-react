import {
	mockDailyNutrition,
	mockIngredient,
	mockIngredientVariant,
	mockUnitConversion,
} from '@/mocks/domains/ingredient.mock'
import type {
	ApiResult,
	DailyNutrition,
	Ingredient,
	IngredientVariant,
	UnitConversion,
} from '@/models'

export const mockIngredientListResponse = (): ApiResult<Ingredient[]> => ({
	data: [mockIngredient()],
})

export const mockIngredientResponse = (
	overrides: Partial<Ingredient> = {}
): ApiResult<Ingredient> => ({
	data: mockIngredient(overrides),
})

export const mockIngredientVariantResponse = (
	overrides: Partial<IngredientVariant> = {}
): ApiResult<IngredientVariant> => ({
	data: mockIngredientVariant(overrides),
})

export const mockIngredientVariantsResponse = (): ApiResult<IngredientVariant[]> => ({
	data: [mockIngredientVariant()],
})

export const mockConversionResponse = (
	overrides: Partial<UnitConversion> = {}
): ApiResult<UnitConversion> => ({
	data: mockUnitConversion(overrides),
})

export const mockConversionsResponse = (): ApiResult<UnitConversion[]> => ({
	data: [mockUnitConversion()],
})

export const mockDailyNutritionResponse = (
	overrides: Partial<DailyNutrition> = {}
): ApiResult<DailyNutrition> => ({
	data: mockDailyNutrition(overrides),
})
