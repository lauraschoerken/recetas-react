import { api } from '@/services/api'
import { Recipe } from '@/services/recipe'

export type WeekPlanType = 'meal' | 'prep'

export interface WeekPlan {
	id: number
	plannedDate: string
	servings: number
	type: WeekPlanType
	cooked: boolean
	consumed: boolean
	userId: number
	recipeId: number | null
	createdAt: string
	recipe: Recipe | null
	selections?: { optionId: number }[]
}

export interface ShoppingItem {
	ingredientId: number
	name: string
	unit: string
	totalQuantity: number
	quantityAtHome: number
	quantityToBuy: number
	preferredUnit?: string | null
	preferredQuantity?: number | null
}

export interface CookResult {
	success: boolean
	ingredientsDeducted: number
	leftoversSaved: boolean
}

export interface CreateWeekPlanData {
	recipeId: number
	plannedDate: string
	servings?: number
	type?: WeekPlanType
	selections?: number[]
}

export interface AddWeekPlanResult extends WeekPlan {
	autoPrepsCreated?: { recipeId: number; title: string; servings: number }[]
}

export interface ConsumeResult {
	success: boolean
	servingsDeducted: number
}

export const shoppingService = {
	async getWeekPlan(startDate: string, endDate: string): Promise<WeekPlan[]> {
		return api.get<WeekPlan[]>(`/week-plan?startDate=${startDate}&endDate=${endDate}`)
	},

	async addToWeekPlan(data: CreateWeekPlanData): Promise<AddWeekPlanResult> {
		return api.post<AddWeekPlanResult>('/week-plan', data)
	},

	async removeFromWeekPlan(id: number): Promise<void> {
		return api.delete(`/week-plan/${id}`)
	},

	async updatePlanDate(id: number, plannedDate: string): Promise<WeekPlan> {
		return api.put<WeekPlan>(`/week-plan/${id}`, { plannedDate })
	},

	async getShoppingList(startDate: string, endDate: string): Promise<ShoppingItem[]> {
		return api.get<ShoppingItem[]>(`/shopping-list?startDate=${startDate}&endDate=${endDate}`)
	},

	async markAsCooked(
		planId: number,
		leftoverServings: number = 0,
		leftoverLocation: string = 'nevera'
	): Promise<CookResult> {
		return api.post<CookResult>(`/week-plan/${planId}/cook`, { leftoverServings, leftoverLocation })
	},

	async markAsConsumed(planId: number): Promise<ConsumeResult> {
		return api.post<ConsumeResult>(`/week-plan/${planId}/consume`, {})
	},
}
