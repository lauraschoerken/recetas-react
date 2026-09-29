import type { Recipe } from './recipe'

export type WeekPlanType = 'meal' | 'prep'

export interface WeekPlan {
	id: number
	plannedDate: string
	servings: number
	type: WeekPlanType
	cooked: boolean
	consumed: boolean
	userId: number
	recipeId: number | null
	ingredientId: number | null
	ingredientQty: number | null
	ingredientUnit: string | null
	manualTitle: string | null
	manualCalories: number | null
	manualProtein: number | null
	manualCarbs: number | null
	manualFat: number | null
	manualFiber: number | null
	manualNotes: string | null
	mealTime: string | null
	createdAt: string
	recipe: Recipe | null
	ingredient: { id: number; name: string; unit: string; imageUrl?: string | null } | null
	selections?: { optionId: number }[]
}

export interface ShoppingItem {
	ingredientId: number
	name: string
	unit: string
	totalQuantity: number
	quantityAtHome: number
	quantityToBuy: number
	manualQuantity?: number
	preferredUnit?: string | null
	preferredQuantity?: number | null
	conversions?: { unitName: string; gramsPerUnit: number }[]
}

export interface CreateWeekPlanData {
	recipeId?: number
	ingredientId?: number
	ingredientQty?: number
	ingredientUnit?: string
	manualTitle?: string
	manualCalories?: number
	manualProtein?: number
	manualCarbs?: number
	manualFat?: number
	manualFiber?: number
	manualNotes?: string
	mealTime?: string
	consumed?: boolean
	plannedDate: string
	servings?: number
	type?: WeekPlanType
	selections?: number[]
}

export type WeekPlanImportEntry =
	| {
			kind: 'manual'
			date: string
			time?: string
			title: string
			calories?: number
			protein?: number
			carbs?: number
			fat?: number
			fiber?: number
			notes?: string
			consumed?: boolean
	  }
	| {
			kind: 'recipe'
			date: string
			time?: string
			recipeId?: number
			recipeTitle?: string
			servings?: number
			consumed?: boolean
	  }
	| {
			kind: 'ingredient'
			date: string
			time?: string
			ingredientId?: number
			ingredientName?: string
			quantity: number
			unit?: string
			consumed?: boolean
	  }

export interface AddWeekPlanResult extends WeekPlan {
	autoPrepsCreated?: { recipeId: number; title: string; servings: number }[]
}

export interface CookResult {
	success: boolean
	ingredientsDeducted: number
	leftoversSaved: boolean
}

export interface ConsumeResult {
	success: boolean
	servingsDeducted: number
}
