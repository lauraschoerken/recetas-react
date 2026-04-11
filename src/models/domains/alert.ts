export type AlertStatus = 'OPEN' | 'VIEWED' | 'SNOOZED' | 'RESOLVED'
export type AlertTrigger = 'COOK' | 'CONSUME' | 'PLANNING' | 'MANUAL'

export interface StockAlert {
	id: number
	status: AlertStatus
	triggerType: AlertTrigger
	beforeQty: number
	deltaQty: number
	afterQty: number
	minimum: number
	message: string | null
	createdAt: string
	snoozedUntil: string | null
	userId: number
	householdId: number | null
	ingredientId: number | null
	recipeId: number | null
}

export interface IngredientThreshold {
	id: number
	minQuantity: number
	unit: string
	ingredientId: number
	ingredient?: { id: number; name: string; unit: string; preferredUnit?: string | null }
}

export interface RecipeThreshold {
	id: number
	minServings: number
	recipeId: number
	recipe?: { id: number; title: string }
}

export interface HomeItemHistoryEntry {
	id: number
	action: string
	quantity: number
	unit: string
	origin: string
	createdAt: string
	userId: number
	user?: { id: number; name: string }
}
