import type { DailyNutrition, RecommendedMacros, WeeklyNutrition } from '@/services/profile'
import type { WeekPlan } from '@/services/shopping'

export type WeekPlanExportPeriod = 'day' | 'week' | 'month'

const formatLocalDate = (date: Date) => {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

const parseLocalDate = (date: string) => new Date(`${date}T00:00:00`)

export function getWeekPlanExportRange(
	period: WeekPlanExportPeriod,
	selectedDay: string,
	weekStart: Date
) {
	if (period === 'day') return { startDate: selectedDay, endDate: selectedDay }

	if (period === 'week') {
		const end = new Date(weekStart)
		end.setDate(end.getDate() + 6)
		return { startDate: formatLocalDate(weekStart), endDate: formatLocalDate(end) }
	}

	const selected = parseLocalDate(selectedDay)
	const start = new Date(selected.getFullYear(), selected.getMonth(), 1)
	const end = new Date(selected.getFullYear(), selected.getMonth() + 1, 0)
	return { startDate: formatLocalDate(start), endDate: formatLocalDate(end) }
}

const percent = (value: number, target: number) =>
	target > 0 ? Math.round((value / target) * 1000) / 10 : null

const nutritionProgress = (nutrition: DailyNutrition, targets: RecommendedMacros | null) =>
	targets
		? {
				caloriesPercent: percent(nutrition.calories, targets.calories),
				proteinPercent: percent(nutrition.protein, targets.protein),
				carbsPercent: percent(nutrition.carbs, targets.carbs),
				fatPercent: percent(nutrition.fat, targets.fat),
				fiberPercent: percent(nutrition.fiber, targets.fiber),
			}
		: null

const exportMeal = (plan: WeekPlan) => {
	if (plan.manualTitle) {
		return {
			source: 'manual' as const,
			entryType: plan.type,
			time: plan.mealTime,
			title: plan.manualTitle,
			consumed: plan.consumed,
			cooked: plan.cooked,
			nutrition: {
				calories: plan.manualCalories,
				protein: plan.manualProtein,
				carbs: plan.manualCarbs,
				fat: plan.manualFat,
				fiber: plan.manualFiber,
			},
			notes: plan.manualNotes,
		}
	}

	if (plan.recipe) {
		return {
			source: 'recipe' as const,
			entryType: plan.type,
			time: plan.mealTime,
			title: plan.recipe.title,
			servings: plan.servings,
			consumed: plan.consumed,
			cooked: plan.cooked,
		}
	}

	return {
		source: 'ingredient' as const,
		entryType: plan.type,
		time: plan.mealTime,
		title: plan.ingredient?.name ?? 'Unknown ingredient',
		quantity: plan.ingredientQty,
		unit: plan.ingredientUnit ?? plan.ingredient?.unit ?? null,
		consumed: plan.consumed,
		cooked: plan.cooked,
	}
}

export function buildWeekPlanExport(params: {
	period: WeekPlanExportPeriod
	startDate: string
	endDate: string
	plans: WeekPlan[]
	nutrition: WeeklyNutrition
	targets: RecommendedMacros | null
	generatedAt?: string
}) {
	const { period, startDate, endDate, plans, nutrition, targets } = params
	const plansByDate = new Map<string, WeekPlan[]>()

	for (const plan of plans) {
		const date = plan.plannedDate.split('T')[0]
		plansByDate.set(date, [...(plansByDate.get(date) ?? []), plan])
	}

	return {
		schemaVersion: 1,
		exportType: period,
		generatedAt: params.generatedAt ?? new Date().toISOString(),
		period: { startDate, endDate },
		units: { energy: 'kcal', nutrients: 'g' },
		targets: targets
			? {
					calories: targets.calories,
					protein: targets.protein,
					carbs: targets.carbs,
					fat: targets.fat,
					fiber: targets.fiber,
					method: targets.method,
				}
			: null,
		summary: {
			days: nutrition.days.length,
			daysWithMeals: nutrition.days.filter((day) => (plansByDate.get(day.date)?.length ?? 0) > 0)
				.length,
			totals: nutrition.totals,
			dailyAverage: nutrition.averages,
			dailyAverageProgress: nutritionProgress({ date: startDate, ...nutrition.averages }, targets),
		},
		days: nutrition.days.map((day) => ({
			date: day.date,
			nutrition: {
				calories: day.calories,
				protein: day.protein,
				carbs: day.carbs,
				fat: day.fat,
				fiber: day.fiber,
			},
			targetProgress: nutritionProgress(day, targets),
			meals: (plansByDate.get(day.date) ?? []).map(exportMeal),
		})),
	}
}

export function downloadWeekPlanExport(data: ReturnType<typeof buildWeekPlanExport>) {
	const content = JSON.stringify(data, null, 2)
	const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
	const url = URL.createObjectURL(blob)
	const anchor = document.createElement('a')
	anchor.href = url
	anchor.download = `meal-plan-${data.exportType}-${data.period.startDate}-${data.period.endDate}.json`
	anchor.style.display = 'none'
	document.body.appendChild(anchor)
	anchor.click()
	anchor.remove()
	URL.revokeObjectURL(url)
}
