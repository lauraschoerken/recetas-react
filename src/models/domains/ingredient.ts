export interface UnitConversion {
	id: number
	unitName: string
	gramsPerUnit: number
	ingredientId?: number
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
	ingredientId?: number
}

export interface Ingredient {
	id: number
	name: string
	unit: string
	ingredientBaseUnit?: string
	quantity?: number
	preferredUnit?: string | null
	defaultLocation?: string | null
	imageUrl?: string | null
	calories?: number | null
	protein?: number | null
	carbs?: number | null
	fat?: number | null
	fiber?: number | null
	variantId?: number | null
	variantName?: string
	cookedVariantId?: number | null
	cookedVariantName?: string
	variants?: IngredientVariant[]
	conversions?: UnitConversion[]
}

export interface DailyNutrition {
	date?: string
	calories: number
	protein: number
	carbs: number
	fat: number
	fiber: number
}
