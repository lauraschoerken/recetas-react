import { mockCookIngredientResult, mockHomeItem } from '@/mocks/domains/home.mock'
import type { ApiResult, CookIngredientResult, HomeItem } from '@/models'

export const mockHomeItemsResponse = (): ApiResult<HomeItem[]> => ({
	data: [mockHomeItem()],
})

export const mockHomeItemResponse = (overrides: Partial<HomeItem> = {}): ApiResult<HomeItem> => ({
	data: mockHomeItem(overrides),
})

export const mockCookIngredientResponse = (
	overrides: Partial<CookIngredientResult> = {}
): ApiResult<CookIngredientResult> => ({
	data: mockCookIngredientResult(overrides),
})

export const mockProcessConsumedResponse = (
	processed: number = 1
): ApiResult<{ processed: number }> => ({
	data: { processed },
})
