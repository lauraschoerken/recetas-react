import { mockRecipe } from '@/mocks/domains/recipe.mock'
import type { ApiResult, Recipe } from '@/models'

export const mockRecipeListResponse = (): ApiResult<Recipe[]> => ({
	data: [mockRecipe()],
})

export const mockRecipeResponse = (overrides: Partial<Recipe> = {}): ApiResult<Recipe> => ({
	data: mockRecipe(overrides),
})
