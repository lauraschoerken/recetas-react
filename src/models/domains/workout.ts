export interface Workout {
	id: number
	title: string
	performedAt: string
	durationMinutes: number | null
	caloriesBurned: number | null
	averageHeartRate: number | null
	exercises: string | null
	notes: string | null
	addCaloriesToGoal: boolean
	templateId?: number | null
	createdAt: string
	updatedAt: string
}

export interface WorkoutInput {
	title: string
	performedAt: string
	durationMinutes?: number | null
	caloriesBurned?: number | null
	averageHeartRate?: number | null
	exercises?: string | null
	notes?: string | null
	addCaloriesToGoal?: boolean
	templateId?: number | null
}

export interface WorkoutTemplate {
	id: number
	title: string
	durationMinutes: number | null
	caloriesBurned: number | null
	averageHeartRate: number | null
	exercises: string | null
	notes: string | null
	defaultAddCaloriesToGoal: boolean
}

export interface WorkoutTemplateInput {
	title: string
	durationMinutes?: number | null
	caloriesBurned?: number | null
	averageHeartRate?: number | null
	exercises?: string | null
	notes?: string | null
	defaultAddCaloriesToGoal?: boolean
}
