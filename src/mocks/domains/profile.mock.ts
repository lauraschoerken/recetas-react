import type { RecommendedMacros, UserProfile, WeeklyNutrition } from '@/models'

export const mockUserProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
	imageUrl: 'https://example.com/avatar.jpg',
	weight: 70,
	height: 172,
	age: 30,
	gender: 'female',
	activityLevel: 'moderate',
	goal: 'maintain',
	customCalories: 2100,
	customProtein: 140,
	customCarbs: 220,
	customFat: 65,
	...overrides,
})

export const mockRecommendedMacros = (
	overrides: Partial<RecommendedMacros> = {}
): RecommendedMacros => ({
	calories: 2100,
	protein: 140,
	carbs: 220,
	fat: 65,
	bmr: 1450,
	tdee: 2150,
	...overrides,
})

export const mockWeeklyNutrition = (overrides: Partial<WeeklyNutrition> = {}): WeeklyNutrition => ({
	days: [
		{
			date: '2026-04-04',
			calories: 2000,
			protein: 130,
			carbs: 210,
			fat: 60,
			fiber: 25,
		},
	],
	totals: {
		calories: 14000,
		protein: 910,
		carbs: 1470,
		fat: 420,
		fiber: 175,
	},
	averages: {
		calories: 2000,
		protein: 130,
		carbs: 210,
		fat: 60,
		fiber: 25,
	},
	...overrides,
})
