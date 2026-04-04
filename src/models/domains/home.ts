export type HomeLocation = 'nevera' | 'congelador' | 'despensa'

export interface HomeItem {
	id: number
	location: HomeLocation
	quantity: number
	unit: string
	addedAt: string
	expiresAt?: string | null
	ingredientId?: number | null
	variantId?: number | null
	ingredient?: {
		id: number
		name: string
	} | null
	recipe?: {
		id: number
		title: string
	} | null
	variant?: {
		id: number
		name: string
		weightFactor: number
	} | null
	plannedMealServings?: number
	pendingPrepServings?: number
	projectedTotal?: number
}

export interface CreateHomeItemData {
	location: HomeLocation
	quantity: number
	unit: string
	expiresAt?: string
	ingredientId?: number
	recipeId?: number
	ingredientName?: string
	variantId?: number
}

export interface UpdateHomeItemData {
	location?: HomeLocation
	quantity?: number
	unit?: string
	expiresAt?: string | null
}

export interface CookIngredientData {
	targetVariantId: number
	quantity?: number
	targetLocation?: HomeLocation
}

export interface CookIngredientResult {
	success: boolean
	cookedItem: HomeItem
	message: string
}
