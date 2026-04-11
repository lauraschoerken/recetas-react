import type {
	HomeItemHistoryEntry,
	IngredientThreshold,
	RecipeThreshold,
	StockAlert,
} from '@/models'
import { api } from '@/services/api'

export type {
	HomeItemHistoryEntry,
	IngredientThreshold,
	RecipeThreshold,
	StockAlert,
} from '@/models'

class AlertService {
	// Alerts
	async getAlerts(includeResolved = false): Promise<StockAlert[]> {
		const qs = includeResolved ? '?includeResolved=true' : ''
		return api.get<StockAlert[]>(`/alerts${qs}`)
	}

	async getUnreadCount(): Promise<number> {
		const result = await api.get<{ count: number }>('/alerts/count')
		return result.count
	}

	async updateAlert(
		id: number,
		data: { status: string; snoozedUntil?: string; addToShopping?: boolean }
	): Promise<StockAlert> {
		return api.put<StockAlert>(`/alerts/${id}`, data)
	}

	// Ingredient thresholds
	async getIngredientThresholds(): Promise<IngredientThreshold[]> {
		return api.get<IngredientThreshold[]>('/alerts/thresholds/ingredients')
	}

	async setIngredientThreshold(data: {
		ingredientId: number
		minQuantity: number
		unit: string
	}): Promise<IngredientThreshold> {
		return api.post<IngredientThreshold>('/alerts/thresholds/ingredients', data)
	}

	async deleteIngredientThreshold(ingredientId: number): Promise<void> {
		await api.delete(`/alerts/thresholds/ingredients/${ingredientId}`)
	}

	// Recipe thresholds
	async getRecipeThresholds(): Promise<RecipeThreshold[]> {
		return api.get<RecipeThreshold[]>('/alerts/thresholds/recipes')
	}

	async setRecipeThreshold(data: {
		recipeId: number
		minServings: number
	}): Promise<RecipeThreshold> {
		return api.post<RecipeThreshold>('/alerts/thresholds/recipes', data)
	}

	async deleteRecipeThreshold(recipeId: number): Promise<void> {
		await api.delete(`/alerts/thresholds/recipes/${recipeId}`)
	}
}

export const alertService = new AlertService()
