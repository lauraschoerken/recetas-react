import type {
	AddWeekPlanResult,
	ConsumeResult,
	CookResult,
	CreateWeekPlanData,
	ShoppingItem,
	WeekPlan,
} from '@/models'

import { mockRecipe } from './recipe.mock'

export const mockWeekPlan = (overrides: Partial<WeekPlan> = {}): WeekPlan => ({
	id: 1,
	plannedDate: '2026-04-04',
	servings: 2,
	type: 'meal',
	cooked: false,
	consumed: false,
	userId: 1,
	recipeId: 1,
	ingredientId: null,
	ingredientQty: null,
	ingredientUnit: null,
	createdAt: '2026-04-04T00:00:00.000Z',
	recipe: mockRecipe(),
	ingredient: null,
	selections: [{ optionId: 1 }],
	...overrides,
})

export const mockShoppingItem = (overrides: Partial<ShoppingItem> = {}): ShoppingItem => ({
	ingredientId: 1,
	name: 'pollo',
	unit: 'g',
	totalQuantity: 500,
	quantityAtHome: 100,
	quantityToBuy: 400,
	preferredUnit: 'kg',
	preferredQuantity: 0.4,
	...overrides,
})

export const mockCreateWeekPlanData = (
	overrides: Partial<CreateWeekPlanData> = {}
): CreateWeekPlanData => ({
	recipeId: 1,
	plannedDate: '2026-04-04',
	servings: 2,
	type: 'meal',
	selections: [1],
	...overrides,
})

export const mockAddWeekPlanResult = (
	overrides: Partial<AddWeekPlanResult> = {}
): AddWeekPlanResult => ({
	...mockWeekPlan(),
	autoPrepsCreated: [{ recipeId: 2, title: 'Arroz cocido', servings: 2 }],
	...overrides,
})

export const mockCookResult = (overrides: Partial<CookResult> = {}): CookResult => ({
	success: true,
	ingredientsDeducted: 3,
	leftoversSaved: true,
	...overrides,
})

export const mockConsumeResult = (overrides: Partial<ConsumeResult> = {}): ConsumeResult => ({
	success: true,
	servingsDeducted: 2,
	...overrides,
})
