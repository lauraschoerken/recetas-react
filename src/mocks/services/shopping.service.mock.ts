import {
	mockAddWeekPlanResult,
	mockConsumeResult,
	mockCookResult,
	mockShoppingItem,
	mockWeekPlan,
} from '@/mocks/domains/shopping.mock'
import type {
	AddWeekPlanResult,
	ApiResult,
	ConsumeResult,
	CookResult,
	ShoppingItem,
	WeekPlan,
} from '@/models'

export const mockWeekPlanListResponse = (): ApiResult<WeekPlan[]> => ({
	data: [mockWeekPlan()],
})

export const mockWeekPlanResponse = (overrides: Partial<WeekPlan> = {}): ApiResult<WeekPlan> => ({
	data: mockWeekPlan(overrides),
})

export const mockAddWeekPlanResponse = (
	overrides: Partial<AddWeekPlanResult> = {}
): ApiResult<AddWeekPlanResult> => ({
	data: mockAddWeekPlanResult(overrides),
})

export const mockShoppingListResponse = (): ApiResult<ShoppingItem[]> => ({
	data: [mockShoppingItem()],
})

export const mockCookResponse = (overrides: Partial<CookResult> = {}): ApiResult<CookResult> => ({
	data: mockCookResult(overrides),
})

export const mockConsumeResponse = (
	overrides: Partial<ConsumeResult> = {}
): ApiResult<ConsumeResult> => ({
	data: mockConsumeResult(overrides),
})
