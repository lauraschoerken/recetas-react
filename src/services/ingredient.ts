import type { DailyNutrition, Ingredient, IngredientVariant, UnitConversion } from '@/models'
import { api } from '@/services/api'

export type { DailyNutrition, Ingredient, IngredientVariant, UnitConversion } from '@/models'

export interface CreateIngredientData {
	name: string
	unit: 'g' | 'ml'
	imageUrl?: string
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
		return api.get<Ingredient[]>('/ingredients')
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

	async getConversions(ingredientId: number): Promise<UnitConversion[]> {
		return api.get<UnitConversion[]>(`/ingredients/${ingredientId}/conversions`)
	}
}

export const ingredientService = new IngredientService()
