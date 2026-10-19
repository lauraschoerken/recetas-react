import type { Workout, WorkoutInput, WorkoutTemplate, WorkoutTemplateInput } from '@/models'
import { api } from '@/services/api'

export type { Workout, WorkoutInput, WorkoutTemplate, WorkoutTemplateInput } from '@/models'

export const workoutService = {
	list(startDate?: string, endDate?: string): Promise<Workout[]> {
		const params = new URLSearchParams()
		if (startDate) params.set('startDate', startDate)
		if (endDate) params.set('endDate', endDate)
		return api.get<Workout[]>(`/workouts${params.size ? `?${params}` : ''}`)
	},
	create(data: WorkoutInput): Promise<Workout> {
		return api.post<Workout>('/workouts', data)
	},
	update(id: number, data: WorkoutInput): Promise<Workout> {
		return api.put<Workout>(`/workouts/${id}`, data)
	},
	remove(id: number): Promise<void> {
		return api.delete<void>(`/workouts/${id}`)
	},
	importJson(payload: unknown): Promise<{ templatesImported: number; importedCount: number; entries: Workout[] }> {
		const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload
		return api.post('/workouts/import', parsed)
	},
	listTemplates(): Promise<WorkoutTemplate[]> {
		return api.get('/workout-templates')
	},
	createTemplate(data: WorkoutTemplateInput): Promise<WorkoutTemplate> {
		return api.post('/workout-templates', data)
	},
	updateTemplate(id: number, data: WorkoutTemplateInput): Promise<WorkoutTemplate> {
		return api.put(`/workout-templates/${id}`, data)
	},
	removeTemplate(id: number): Promise<void> {
		return api.delete(`/workout-templates/${id}`)
	},
}
