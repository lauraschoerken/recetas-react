import type { DailyNutrition, Ingredient, IngredientVariant, UnitConversion } from '@/models'
import { api } from '@/services/api'

export type { DailyNutrition, Ingredient, IngredientVariant, UnitConversion } from '@/models'

export interface CreateIngredientData {
	name: string
	unit: 'g' | 'ml'
	imageUrl?: string
	defaultLocation?: string
	variants?: CreateVariantData[]
}

export interface CreateVariantData {
	name: string
	isDefault?: boolean
	calories?: number
	protein?: number
	carbs?: number
	fat?: number
	fiber?: number
	weightFactor?: number
}

export interface UpdateIngredientData {
	name?: string
	preferredUnit?: string | null
	imageUrl?: string | null
	defaultLocation?: string | null
}

export interface UpdateVariantData {
	name?: string
	isDefault?: boolean
	calories?: number | null
	protein?: number | null
	carbs?: number | null
	fat?: number | null
	fiber?: number | null
	weightFactor?: number
}

export interface CreateConversionData {
	unitName: string
	gramsPerUnit: number
}

class IngredientService {
	async getAll(): Promise<Ingredient[]> {
		const result = await api.get<{ data: Ingredient[]; total: number }>('/ingredients')
		return result.data
	}

	async getAllPaginated(params: {
		page: number
		pageSize: number
		search?: string
		sortBy?: string
		sortOrder?: 'asc' | 'desc'
		location?: string
		statusFilter?: string
		hasNutrition?: boolean
		minCalories?: number
		maxCalories?: number
		minProtein?: number
		maxProtein?: number
		minCarbs?: number
		maxCarbs?: number
		minFat?: number
		maxFat?: number
		tagIds?: number[]
	}): Promise<{ data: Ingredient[]; total: number }> {
		const q = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) })
		if (params.search) q.set('search', params.search)
		if (params.sortBy) q.set('sortBy', params.sortBy)
		if (params.sortOrder) q.set('sortOrder', params.sortOrder)
		if (params.location) q.set('location', params.location)
		if (params.statusFilter) q.set('statusFilter', params.statusFilter)
		if (params.hasNutrition) q.set('hasNutrition', 'true')
		if (params.minCalories != null) q.set('minCalories', String(params.minCalories))
		if (params.maxCalories != null) q.set('maxCalories', String(params.maxCalories))
		if (params.minProtein != null) q.set('minProtein', String(params.minProtein))
		if (params.maxProtein != null) q.set('maxProtein', String(params.maxProtein))
		if (params.minCarbs != null) q.set('minCarbs', String(params.minCarbs))
		if (params.maxCarbs != null) q.set('maxCarbs', String(params.maxCarbs))
		if (params.minFat != null) q.set('minFat', String(params.minFat))
		if (params.maxFat != null) q.set('maxFat', String(params.maxFat))
		if (params.tagIds && params.tagIds.length > 0) q.set('tags', params.tagIds.join(','))
		return api.get<{ data: Ingredient[]; total: number }>(`/ingredients?${q}`)
	}

	async getById(id: number): Promise<Ingredient> {
		return api.get<Ingredient>(`/ingredients/${id}`)
	}

	async create(data: CreateIngredientData): Promise<Ingredient> {
		return api.post<Ingredient>('/ingredients', data)
	}

	async createBulk(ingredients: Array<{ name: string; unit: 'g' | 'ml' }>): Promise<Ingredient[]> {
		return api.post<Ingredient[]>('/ingredients/bulk', { ingredients })
	}

	async update(id: number, data: UpdateIngredientData): Promise<Ingredient> {
		return api.put<Ingredient>(`/ingredients/${id}`, data)
	}

	async delete(id: number): Promise<void> {
		return api.delete(`/ingredients/${id}`)
	}

	async getDailyNutrition(date?: string): Promise<DailyNutrition> {
		const query = date ? `?date=${date}` : ''
		return api.get<DailyNutrition>(`/ingredients/nutrition${query}`)
	}

	// Variants
	async getVariants(ingredientId: number): Promise<IngredientVariant[]> {
		return api.get<IngredientVariant[]>(`/ingredients/${ingredientId}/variants`)
	}

	async addVariant(ingredientId: number, data: CreateVariantData): Promise<IngredientVariant> {
		return api.post<IngredientVariant>(`/ingredients/${ingredientId}/variants`, data)
	}

	async updateVariant(variantId: number, data: UpdateVariantData): Promise<IngredientVariant> {
		return api.put<IngredientVariant>(`/ingredients/variants/${variantId}`, data)
	}

	async deleteVariant(variantId: number): Promise<void> {
		return api.delete(`/ingredients/variants/${variantId}`)
	}

	// Conversions
	async addConversion(ingredientId: number, data: CreateConversionData): Promise<UnitConversion> {
		return api.post<UnitConversion>(`/ingredients/${ingredientId}/conversions`, data)
	}

	async updateConversion(conversionId: number, gramsPerUnit: number): Promise<UnitConversion> {
		return api.put<UnitConversion>(`/ingredients/conversions/${conversionId}`, { gramsPerUnit })
	}

	async deleteConversion(conversionId: number): Promise<void> {
		return api.delete(`/ingredients/conversions/${conversionId}`)
	}

	// Eliminar override personal de conversión (para conversiones con isUserOverride=true)
	async deleteConversionOverride(overrideId: number): Promise<void> {
		return api.delete(`/ingredients/conversion-overrides/${overrideId}`)
	}

	async getConversions(ingredientId: number): Promise<UnitConversion[]> {
		return api.get<UnitConversion[]>(`/ingredients/${ingredientId}/conversions`)
	}

	// Proponer ingrediente PRIVATE al admin (lo pasa a PENDING)
	async propose(ingredientId: number): Promise<Ingredient> {
		return api.patch<Ingredient>(`/ingredients/${ingredientId}/propose`, {})
	}
}

export const ingredientService = new IngredientService()
