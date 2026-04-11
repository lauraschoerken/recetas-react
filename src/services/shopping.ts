import type {
	AddWeekPlanResult,
	ConsumeResult,
	CookResult,
	CreateWeekPlanData,
	ShoppingItem,
	WeekPlan,
} from '@/models'
import { api } from '@/services/api'

export type {
	AddWeekPlanResult,
	ConsumeResult,
	CookResult,
	CreateWeekPlanData,
	ShoppingItem,
	WeekPlan,
	WeekPlanType,
} from '@/models'

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

	async addManualItems(
		items: { ingredientId: number; quantity: number; unit: string }[]
	): Promise<{ added: number }> {
		return api.post<{ added: number }>('/shopping-list/add', { items })
	},
}
