import { api } from '@/services/api'

export interface IngredientTag {
	id: number
	name: string
	color?: string
	isGlobal: boolean
	createdByUserId?: number
}

export interface TagAssignment {
	id: number
	ingredientId: number
	tagId: number
	userId?: number
	tag: IngredientTag
}

export interface IngredientOverride {
	id: number
	userId: number
	ingredientId: number
	preferredUnit?: string | null
	imageUrl?: string | null
	defaultLocation?: string | null
	preferredPurchaseVariantId?: number | null
	purchaseIsIndifferent: boolean
}

class IngredientTagService {
	async getAll(): Promise<IngredientTag[]> {
		return api.get<IngredientTag[]>('/ingredient-tags')
	}

	async create(data: { name: string; color?: string; isGlobal?: boolean }): Promise<IngredientTag> {
		return api.post<IngredientTag>('/ingredient-tags', data)
	}

	async update(id: number, data: { name?: string; color?: string }): Promise<IngredientTag> {
		return api.put<IngredientTag>(`/ingredient-tags/${id}`, data)
	}

	async delete(id: number): Promise<void> {
		return api.delete(`/ingredient-tags/${id}`)
	}

	async getForIngredient(ingredientId: number): Promise<TagAssignment[]> {
		return api.get<TagAssignment[]>(`/ingredient-tags/ingredients/${ingredientId}`)
	}

	async assign(ingredientId: number, tagId: number): Promise<TagAssignment> {
		return api.post<TagAssignment>(
			`/ingredient-tags/ingredients/${ingredientId}/assign/${tagId}`,
			{}
		)
	}

	async unassign(ingredientId: number, tagId: number): Promise<void> {
		return api.delete(`/ingredient-tags/ingredients/${ingredientId}/unassign/${tagId}`)
	}

	async hide(ingredientId: number, tagId: number): Promise<void> {
		return api.post<void>(`/ingredient-tags/ingredients/${ingredientId}/hide/${tagId}`, {})
	}

	async unhide(ingredientId: number, tagId: number): Promise<void> {
		return api.delete(`/ingredient-tags/ingredients/${ingredientId}/unhide/${tagId}`)
	}
}

export const ingredientTagService = new IngredientTagService()

class IngredientOverrideService {
	async get(ingredientId: number): Promise<IngredientOverride | null> {
		try {
			return await api.get<IngredientOverride>(`/ingredients/${ingredientId}/override`)
		} catch {
			return null
		}
	}

	async save(
		ingredientId: number,
		data: {
			preferredUnit?: string | null
			imageUrl?: string | null
			defaultLocation?: string | null
			preferredPurchaseVariantId?: number | null
			purchaseIsIndifferent?: boolean
		}
	): Promise<IngredientOverride> {
		return api.put<IngredientOverride>(`/ingredients/${ingredientId}/override`, data)
	}

	async clear(ingredientId: number): Promise<void> {
		return api.delete(`/ingredients/${ingredientId}/override`)
	}
}

export const ingredientOverrideService = new IngredientOverrideService()
