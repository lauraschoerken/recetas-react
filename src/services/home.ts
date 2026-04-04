import { api } from '@/services/api'

export type HomeLocation = 'nevera' | 'congelador' | 'despensa'

export interface HomeItem {
	id: number
	location: HomeLocation
	quantity: number
	unit: string
	addedAt: string
	expiresAt?: string | null
	ingredientId?: number | null
	variantId?: number | null
	ingredient?: {
		id: number
		name: string
	} | null
	recipe?: {
		id: number
		title: string
	} | null
	variant?: {
		id: number
		name: string
		weightFactor: number
	} | null
	plannedMealServings?: number
	pendingPrepServings?: number
	projectedTotal?: number
}

export interface CreateHomeItemData {
	location: HomeLocation
	quantity: number
	unit: string
	expiresAt?: string
	ingredientId?: number
	recipeId?: number
	ingredientName?: string
	variantId?: number
}

export interface CookIngredientData {
	targetVariantId: number
	quantity?: number
	targetLocation?: HomeLocation
}

export interface CookIngredientResult {
	success: boolean
	cookedItem: HomeItem
	message: string
}

export interface UpdateHomeItemData {
	location?: HomeLocation
	quantity?: number
	unit?: string
	expiresAt?: string | null
}

class HomeService {
	async getAll(): Promise<HomeItem[]> {
		return api.get<HomeItem[]>('/home')
	}

	async getByLocation(location: HomeLocation): Promise<HomeItem[]> {
		return api.get<HomeItem[]>(`/home?location=${location}`)
	}

	async create(data: CreateHomeItemData): Promise<HomeItem> {
		return api.post<HomeItem>('/home', data)
	}

	async update(id: number, data: UpdateHomeItemData): Promise<HomeItem> {
		return api.put<HomeItem>(`/home/${id}`, data)
	}

	async delete(id: number): Promise<void> {
		return api.delete(`/home/${id}`)
	}

	async processConsumed(): Promise<{ processed: number }> {
		return api.post<{ processed: number }>('/home/process-consumed', {})
	}

	async cookIngredient(id: number, data: CookIngredientData): Promise<CookIngredientResult> {
		return api.post<CookIngredientResult>(`/home/${id}/cook`, data)
	}
}

export const homeService = new HomeService()
