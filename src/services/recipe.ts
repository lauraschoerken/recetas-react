import type { CreateRecipeData, Recipe } from '@/models'
import { api } from '@/services/api'

export type {
	CreateComponentData,
	CreateComponentOptionData,
	CreateRecipeData,
	Ingredient,
	IngredientVariant,
	Recipe,
	RecipeComponent,
	RecipeComponentOption,
	RecipeNutrition,
	UnitConversion,
} from '@/models'

export const recipeService = {
	async getAll(): Promise<Recipe[]> {
		const result = await api.get<{ data: Recipe[]; total: number }>('/recipes')
		return result.data
	},

	async getAllPaginated(params: {
		page: number
		pageSize: number
		search?: string
		visibility?: 'all' | 'public' | 'mine' | 'private'
		ingredient?: string
		difficulty?: string
		minCookTime?: number
		maxCookTime?: number
		tagIds?: number[]
		excludeTagIds?: number[]
		sortBy?: string
		sortOrder?: string
	}): Promise<{ data: Recipe[]; total: number }> {
		const q = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) })
		if (params.search) q.set('search', params.search)
		if (params.visibility && params.visibility !== 'all') q.set('visibility', params.visibility)
		if (params.ingredient) q.set('ingredient', params.ingredient)
		if (params.difficulty) q.set('difficulty', params.difficulty)
		if (params.minCookTime != null) q.set('minCookTime', String(params.minCookTime))
		if (params.maxCookTime != null) q.set('maxCookTime', String(params.maxCookTime))
		if (params.tagIds && params.tagIds.length > 0) q.set('tagIds', params.tagIds.join(','))
		if (params.excludeTagIds && params.excludeTagIds.length > 0)
			q.set('excludeTagIds', params.excludeTagIds.join(','))
		if (params.sortBy) q.set('sortBy', params.sortBy)
		if (params.sortOrder) q.set('sortOrder', params.sortOrder)
		return api.get<{ data: Recipe[]; total: number }>(`/recipes?${q}`)
	},

	async getById(id: number): Promise<Recipe> {
		return api.get<Recipe>(`/recipes/${id}`)
	},

	async create(data: CreateRecipeData): Promise<Recipe> {
		return api.post<Recipe>('/recipes', data)
	},

	async update(id: number, data: Partial<CreateRecipeData>): Promise<Recipe> {
		return api.put<Recipe>(`/recipes/${id}`, data)
	},

	async delete(id: number): Promise<void> {
		return api.delete(`/recipes/${id}`)
	},
}
