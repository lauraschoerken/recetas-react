import { api } from '@/services/api'

export interface UnitConversion {
	id: number
	unitName: string
	gramsPerUnit: number
}

export interface IngredientVariant {
	id: number
	name: string
	isDefault: boolean
	calories?: number | null
	protein?: number | null
	carbs?: number | null
	fat?: number | null
	fiber?: number | null
	weightFactor: number
}

export interface Ingredient {
	id: number
	name: string
	unit: string
	quantity: number
	variantId?: number | null
	variantName?: string
	cookedVariantId?: number | null
	cookedVariantName?: string
	variants?: IngredientVariant[]
	conversions?: UnitConversion[]
}

export interface RecipeComponentOption {
	id: number
	name: string
	isDefault: boolean
	recipeId?: number | null
	quantity: number | null
	unit: string | null
	recipeServings: number | null
	recipe?: Recipe | null
	ingredient?: {
		id: number
		name: string
		unit: string
		variantId?: number | null
		variantName?: string
		cookedVariantId?: number | null
		cookedVariantName?: string
		variants?: IngredientVariant[]
		conversions?: UnitConversion[]
	} | null
}

export interface RecipeComponent {
	id: number
	name: string
	sortOrder: number
	isOptional: boolean
	defaultEnabled: boolean
	options: RecipeComponentOption[]
}

export interface RecipeNutrition {
	calories: number
	protein: number
	carbs: number
	fat: number
	fiber: number
}

export interface Recipe {
	id: number
	title: string
	description: string | null
	instructions: string | null
	imageUrl: string | null
	servings: number
	isPublic: boolean
	userId: number
	authorName?: string
	createdAt: string
	updatedAt: string
	ingredients: Ingredient[]
	components?: RecipeComponent[]
	totalCalories?: number | null
	caloriesPerServing?: number | null
	nutrition?: RecipeNutrition | null
	nutritionPerServing?: RecipeNutrition | null
	// Macros manuales
	customCalories?: number | null
	customProtein?: number | null
	customCarbs?: number | null
	customFat?: number | null
	customFiber?: number | null
}

export interface CreateComponentOptionData {
	name: string
	isDefault?: boolean
	recipeId?: number | null
	ingredientName?: string
	ingredientId?: number
	ingredientVariants?: IngredientVariant[]
	ingredientConversions?: UnitConversion[]
	cookedVariantId?: number | null
	quantity?: number
	unit?: string
	recipeServings?: number
}

export interface CreateComponentData {
	name: string
	sortOrder?: number
	isOptional?: boolean
	defaultEnabled?: boolean
	options: CreateComponentOptionData[]
}

export interface CreateRecipeData {
	title: string
	description?: string
	instructions?: string
	imageUrl?: string
	servings?: number
	isPublic?: boolean
	ingredients?: {
		name: string
		quantity: number
		unit: string
		variantId?: number
		variantName?: string
		cookedVariantId?: number
	}[]
	components?: CreateComponentData[]
	// Macros manuales
	customCalories?: number | null
	customProtein?: number | null
	customCarbs?: number | null
	customFat?: number | null
	customFiber?: number | null
}

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
