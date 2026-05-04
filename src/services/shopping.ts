import type {
	AddWeekPlanResult,
	ConsumeResult,
	CookResult,
	CreateWeekPlanData,
	ShoppingItem,
	WeekPlan,
} from '@/models'
import { api } from '@/services/api'

const API_MODE = (import.meta.env.VITE_API_MODE as 'mock' | 'api' | 'real' | undefined) ?? 'api'
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? ''
const API_PREFIX = (import.meta.env.VITE_API_PREFIX as string | undefined) ?? '/api'
const SHOPPING_API_URL = API_MODE === 'mock' ? '' : `${API_BASE}${API_PREFIX}`

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

	async getShoppingList(startDate?: string, endDate?: string): Promise<ShoppingItem[]> {
		const params = new URLSearchParams()
		if (startDate) params.set('startDate', startDate)
		if (endDate) params.set('endDate', endDate)
		const query = params.toString()
		return api.get<ShoppingItem[]>(`/shopping-list${query ? `?${query}` : ''}`)
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

	async downloadShoppingPdf(
		items: { name: string; quantityToBuy: number; unit: string }[],
		weekLabel?: string
	): Promise<void> {
		const token = localStorage.getItem('token')
		const response = await fetch(`${SHOPPING_API_URL}/shopping-list/export/pdf`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			body: JSON.stringify({ items, weekLabel }),
		})
		if (!response.ok) throw new Error('Error al generar PDF')
		const blob = await response.blob()
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = 'lista-compra.pdf'
		a.style.display = 'none'
		document.body.appendChild(a)
		a.click()
		a.remove()
		URL.revokeObjectURL(url)
	},
}
