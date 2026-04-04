import {
	mockRecommendedMacros,
	mockUserProfile,
	mockWeeklyNutrition,
} from '@/mocks/domains/profile.mock'
import type { ApiResult, RecommendedMacros, UserProfile, WeeklyNutrition } from '@/models'

export const mockProfileResponse = (
	overrides: Partial<UserProfile> = {}
): ApiResult<UserProfile> => ({
	data: mockUserProfile(overrides),
})

export const mockRecommendedMacrosResponse = (
	overrides: Partial<RecommendedMacros> = {}
): ApiResult<RecommendedMacros> => ({
	data: mockRecommendedMacros(overrides),
})

export const mockWeeklyNutritionResponse = (
	overrides: Partial<WeeklyNutrition> = {}
): ApiResult<WeeklyNutrition> => ({
	data: mockWeeklyNutrition(overrides),
})
