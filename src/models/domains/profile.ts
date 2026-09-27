import type { DailyNutrition } from './ingredient'

export type Gender = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type Goal = 'maintain' | 'lose' | 'gain'

export interface UserProfile {
	imageUrl?: string
	weight?: number
	height?: number
	age?: number
	gender?: Gender
	activityLevel?: ActivityLevel
	goal?: Goal
	customCalories?: number | null
	customProtein?: number | null
	customCarbs?: number | null
	customFat?: number | null
}

export interface RecommendedMacros {
	calories: number
	protein: number
	carbs: number
	fat: number
	fiber: number
	bmr: number
	tdee: number
	method: 'Mifflin-St Jeor'
	proteinPerKg: number
	referenceWeight: number
	calorieAdjustmentPercent: number
	calorieFloorApplied: boolean
}

export interface WeeklyNutrition {
	days: Array<DailyNutrition & { date: string }>
	totals: DailyNutrition
	averages: DailyNutrition
}
