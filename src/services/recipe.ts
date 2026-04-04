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
		return api.get<Recipe[]>('/recipes')
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
