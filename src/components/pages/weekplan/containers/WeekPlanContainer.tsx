import './WeekPlanContainer.scss'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import {
	DailyNutrition,
	profileService,
	RecommendedMacros,
	WeeklyNutrition,
} from '@/services/profile'
import { shoppingService, WeekPlan } from '@/services/shopping'
import { ingredientService, Ingredient } from '@/services/ingredient'
import { Recipe, recipeService } from '@/services/recipe'
import { useDialog } from '@/utils/dialog/DialogContext'

import { AddToWeekModal } from '@/components/shared/modals/AddToWeekModal'
import { WeekCalendar } from '../components/WeekCalendar'

function getWeekStart(date: Date): Date {
	const d = new Date(date)
	const day = d.getDay()
	const diff = d.getDate() - day + (day === 0 ? -6 : 1)
	d.setDate(diff)
	d.setHours(0, 0, 0, 0)
	return d
}

function getWeekEnd(startDate: Date): Date {
	const d = new Date(startDate)
	d.setDate(d.getDate() + 6)
	d.setHours(23, 59, 59, 999)
	return d
}

function formatDateStr(date: Date): string {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

export function WeekPlanContainer() {
	const { t } = useTranslation()
	const DAY_NAMES = t('weekPlan.dayAbbr', { returnObjects: true }) as string[]
	const { confirm, toast } = useDialog()
	const [weekPlans, setWeekPlans] = useState<WeekPlan[]>([])
	const [loading, setLoading] = useState(true)
	const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()))
	const [selectedDay, setSelectedDay] = useState<string>(() => formatDateStr(new Date()))
	const [selectedDayNutrition, setSelectedDayNutrition] = useState<DailyNutrition | null>(null)
	const [weeklyNutrition, setWeeklyNutrition] = useState<WeeklyNutrition | null>(null)
	const [recommendedMacros, setRecommendedMacros] = useState<RecommendedMacros | null>(null)
	const [showWeeklySummary, setShowWeeklySummary] = useState(false)

	// Add ingredient form
	const [showAddIngredient, setShowAddIngredient] = useState(false)
	const [allIngredients, setAllIngredients] = useState<Ingredient[]>([])
	const [ingredientSearch, setIngredientSearch] = useState('')
	const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null)
	const [ingredientQty, setIngredientQty] = useState<number>(100)
	const [ingredientUnit, setIngredientUnit] = useState<string>('g')
	const [addIngredientDate, setAddIngredientDate] = useState<string>(() =>
		formatDateStr(new Date())
	)
	const [addingIngredient, setAddingIngredient] = useState(false)
	const [ingredientModalOriginDate, setIngredientModalOriginDate] = useState<string | null>(null)

	// Day detail modal
	const [dayModalDate, setDayModalDate] = useState<string | null>(null)
	const [dayModalMode, setDayModalMode] = useState<'recipe' | 'ingredient'>('recipe')
	const [allRecipes, setAllRecipes] = useState<Recipe[]>([])
	const [recipeSearch, setRecipeSearch] = useState('')
	const [dayIngredientSearch, setDayIngredientSearch] = useState('')
	const [selectedIngredientForDay, setSelectedIngredientForDay] = useState<Ingredient | null>(null)
	const [dayIngredientQty, setDayIngredientQty] = useState<number>(100)
	const [dayIngredientUnit, setDayIngredientUnit] = useState<string>('g')
	const [addingIngredientFromDay, setAddingIngredientFromDay] = useState(false)
	const [selectedRecipeForWeek, setSelectedRecipeForWeek] = useState<Recipe | null>(null)
	const [selectedRecipeDate, setSelectedRecipeDate] = useState<string | null>(null)

	useEffect(() => {
		loadWeekPlan()
		loadWeeklyNutrition()
		loadRecommendedMacros()

		// Actualizar día seleccionado si no está en la semana actual
		const weekEnd = getWeekEnd(currentWeekStart)
		const selectedDate = new Date(selectedDay)
		if (selectedDate < currentWeekStart || selectedDate > weekEnd) {
			// Si hoy está en la semana actual, seleccionar hoy
			const today = new Date()
			if (today >= currentWeekStart && today <= weekEnd) {
				setSelectedDay(formatDateStr(today))
			} else {
				// Si no, seleccionar el primer día de la semana
				setSelectedDay(formatDateStr(currentWeekStart))
			}
		}
	}, [currentWeekStart])

	useEffect(() => {
		if (!weeklyNutrition) return

		// Buscar el día en la nutrición semanal
		const dayNutrition = weeklyNutrition.days.find((d) => d.date === selectedDay)
		console.log(
			'Looking for day:',
			selectedDay,
			'Available days:',
			weeklyNutrition.days.map((d) => d.date)
		)
		setSelectedDayNutrition(dayNutrition || null)
	}, [selectedDay, weeklyNutrition])

	const loadRecommendedMacros = async () => {
		try {
			const macros = await profileService.getRecommendedMacros()
			setRecommendedMacros(macros)
		} catch (error) {
			console.error('Error loading recommended macros:', error)
		}
	}

	const loadWeeklyNutrition = async () => {
		try {
			const endDate = getWeekEnd(currentWeekStart)
			const nutrition = await profileService.getWeeklyNutrition(
				formatDateStr(currentWeekStart),
				formatDateStr(endDate)
			)
			setWeeklyNutrition(nutrition)
		} catch (error) {
			console.error('Error loading weekly nutrition:', error)
		}
	}

	const loadWeekPlan = async () => {
		setLoading(true)
		try {
			const endDate = getWeekEnd(currentWeekStart)
			const data = await shoppingService.getWeekPlan(
				currentWeekStart.toISOString(),
				endDate.toISOString()
			)
			setWeekPlans(data)
		} catch {
			console.error('Error al cargar el plan semanal')
		} finally {
			setLoading(false)
		}
	}

	const handleRemove = async (id: number) => {
		const confirmed = await confirm({
			title: t('weekPlan.deleteTitle'),
			message: t('weekPlan.deleteConfirm'),
			confirmText: t('delete'),
			type: 'danger',
		})
		if (!confirmed) return

		try {
			await shoppingService.removeFromWeekPlan(id)
			setWeekPlans(weekPlans.filter((p) => p.id !== id))
			loadWeeklyNutrition()
			toast.success(t('weekPlan.deleted'))
		} catch {
			toast.error(t('weekPlan.deleteError'))
		}
	}

	const handleMovePlan = async (planId: number, newDate: string) => {
		const plan = weekPlans.find((p) => p.id === planId)
		if (!plan) return

		const currentDate = plan.plannedDate.split('T')[0]
		if (currentDate === newDate) return

		try {
			const updatedPlan = await shoppingService.updatePlanDate(planId, newDate)
			setWeekPlans(weekPlans.map((p) => (p.id === planId ? updatedPlan : p)))
			loadWeeklyNutrition()
		} catch {
			toast.error(t('weekPlan.moveError'))
		}
	}

	const handleCook = async (planId: number, leftoverServings: number, leftoverLocation: string) => {
		try {
			await shoppingService.markAsCooked(planId, leftoverServings, leftoverLocation)
			setWeekPlans(weekPlans.map((p) => (p.id === planId ? { ...p, cooked: true } : p)))
			loadWeeklyNutrition()
			toast.success(t('weekPlan.cooked'))
		} catch {
			toast.error(t('weekPlan.cookError'))
		}
	}

	const handleConsume = async (planId: number) => {
		try {
			await shoppingService.markAsConsumed(planId)
			setWeekPlans(weekPlans.map((p) => (p.id === planId ? { ...p, consumed: true } : p)))
			loadWeeklyNutrition()
			toast.success(t('weekPlan.consumed'))
		} catch {
			toast.error(t('weekPlan.consumeError'))
		}
	}

	const goToPreviousWeek = () => {
		const prev = new Date(currentWeekStart)
		prev.setDate(prev.getDate() - 7)
		setCurrentWeekStart(prev)
	}

	const goToNextWeek = () => {
		const next = new Date(currentWeekStart)
		next.setDate(next.getDate() + 7)
		setCurrentWeekStart(next)
	}

	const goToCurrentWeek = () => {
		setCurrentWeekStart(getWeekStart(new Date()))
	}

	const handleOpenAddIngredient = async () => {
		setShowAddIngredient(true)
		setAddIngredientDate(selectedDay)
		setIngredientModalOriginDate(null)
		if (allIngredients.length === 0) {
			try {
				const ingredients = await ingredientService.getAll()
				setAllIngredients(ingredients)
			} catch {
				console.error('Error loading ingredients')
			}
		}
	}

	const handleSelectIngredient = (ing: Ingredient) => {
		setSelectedIngredient(ing)
		setIngredientUnit(ing.unit)
		setIngredientSearch(ing.name)
	}

	const handleAddIngredient = async () => {
		if (!selectedIngredient || ingredientQty <= 0) return
		setAddingIngredient(true)
		try {
			const result = await shoppingService.addToWeekPlan({
				ingredientId: selectedIngredient.id,
				ingredientQty,
				ingredientUnit,
				plannedDate: addIngredientDate,
			})
			setWeekPlans([...weekPlans, result])
			loadWeeklyNutrition()
			toast.success(t('weekPlan.ingredientAdded'))
			handleCloseAddIngredient()
		} catch {
			toast.error(t('weekPlan.addError'))
		} finally {
			setAddingIngredient(false)
		}
	}

	const handleCloseAddIngredient = () => {
		setShowAddIngredient(false)
		setSelectedIngredient(null)
		setIngredientSearch('')
		setIngredientQty(100)
		if (ingredientModalOriginDate) {
			setDayModalDate(ingredientModalOriginDate)
			setIngredientModalOriginDate(null)
		}
	}

	const filteredIngredients =
		ingredientSearch.length >= 2
			? allIngredients.filter(
					(i) =>
						i.name.toLowerCase().includes(ingredientSearch.toLowerCase()) &&
						i.id !== selectedIngredient?.id
				)
			: []

	const handleDayClick = async (dateStr: string) => {
		setDayModalDate(dateStr)
		setDayModalMode('recipe')
		setRecipeSearch('')
		setDayIngredientSearch('')
		setSelectedIngredientForDay(null)
		setDayIngredientQty(100)
		setDayIngredientUnit('g')
		if (allRecipes.length === 0) {
			try {
				const recipes = await recipeService.getAll()
				setAllRecipes(recipes)
			} catch {
				console.error('Error loading recipes')
			}
		}
		if (allIngredients.length === 0) {
			try {
				const ingredients = await ingredientService.getAll()
				setAllIngredients(ingredients)
			} catch {
				console.error('Error loading ingredients')
			}
		}
	}

	const dayModalPlans = dayModalDate
		? weekPlans.filter((p) => p.plannedDate.split('T')[0] === dayModalDate)
		: []

	const filteredRecipesForDay =
		recipeSearch.length >= 2
			? allRecipes.filter((r) => r.title.toLowerCase().includes(recipeSearch.toLowerCase()))
			: []

	const filteredIngredientsForDay =
		dayIngredientSearch.length >= 2
			? allIngredients.filter(
					(i) =>
						i.name.toLowerCase().includes(dayIngredientSearch.toLowerCase()) &&
						i.id !== selectedIngredientForDay?.id
				)
			: []

	const handlePickRecipeForDay = (recipe: Recipe) => {
		setSelectedRecipeDate(dayModalDate)
		setSelectedRecipeForWeek(recipe)
	}

	const handleSelectIngredientForDay = (ingredient: Ingredient) => {
		setSelectedIngredientForDay(ingredient)
		setDayIngredientUnit(ingredient.unit)
		setDayIngredientSearch(ingredient.name)
	}

	const handleAddToWeekSuccess = () => {
		setSelectedRecipeForWeek(null)
		setSelectedRecipeDate(null)
		setDayModalDate(null)
		loadWeekPlan()
		loadWeeklyNutrition()
	}

	const handleAddIngredientFromDay = async () => {
		if (!dayModalDate || !selectedIngredientForDay || dayIngredientQty <= 0) return
		setAddingIngredientFromDay(true)
		try {
			const result = await shoppingService.addToWeekPlan({
				ingredientId: selectedIngredientForDay.id,
				ingredientQty: dayIngredientQty,
				ingredientUnit: dayIngredientUnit,
				plannedDate: dayModalDate,
			})
			setWeekPlans((prev) => [...prev, result])
			loadWeeklyNutrition()
			toast.success(t('weekPlan.ingredientAdded'))
			setSelectedIngredientForDay(null)
			setDayIngredientSearch('')
			setDayIngredientQty(100)
			setDayIngredientUnit('g')
		} catch {
			toast.error(t('weekPlan.addError'))
		} finally {
			setAddingIngredientFromDay(false)
		}
	}

	const canGoToPreviousDay = !!dayModalDate && dayModalDate > formatDateStr(currentWeekStart)
	const canGoToNextDay =
		!!dayModalDate && dayModalDate < formatDateStr(getWeekEnd(currentWeekStart))

	const shiftDayModal = (offset: number) => {
		if (!dayModalDate) return
		const current = new Date(`${dayModalDate}T12:00:00`)
		current.setDate(current.getDate() + offset)
		const candidate = formatDateStr(current)
		if (
			candidate < formatDateStr(currentWeekStart) ||
			candidate > formatDateStr(getWeekEnd(currentWeekStart))
		) {
			return
		}
		setDayModalDate(candidate)
		setDayModalMode('recipe')
		setRecipeSearch('')
		setDayIngredientSearch('')
		setSelectedIngredientForDay(null)
	}

	const getWeekDays = () => {
		const days = []
		for (let i = 0; i < 7; i++) {
			const d = new Date(currentWeekStart)
			d.setDate(d.getDate() + i)
			days.push({
				date: formatDateStr(d),
				label: DAY_NAMES[i],
				dayNum: d.getDate(),
				isToday: formatDateStr(d) === formatDateStr(new Date()),
			})
		}
		return days
	}

	const weekDays = getWeekDays()
	const weekEndDate = getWeekEnd(currentWeekStart)
	const weekLabel = `${currentWeekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${weekEndDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`

	const getProgressPercent = (current: number, target: number) => {
		if (!target) return 0
		return Math.min(100, Math.round((current / target) * 100))
	}

	const getProgressColor = (percent: number) => {
		if (percent < 80) return 'progress-low'
		if (percent <= 110) return 'progress-good'
		return 'progress-high'
	}

	const getMacroDistribution = (protein: number, carbs: number, fat: number) => {
		const proteinCal = protein * 4
		const carbsCal = carbs * 4
		const fatCal = fat * 9
		const totalCal = proteinCal + carbsCal + fatCal

		if (totalCal === 0) return { protein: 0, carbs: 0, fat: 0 }

		return {
			protein: Math.round((proteinCal / totalCal) * 100),
			carbs: Math.round((carbsCal / totalCal) * 100),
			fat: Math.round((fatCal / totalCal) * 100),
		}
	}

	const macroDistribution = selectedDayNutrition
		? getMacroDistribution(
				selectedDayNutrition.protein,
				selectedDayNutrition.carbs,
				selectedDayNutrition.fat
			)
		: { protein: 0, carbs: 0, fat: 0 }

	const weeklyMacroDistribution = weeklyNutrition
		? getMacroDistribution(
				weeklyNutrition.averages.protein,
				weeklyNutrition.averages.carbs,
				weeklyNutrition.averages.fat
			)
		: { protein: 0, carbs: 0, fat: 0 }

	return (
		<>
			<div className='page-header'>
				<h1 className='page-title'>{t('weekPlan.title')}</h1>
				<div className='page-header-actions'>
					<button className='btn btn-outline' onClick={handleOpenAddIngredient}>
						{t('weekPlan.addIngredient')}
					</button>
					<Link to='/recipes' className='btn btn-primary'>
						{t('weekPlan.addRecipe')}
					</Link>
				</div>
			</div>

			<div className='nutrition-panel'>
				<div className='nutrition-panel-header'>
					<div className='day-selector'>
						{weekDays.map((day) => (
							<button
								key={day.date}
								className={`day-btn ${selectedDay === day.date ? 'active' : ''} ${day.isToday ? 'today' : ''}`}
								onClick={() => setSelectedDay(day.date)}>
								<span className='day-label'>{day.label}</span>
								<span className='day-num'>{day.dayNum}</span>
							</button>
						))}
					</div>
					<button
						className={`summary-toggle ${showWeeklySummary ? 'active' : ''}`}
						onClick={() => setShowWeeklySummary(!showWeeklySummary)}>
						{showWeeklySummary ? t('weekPlan.viewDay') : t('weekPlan.viewWeek')}
					</button>
				</div>

				{!showWeeklySummary ? (
					<div className='daily-nutrition'>
						{recommendedMacros && selectedDayNutrition ? (
							<div className='nutrition-with-chart'>
								<div className='macro-progress-grid'>
									<div className='macro-progress-item'>
										<div className='macro-progress-header'>
											<span className='macro-progress-label'>{t('weekPlan.calories')}</span>
											<span className='macro-progress-values'>
												<strong>{selectedDayNutrition.calories}</strong> /{' '}
												{recommendedMacros.calories} kcal
											</span>
										</div>
										<div className='progress-bar'>
											<div
												className={`progress-fill ${getProgressColor(getProgressPercent(selectedDayNutrition.calories, recommendedMacros.calories))}`}
												style={{
													width: `${getProgressPercent(selectedDayNutrition.calories, recommendedMacros.calories)}%`,
												}}
											/>
										</div>
									</div>

									<div className='macro-progress-item'>
										<div className='macro-progress-header'>
											<span className='macro-progress-label'>{t('weekPlan.protein')}</span>
											<span className='macro-progress-values'>
												<strong>{selectedDayNutrition.protein}g</strong> /{' '}
												{recommendedMacros.protein}g
											</span>
										</div>
										<div className='progress-bar'>
											<div
												className={`progress-fill protein ${getProgressColor(getProgressPercent(selectedDayNutrition.protein, recommendedMacros.protein))}`}
												style={{
													width: `${getProgressPercent(selectedDayNutrition.protein, recommendedMacros.protein)}%`,
												}}
											/>
										</div>
									</div>

									<div className='macro-progress-item'>
										<div className='macro-progress-header'>
											<span className='macro-progress-label'>{t('weekPlan.carbs')}</span>
											<span className='macro-progress-values'>
												<strong>{selectedDayNutrition.carbs}g</strong> / {recommendedMacros.carbs}g
											</span>
										</div>
										<div className='progress-bar'>
											<div
												className={`progress-fill carbs ${getProgressColor(getProgressPercent(selectedDayNutrition.carbs, recommendedMacros.carbs))}`}
												style={{
													width: `${getProgressPercent(selectedDayNutrition.carbs, recommendedMacros.carbs)}%`,
												}}
											/>
										</div>
									</div>

									<div className='macro-progress-item'>
										<div className='macro-progress-header'>
											<span className='macro-progress-label'>{t('weekPlan.fat')}</span>
											<span className='macro-progress-values'>
												<strong>{selectedDayNutrition.fat}g</strong> / {recommendedMacros.fat}g
											</span>
										</div>
										<div className='progress-bar'>
											<div
												className={`progress-fill fat ${getProgressColor(getProgressPercent(selectedDayNutrition.fat, recommendedMacros.fat))}`}
												style={{
													width: `${getProgressPercent(selectedDayNutrition.fat, recommendedMacros.fat)}%`,
												}}
											/>
										</div>
									</div>
								</div>

								{selectedDayNutrition.calories > 0 && (
									<div className='macro-chart-container'>
										<div
											className='macro-donut-chart'
											style={{
												background: `conic-gradient(
                          #2563eb 0% ${macroDistribution.protein}%,
                          #16a34a ${macroDistribution.protein}% ${macroDistribution.protein + macroDistribution.carbs}%,
                          #db2777 ${macroDistribution.protein + macroDistribution.carbs}% 100%
                        )`,
											}}>
											<div className='macro-donut-hole'>
												<span className='macro-donut-calories'>
													{selectedDayNutrition.calories}
												</span>
												<span className='macro-donut-label'>{t('weekPlan.kcal')}</span>
											</div>
										</div>
										<div className='macro-chart-legend'>
											<div className='legend-item'>
												<span className='legend-color protein'></span>
												<span className='legend-text'>Prot {macroDistribution.protein}%</span>
											</div>
											<div className='legend-item'>
												<span className='legend-color carbs'></span>
												<span className='legend-text'>Carbs {macroDistribution.carbs}%</span>
											</div>
											<div className='legend-item'>
												<span className='legend-color fat'></span>
												<span className='legend-text'>
													{t('weekPlan.fat')} {macroDistribution.fat}%
												</span>
											</div>
										</div>
									</div>
								)}
							</div>
						) : !recommendedMacros ? (
							<div className='nutrition-empty'>
								<p>{t('weekPlan.configureProfile')}</p>
								<Link to='/macros' className='btn btn-outline btn-sm'>
									{t('weekPlan.goToSettings')}
								</Link>
							</div>
						) : selectedDayNutrition ? (
							<div className='today-nutrition-macros'>
								<div className='nutrition-macro macro-calories'>
									<span className='nutrition-value'>{selectedDayNutrition.calories}</span>
									<span className='nutrition-label'>{t('weekPlan.kcal')}</span>
								</div>
								<div className='nutrition-macro macro-protein'>
									<span className='nutrition-value'>{selectedDayNutrition.protein}g</span>
									<span className='nutrition-label'>{t('weekPlan.proteinShort')}</span>
								</div>
								<div className='nutrition-macro macro-carbs'>
									<span className='nutrition-value'>{selectedDayNutrition.carbs}g</span>
									<span className='nutrition-label'>{t('weekPlan.carbosShort')}</span>
								</div>
								<div className='nutrition-macro macro-fat'>
									<span className='nutrition-value'>{selectedDayNutrition.fat}g</span>
									<span className='nutrition-label'>{t('weekPlan.fatShort')}</span>
								</div>
							</div>
						) : (
							<div className='nutrition-empty'>
								<p>{t('weekPlan.noMealsPlanned')}</p>
							</div>
						)}
					</div>
				) : (
					<div className='weekly-summary'>
						{weeklyNutrition && (
							<>
								<div className='weekly-summary-stats'>
									<div className='weekly-summary-section'>
										<h4>{t('weekPlan.dailyAverage')}</h4>
										<div className='weekly-stats'>
											<div className='weekly-stat'>
												<span className='stat-value calories'>
													{weeklyNutrition.averages.calories}
												</span>
												<span className='stat-label'>{t('weekPlan.kcal')}</span>
												{recommendedMacros && (
													<span className='stat-target'>/ {recommendedMacros.calories}</span>
												)}
											</div>
											<div className='weekly-stat'>
												<span className='stat-value protein'>
													{weeklyNutrition.averages.protein}g
												</span>
												<span className='stat-label'>{t('weekPlan.prot')}</span>
											</div>
											<div className='weekly-stat'>
												<span className='stat-value carbs'>{weeklyNutrition.averages.carbs}g</span>
												<span className='stat-label'>{t('weekPlan.carbsShort')}</span>
											</div>
											<div className='weekly-stat'>
												<span className='stat-value fat'>{weeklyNutrition.averages.fat}g</span>
												<span className='stat-label'>{t('weekPlan.fatShort')}</span>
											</div>
										</div>
									</div>

									<div className='weekly-summary-section'>
										<h4>{t('weekPlan.weekTotal')}</h4>
										<div className='weekly-stats'>
											<div className='weekly-stat'>
												<span className='stat-value'>
													{weeklyNutrition.totals.calories.toLocaleString()}
												</span>
												<span className='stat-label'>{t('weekPlan.kcal')}</span>
											</div>
											<div className='weekly-stat'>
												<span className='stat-value'>{weeklyNutrition.totals.protein}g</span>
												<span className='stat-label'>{t('weekPlan.prot')}</span>
											</div>
											<div className='weekly-stat'>
												<span className='stat-value'>{weeklyNutrition.totals.carbs}g</span>
												<span className='stat-label'>{t('weekPlan.carbsShort')}</span>
											</div>
											<div className='weekly-stat'>
												<span className='stat-value'>{weeklyNutrition.totals.fat}g</span>
												<span className='stat-label'>{t('weekPlan.fatShort')}</span>
											</div>
										</div>
									</div>
								</div>

								{weeklyNutrition.averages.calories > 0 && (
									<div className='macro-chart-container'>
										<div
											className='macro-donut-chart'
											style={{
												background: `conic-gradient(
                          #2563eb 0% ${weeklyMacroDistribution.protein}%,
                          #16a34a ${weeklyMacroDistribution.protein}% ${weeklyMacroDistribution.protein + weeklyMacroDistribution.carbs}%,
                          #db2777 ${weeklyMacroDistribution.protein + weeklyMacroDistribution.carbs}% 100%
                        )`,
											}}>
											<div className='macro-donut-hole'>
												<span className='macro-donut-calories'>
													{weeklyNutrition.averages.calories}
												</span>
												<span className='macro-donut-label'>{t('weekPlan.avgPerDay')}</span>
											</div>
										</div>
										<div className='macro-chart-legend'>
											<div className='legend-item'>
												<span className='legend-color protein'></span>
												<span className='legend-text'>Prot {weeklyMacroDistribution.protein}%</span>
											</div>
											<div className='legend-item'>
												<span className='legend-color carbs'></span>
												<span className='legend-text'>Carbs {weeklyMacroDistribution.carbs}%</span>
											</div>
											<div className='legend-item'>
												<span className='legend-color fat'></span>
												<span className='legend-text'>
													{t('weekPlan.fat')} {weeklyMacroDistribution.fat}%
												</span>
											</div>
										</div>
									</div>
								)}
							</>
						)}
					</div>
				)}
			</div>

			<div className='card mb-2'>
				<div className='flex flex-between flex-center'>
					<button className='btn btn-outline btn-sm' onClick={goToPreviousWeek}>
						&larr; {t('weekPlan.prev')}
					</button>
					<div className='text-center'>
						<strong>{weekLabel}</strong>
						<button
							className='btn btn-outline btn-sm'
							onClick={goToCurrentWeek}
							style={{ marginLeft: '1rem' }}>
							{t('weekPlan.today')}
						</button>
					</div>
					<button className='btn btn-outline btn-sm' onClick={goToNextWeek}>
						{t('weekPlan.next')} &rarr;
					</button>
				</div>
			</div>

			{loading ? (
				<div className='loading'>{t('weekPlan.loadingPlan')}</div>
			) : (
				<WeekCalendar
					weekPlans={weekPlans}
					startDate={currentWeekStart}
					onRemove={handleRemove}
					onMovePlan={handleMovePlan}
					onCook={handleCook}
					onConsume={handleConsume}
					onDayClick={handleDayClick}
				/>
			)}

			{!loading && weekPlans.length > 0 && (
				<div className='mt-2'>
					<Link to='/shopping-list' className='btn btn-primary'>
						{t('weekPlan.viewShoppingList')}
					</Link>
				</div>
			)}

			{showAddIngredient && (
				<div className='modal-overlay' onClick={handleCloseAddIngredient}>
					<div className='modal-card' onClick={(e) => e.stopPropagation()}>
						<h3>{t('weekPlan.addIngredientTitle')}</h3>

						<div className='form-group'>
							<label>{t('weekPlan.dateLabel')}</label>
							<input
								type='date'
								value={addIngredientDate}
								onChange={(e) => setAddIngredientDate(e.target.value)}
							/>
						</div>

						<div className='form-group'>
							<label>{t('ingredients.ingredientLabel')}</label>
							<input
								type='text'
								value={ingredientSearch}
								onChange={(e) => {
									setIngredientSearch(e.target.value)
									if (selectedIngredient && e.target.value !== selectedIngredient.name) {
										setSelectedIngredient(null)
									}
								}}
								placeholder={t('ingredients.searchPlaceholder')}
								autoFocus
							/>
							{filteredIngredients.length > 0 && !selectedIngredient && (
								<ul className='suggestions-list'>
									{filteredIngredients.slice(0, 8).map((ing) => (
										<li key={ing.id} onClick={() => handleSelectIngredient(ing)}>
											{ing.name} <span className='text-secondary'>({ing.unit})</span>
										</li>
									))}
								</ul>
							)}
						</div>

						{selectedIngredient && (
							<div className='form-row'>
								<div className='form-group'>
									<label>{t('ingredients.quantityPlaceholder')}</label>
									<input
										type='number'
										min='0'
										step='any'
										value={ingredientQty}
										onChange={(e) => setIngredientQty(parseFloat(e.target.value) || 0)}
									/>
								</div>
								<div className='form-group'>
									<label>{t('ingredients.unitHeader')}</label>
									<select
										value={ingredientUnit}
										onChange={(e) => setIngredientUnit(e.target.value)}>
										<option value={selectedIngredient.unit}>{selectedIngredient.unit}</option>
										{selectedIngredient.unit === 'g' && <option value='kg'>kg</option>}
										{selectedIngredient.unit === 'ml' && <option value='l'>l</option>}
										{(selectedIngredient.conversions || []).map((c) => (
											<option key={c.id} value={c.unitName}>
												{c.unitName}
											</option>
										))}
									</select>
								</div>
							</div>
						)}

						<div className='modal-actions'>
							<button className='btn btn-outline' onClick={handleCloseAddIngredient}>
								{t('cancel')}
							</button>
							<button
								className='btn btn-primary'
								disabled={!selectedIngredient || ingredientQty <= 0 || addingIngredient}
								onClick={handleAddIngredient}>
								{addingIngredient ? t('weekPlan.adding') : t('weekPlan.addBtn')}
							</button>
						</div>
					</div>
				</div>
			)}

			{dayModalDate && !selectedRecipeForWeek && (
				<div className='modal-overlay' onClick={() => setDayModalDate(null)}>
					<button
						type='button'
						className='day-modal-nav day-modal-nav-left'
						disabled={!canGoToPreviousDay}
						onClick={(e) => {
							e.stopPropagation()
							shiftDayModal(-1)
						}}
						aria-label={t('weekPlan.prev')}>
						‹
					</button>

					<div className='modal-card modal-card-lg' onClick={(e) => e.stopPropagation()}>
						<h3>
							{new Date(dayModalDate + 'T12:00:00').toLocaleDateString('es-ES', {
								weekday: 'long',
								day: 'numeric',
								month: 'long',
							})}
						</h3>

						{dayModalPlans.length > 0 ? (
							<div className='day-modal-plans'>
								{dayModalPlans.map((plan) => (
									<div key={plan.id} className='day-modal-plan-item'>
										<span className='day-modal-plan-type'>
											{plan.type === 'meal' ? '🍽️' : '👩‍🍳'}
										</span>
										<span className='day-modal-plan-name'>
											{plan.ingredient
												? `🥬 ${plan.ingredient.name} (${plan.ingredientQty} ${plan.ingredientUnit})`
												: plan.recipe?.title || t('noTitle')}
										</span>
										<span className='day-modal-plan-servings'>
											{plan.servings > 0 && `${plan.servings} ${t('weekPlan.portions')}`}
										</span>
									</div>
								))}
							</div>
						) : (
							<p className='text-secondary'>{t('weekPlan.noMealsPlanned')}</p>
						)}

						<div className='day-modal-search'>
							<h4 className='day-modal-search-title'>{t('weekPlan.quickAdd')}</h4>
							<p className='day-modal-search-subtitle'>{t('weekPlan.quickAddHint')}</p>
							<div className='day-modal-segment'>
								<button
									type='button'
									className={`day-modal-tab ${dayModalMode === 'recipe' ? 'active' : ''}`}
									onClick={() => setDayModalMode('recipe')}>
									{t('weekPlan.quickModeRecipe')}
								</button>
								<button
									type='button'
									className={`day-modal-tab ${dayModalMode === 'ingredient' ? 'active' : ''}`}
									onClick={() => setDayModalMode('ingredient')}>
									{t('weekPlan.quickModeIngredient')}
								</button>
							</div>

							{dayModalMode === 'recipe' ? (
								<>
									<input
										className='day-modal-input'
										type='text'
										value={recipeSearch}
										onChange={(e) => setRecipeSearch(e.target.value)}
										placeholder={t('weekPlan.searchRecipe')}
										autoFocus
									/>
									{filteredRecipesForDay.length > 0 && (
										<ul className='suggestions-list'>
											{filteredRecipesForDay.slice(0, 6).map((r) => (
												<li key={r.id} onClick={() => handlePickRecipeForDay(r)}>
													📖 {r.title}{' '}
													<span className='text-secondary'>
														({r.servings} {t('weekPlan.portions')})
													</span>
												</li>
											))}
										</ul>
									)}
								</>
							) : (
								<>
									<input
										className='day-modal-input'
										type='text'
										value={dayIngredientSearch}
										onChange={(e) => {
											setDayIngredientSearch(e.target.value)
											if (
												selectedIngredientForDay &&
												e.target.value !== selectedIngredientForDay.name
											) {
												setSelectedIngredientForDay(null)
											}
										}}
										placeholder={t('ingredients.searchPlaceholder')}
										autoFocus
									/>
									{filteredIngredientsForDay.length > 0 && !selectedIngredientForDay && (
										<ul className='suggestions-list'>
											{filteredIngredientsForDay.slice(0, 8).map((ing) => (
												<li key={ing.id} onClick={() => handleSelectIngredientForDay(ing)}>
													🥬 {ing.name} <span className='text-secondary'>({ing.unit})</span>
												</li>
											))}
										</ul>
									)}
									{selectedIngredientForDay && (
										<div className='form-row day-modal-inline-fields'>
											<div className='form-group'>
												<label>{t('ingredients.quantityPlaceholder')}</label>
												<input
													type='number'
													min='0'
													step='any'
													value={dayIngredientQty}
													onChange={(e) => setDayIngredientQty(parseFloat(e.target.value) || 0)}
												/>
											</div>
											<div className='form-group'>
												<label>{t('ingredients.unitHeader')}</label>
												<select
													value={dayIngredientUnit}
													onChange={(e) => setDayIngredientUnit(e.target.value)}>
													<option value={selectedIngredientForDay.unit}>
														{selectedIngredientForDay.unit}
													</option>
													{selectedIngredientForDay.unit === 'g' && <option value='kg'>kg</option>}
													{selectedIngredientForDay.unit === 'ml' && <option value='l'>l</option>}
													{(selectedIngredientForDay.conversions || []).map((c) => (
														<option key={c.id} value={c.unitName}>
															{c.unitName}
														</option>
													))}
												</select>
											</div>
										</div>
									)}
								</>
							)}
						</div>

						<div className='modal-actions'>
							{dayModalMode === 'ingredient' && (
								<button
									className='btn btn-primary'
									disabled={
										!selectedIngredientForDay || dayIngredientQty <= 0 || addingIngredientFromDay
									}
									onClick={handleAddIngredientFromDay}>
									{addingIngredientFromDay ? t('weekPlan.adding') : t('weekPlan.addBtn')}
								</button>
							)}
							<button className='btn btn-outline' onClick={() => setDayModalDate(null)}>
								{t('cancel')}
							</button>
						</div>
					</div>

					<button
						type='button'
						className='day-modal-nav day-modal-nav-right'
						disabled={!canGoToNextDay}
						onClick={(e) => {
							e.stopPropagation()
							shiftDayModal(1)
						}}
						aria-label={t('weekPlan.next')}>
						›
					</button>
				</div>
			)}

			<AddToWeekModal
				recipe={selectedRecipeForWeek}
				isOpen={!!selectedRecipeForWeek}
				onClose={() => {
					setSelectedRecipeForWeek(null)
					setSelectedRecipeDate(null)
				}}
				onSuccess={handleAddToWeekSuccess}
				initialDate={selectedRecipeDate || undefined}
			/>
		</>
	)
}
