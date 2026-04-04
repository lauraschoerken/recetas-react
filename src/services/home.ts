import type {
	CookIngredientData,
	CookIngredientResult,
	CreateHomeItemData,
	HomeItem,
	HomeLocation,
	UpdateHomeItemData,
} from '@/models'
import { api } from '@/services/api'

export type {
	CookIngredientData,
	CookIngredientResult,
	CreateHomeItemData,
	HomeItem,
	HomeLocation,
	UpdateHomeItemData,
} from '@/models'

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
