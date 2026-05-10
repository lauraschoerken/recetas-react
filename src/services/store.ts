import { api } from '@/services/api'

export interface UserStore {
	id: number
	userId: number
	name: string
	url?: string | null
	logoUrl?: string | null
	isShared: boolean
	user?: { id: number; name: string; email: string }
	ingredients?: StoreIngredient[]
}

export interface StoreIngredient {
	id: number
	storeId: number
	ingredientId: number
	purchaseUrl?: string | null
	preferredUnit?: string | null
	sortOrder?: number | null
	ingredient?: {
		id: number
		name: string
		unit: string
	}
}

class StoreService {
	async getAll(): Promise<UserStore[]> {
		return api.get<UserStore[]>('/stores/')
	}

	async create(data: {
		name: string
		url?: string
		logoUrl?: string
		isShared?: boolean
	}): Promise<UserStore> {
		return api.post<UserStore>('/stores/', data)
	}

	async update(
		id: number,
		data: { name?: string; url?: string; logoUrl?: string; isShared?: boolean }
	): Promise<UserStore> {
		return api.put<UserStore>(`/stores/${id}`, data)
	}

	async delete(id: number): Promise<void> {
		return api.delete(`/stores/${id}`)
	}

	async unshare(id: number, mode: 'delete' | 'duplicate'): Promise<UserStore> {
		return api.post<UserStore>(`/stores/${id}/unshare`, { mode })
	}

	async checkOtherUsers(id: number): Promise<{ count: number; userNames: string[] }> {
		return api.get<{ count: number; userNames: string[] }>(`/stores/${id}/check-other-users`)
	}

	async mergeStores(sourceStoreId: number, targetStoreId: number): Promise<UserStore> {
		return api.post<UserStore>(`/stores/${sourceStoreId}/merge`, { targetStoreId })
	}

	async addIngredient(
		storeId: number,
		data: {
			ingredientId: number
			purchaseUrl?: string
			preferredUnit?: string
			sortOrder?: number | null
		}
	): Promise<StoreIngredient> {
		return api.post<StoreIngredient>(`/stores/${storeId}/ingredients`, data)
	}

	async removeIngredient(storeId: number, ingredientId: number): Promise<void> {
		return api.delete(`/stores/${storeId}/ingredients/${ingredientId}`)
	}
}

export const storeService = new StoreService()
