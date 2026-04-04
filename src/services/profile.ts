import { api } from '@/services/api';

export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'maintain' | 'lose' | 'gain';

export interface UserProfile {
  imageUrl?: string;
  weight?: number;
  height?: number;
  age?: number;
  gender?: Gender;
  activityLevel?: ActivityLevel;
  goal?: Goal;
  customCalories?: number;
  customProtein?: number;
  customCarbs?: number;
  customFat?: number;
}

export interface RecommendedMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  bmr: number;
  tdee: number;
}

export interface DailyNutrition {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface WeeklyNutrition {
  days: DailyNutrition[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  averages: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
}

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentario (poco o nada de ejercicio)',
  light: 'Ligero (ejercicio 1-3 días/semana)',
  moderate: 'Moderado (ejercicio 3-5 días/semana)',
  active: 'Activo (ejercicio 6-7 días/semana)',
  very_active: 'Muy activo (ejercicio intenso diario)'
};

export const GOAL_LABELS: Record<Goal, string> = {
  maintain: 'Mantener peso',
  lose: 'Perder peso',
  gain: 'Ganar peso/músculo'
};

class ProfileService {
  async getProfile(): Promise<UserProfile> {
    return api.get<UserProfile>('/profile');
  }

  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    return api.put<UserProfile>('/profile', data);
  }

  async getRecommendedMacros(): Promise<RecommendedMacros | null> {
    try {
      const result = await api.get<RecommendedMacros | { message: string }>('/profile/recommended-macros');
      if ('message' in result) {
        return null;
      }
      return result;
    } catch {
      return null;
    }
  }

  async getWeeklyNutrition(startDate: string, endDate: string): Promise<WeeklyNutrition> {
    return api.get<WeeklyNutrition>(`/profile/weekly-nutrition?startDate=${startDate}&endDate=${endDate}`);
  }

  async getDailyNutrition(date: string): Promise<DailyNutrition> {
    const startDate = date;
    const endDate = date;
    const weekly = await this.getWeeklyNutrition(startDate, endDate);
    return weekly.days[0] || {
      date,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0
    };
  }
}

export const profileService = new ProfileService();
