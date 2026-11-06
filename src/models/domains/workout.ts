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
	source: string | null
	externalId: string | null
	sourceUrl: string | null
	activityType: string | null
	locationName: string | null
	distanceMeters: number | null
	durationSeconds: number | null
	movingDurationSeconds: number | null
	elapsedDurationSeconds: number | null
	averageSpeedMps: number | null
	averageMovingSpeedMps: number | null
	maxSpeedMps: number | null
	elevationGainMeters: number | null
	elevationLossMeters: number | null
	minElevationMeters: number | null
	maxElevationMeters: number | null
	averageElevationMeters: number | null
	maxHeartRate: number | null
	minHeartRate: number | null
	averageCadence: number | null
	maxCadence: number | null
	steps: number | null
	restingCalories: number | null
	activeCalories: number | null
	estimatedSweatLossMl: number | null
	moderateIntensityMinutes: number | null
	vigorousIntensityMinutes: number | null
	intensityMinutes: number | null
	maxVerticalSpeedMps: number | null
	lapCount: number | null
	averagePowerWatts: number | null
	maxPowerWatts: number | null
	normalizedPowerWatts: number | null
	totalReps: number | null
	totalSets: number | null
	aerobicTrainingEffect: number | null
	anaerobicTrainingEffect: number | null
}

export type GarminWorkoutPreview = Omit<Workout, 'id' | 'createdAt' | 'updatedAt'>

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
	activityType?: string | null
	locationName?: string | null
	distanceMeters?: number | null
	durationSeconds?: number | null
	movingDurationSeconds?: number | null
	elapsedDurationSeconds?: number | null
	averageSpeedMps?: number | null
	averageMovingSpeedMps?: number | null
	maxSpeedMps?: number | null
	elevationGainMeters?: number | null
	elevationLossMeters?: number | null
	minElevationMeters?: number | null
	maxElevationMeters?: number | null
	averageElevationMeters?: number | null
	maxHeartRate?: number | null
	minHeartRate?: number | null
	averageCadence?: number | null
	maxCadence?: number | null
	steps?: number | null
	restingCalories?: number | null
	activeCalories?: number | null
	estimatedSweatLossMl?: number | null
	moderateIntensityMinutes?: number | null
	vigorousIntensityMinutes?: number | null
	intensityMinutes?: number | null
	maxVerticalSpeedMps?: number | null
	lapCount?: number | null
	averagePowerWatts?: number | null
	maxPowerWatts?: number | null
	normalizedPowerWatts?: number | null
	totalReps?: number | null
	totalSets?: number | null
	aerobicTrainingEffect?: number | null
	anaerobicTrainingEffect?: number | null
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
