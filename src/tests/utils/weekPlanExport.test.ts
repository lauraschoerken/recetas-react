import { describe, expect, it } from 'vitest'

import { buildWeekPlanExport, getWeekPlanExportRange } from '@/utils/weekPlanExport'

describe('week plan JSON export', () => {
	it('calculates day, visible week and selected month ranges', () => {
		const weekStart = new Date('2026-09-21T00:00:00')

		expect(getWeekPlanExportRange('day', '2026-09-27', weekStart)).toEqual({
			startDate: '2026-09-27',
			endDate: '2026-09-27',
		})
		expect(getWeekPlanExportRange('week', '2026-09-27', weekStart)).toEqual({
			startDate: '2026-09-21',
			endDate: '2026-09-27',
		})
		expect(getWeekPlanExportRange('month', '2026-09-27', weekStart)).toEqual({
			startDate: '2026-09-01',
			endDate: '2026-09-30',
		})
	})

	it('exports AI-friendly totals, targets, progress and manual meals', () => {
		const result = buildWeekPlanExport({
			period: 'day',
			startDate: '2026-09-27',
			endDate: '2026-09-27',
			generatedAt: '2026-09-27T12:00:00.000Z',
			plans: [
				{
					id: 1,
					plannedDate: '2026-09-27T12:00:00.000Z',
					servings: 1,
					type: 'meal',
					cooked: false,
					consumed: true,
					userId: 1,
					recipeId: null,
					ingredientId: null,
					ingredientQty: null,
					ingredientUnit: null,
					manualTitle: 'Yogur con fruta',
					manualCalories: 250,
					manualProtein: 18,
					manualCarbs: 30,
					manualFat: 6,
					manualFiber: 5,
					manualNotes: null,
					mealTime: '09:00',
					createdAt: '2026-09-27T09:00:00.000Z',
					recipe: null,
					ingredient: null,
				},
			],
			nutrition: {
				days: [{ date: '2026-09-27', calories: 250, protein: 18, carbs: 30, fat: 6, fiber: 5 }],
				totals: { calories: 250, protein: 18, carbs: 30, fat: 6, fiber: 5 },
				averages: { calories: 250, protein: 18, carbs: 30, fat: 6, fiber: 5 },
			},
			targets: {
				calories: 2000,
				protein: 120,
				carbs: 220,
				fat: 65,
				fiber: 25,
				bmr: 1500,
				tdee: 2100,
				method: 'Mifflin-St Jeor',
				proteinPerKg: 1.6,
				referenceWeight: 70,
				calorieAdjustmentPercent: -15,
				calorieFloorApplied: false,
			},
		})

		expect(result.summary.daysWithMeals).toBe(1)
		expect(result.days[0].targetProgress?.fiberPercent).toBe(20)
		expect(result.days[0].meals[0]).toMatchObject({
			source: 'manual',
			title: 'Yogur con fruta',
			nutrition: { calories: 250, fiber: 5 },
		})
	})
})
