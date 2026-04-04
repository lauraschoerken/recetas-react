import type {
	ActivityLevel,
	DailyNutrition,
	Goal,
	RecommendedMacros,
	UserProfile,
	WeeklyNutrition,
} from '@/models'
import { api } from '@/services/api'

export type {
	ActivityLevel,
	DailyNutrition,
	Goal,
	RecommendedMacros,
	UserProfile,
	WeeklyNutrition,
} from '@/models'

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
	sedentary: 'Sedentario (poco o nada de ejercicio)',
	light: 'Ligero (ejercicio 1-3 días/semana)',
	moderate: 'Moderado (ejercicio 3-5 días/semana)',
	active: 'Activo (ejercicio 6-7 días/semana)',
	very_active: 'Muy activo (ejercicio intenso diario)',
}

export const GOAL_LABELS: Record<Goal, string> = {
	maintain: 'Mantener peso',
	lose: 'Perder peso',
	gain: 'Ganar peso/músculo',
}

class ProfileService {
	async getProfile(): Promise<UserProfile> {
		return api.get<UserProfile>('/profile')
	}

	async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
		return api.put<UserProfile>('/profile', data)
	}

	async getRecommendedMacros(): Promise<RecommendedMacros | null> {
		try {
			const result = await api.get<RecommendedMacros | { message: string }>(
				'/profile/recommended-macros'
			)
			if ('message' in result) {
				return null
			}
			return result
		} catch {
			return null
		}
	}

	async getWeeklyNutrition(startDate: string, endDate: string): Promise<WeeklyNutrition> {
		return api.get<WeeklyNutrition>(
			`/profile/weekly-nutrition?startDate=${startDate}&endDate=${endDate}`
		)
	}

	async getDailyNutrition(date: string): Promise<DailyNutrition> {
		const startDate = date
		const endDate = date
		const weekly = await this.getWeeklyNutrition(startDate, endDate)
		return (
			weekly.days[0] || {
				date,
				calories: 0,
				protein: 0,
				carbs: 0,
				fat: 0,
				fiber: 0,
			}
		)
	}
}

export const profileService = new ProfileService()
