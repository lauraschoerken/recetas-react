import type { CreateRecipeData, Recipe } from '@/models'
import { api } from '@/services/api'

const API_MODE = (import.meta.env.VITE_API_MODE as 'mock' | 'api' | 'real' | undefined) ?? 'api'
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? ''
const API_PREFIX = (import.meta.env.VITE_API_PREFIX as string | undefined) ?? '/api'
const RECIPE_API_URL = API_MODE === 'mock' ? '' : `${API_BASE}${API_PREFIX}`

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
		authorId?: number | null
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
		if (params.authorId != null) q.set('author', String(params.authorId))
		return api.get<{ data: Recipe[]; total: number }>(`/recipes?${q}`)
	},

	async getById(id: number): Promise<Recipe> {
		return api.get<Recipe>(`/recipes/${id}`)
	},

	async getAuthors(): Promise<{ id: number; name: string }[]> {
		return api.get<{ id: number; name: string }[]>('/recipes/authors')
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

	async exportCsv(ids: number[]): Promise<void> {
		const token = localStorage.getItem('token')
		const response = await fetch(`${RECIPE_API_URL}/recipes/export/csv?ids=${ids.join(',')}`, {
			headers: {
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
		})
		if (!response.ok) throw new Error('Error al exportar CSV')
		const blob = await response.blob()
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = 'recetas.csv'
		a.style.display = 'none'
		document.body.appendChild(a)
		a.click()
		a.remove()
		URL.revokeObjectURL(url)
	},

	async importFromCsv(
		file: File
	): Promise<{ importedCount: number; skipped: { title: string; id: number }[] }> {
		const csv = await file.text()
		return api.post<{ importedCount: number; skipped: { title: string; id: number }[] }>(
			'/recipes/import/csv',
			{ csv }
		)
	},
}
