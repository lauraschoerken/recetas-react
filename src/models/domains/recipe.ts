import type { Ingredient, IngredientVariant, UnitConversion } from './ingredient'

export interface RecipeNutrition {
	calories: number
	protein: number
	carbs: number
	fat: number
	fiber: number
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
	defaultLocation?: string | null
	createdAt: string
	updatedAt: string
	ingredients: Ingredient[]
	components?: RecipeComponent[]
	totalCalories?: number | null
	caloriesPerServing?: number | null
	nutrition?: RecipeNutrition | null
	nutritionPerServing?: RecipeNutrition | null
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
	defaultLocation?: string
	ingredients?: {
		name: string
		quantity: number
		unit: string
		variantId?: number
		variantName?: string
		cookedVariantId?: number
	}[]
	components?: CreateComponentData[]
	customCalories?: number | null
	customProtein?: number | null
	customCarbs?: number | null
	customFat?: number | null
	customFiber?: number | null
}
