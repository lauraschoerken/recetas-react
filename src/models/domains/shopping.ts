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
	createdAt: string
	recipe: Recipe | null
	selections?: { optionId: number }[]
}

export interface ShoppingItem {
	ingredientId: number
	name: string
	unit: string
	totalQuantity: number
	quantityAtHome: number
	quantityToBuy: number
	preferredUnit?: string | null
	preferredQuantity?: number | null
}

export interface CreateWeekPlanData {
	recipeId: number
	plannedDate: string
	servings?: number
	type?: WeekPlanType
	selections?: number[]
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
