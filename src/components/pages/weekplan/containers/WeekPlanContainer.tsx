import './WeekPlanContainer.css'

import { useEffect,useState } from 'react'
import { Link } from 'react-router-dom'

import {
	DailyNutrition,
	profileService,
	RecommendedMacros,
	WeeklyNutrition,
} from '@/services/profile'
import { shoppingService,WeekPlan } from '@/services/shopping'
import { useDialog } from '@/utils/dialog/DialogContext'

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

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function WeekPlanContainer() {
	const { confirm, toast } = useDialog()
	const [weekPlans, setWeekPlans] = useState<WeekPlan[]>([])
	const [loading, setLoading] = useState(true)
	const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()))
	const [selectedDay, setSelectedDay] = useState<string>(() => formatDateStr(new Date()))
	const [selectedDayNutrition, setSelectedDayNutrition] = useState<DailyNutrition | null>(null)
	const [weeklyNutrition, setWeeklyNutrition] = useState<WeeklyNutrition | null>(null)
	const [recommendedMacros, setRecommendedMacros] = useState<RecommendedMacros | null>(null)
	const [showWeeklySummary, setShowWeeklySummary] = useState(false)

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
			title: 'Eliminar del plan',
			message: '¿Estás seguro de que quieres eliminar esta receta del plan?',
			confirmText: 'Eliminar',
			type: 'danger',
		})
		if (!confirmed) return

		try {
			await shoppingService.removeFromWeekPlan(id)
			setWeekPlans(weekPlans.filter((p) => p.id !== id))
			loadWeeklyNutrition()
			toast.success('Eliminado del plan')
		} catch {
			toast.error('Error al eliminar del plan')
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
			toast.error('Error al mover el plan')
		}
	}

	const handleCook = async (planId: number, leftoverServings: number, leftoverLocation: string) => {
		try {
			await shoppingService.markAsCooked(planId, leftoverServings, leftoverLocation)
			setWeekPlans(weekPlans.map((p) => (p.id === planId ? { ...p, cooked: true } : p)))
			loadWeeklyNutrition()
			toast.success('Marcado como cocinado')
		} catch {
			toast.error('Error al marcar como cocinado')
		}
	}

	const handleConsume = async (planId: number) => {
		try {
			await shoppingService.markAsConsumed(planId)
			setWeekPlans(weekPlans.map((p) => (p.id === planId ? { ...p, consumed: true } : p)))
			loadWeeklyNutrition()
			toast.success('Marcado como consumido')
		} catch {
			toast.error('Error al marcar como consumido')
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
				<h1 className='page-title'>Plan Semanal</h1>
				<Link to='/recipes' className='btn btn-primary'>
					+ Añadir receta
				</Link>
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
						{showWeeklySummary ? 'Ver día' : 'Ver semana'}
					</button>
				</div>

				{!showWeeklySummary ? (
					<div className='daily-nutrition'>
						{recommendedMacros && selectedDayNutrition ? (
							<div className='nutrition-with-chart'>
								<div className='macro-progress-grid'>
									<div className='macro-progress-item'>
										<div className='macro-progress-header'>
											<span className='macro-progress-label'>Calorías</span>
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
											<span className='macro-progress-label'>Proteína</span>
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
											<span className='macro-progress-label'>Carbohidratos</span>
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
											<span className='macro-progress-label'>Grasa</span>
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
												<span className='macro-donut-label'>kcal</span>
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
												<span className='legend-text'>Grasa {macroDistribution.fat}%</span>
											</div>
										</div>
									</div>
								)}
							</div>
						) : !recommendedMacros ? (
							<div className='nutrition-empty'>
								<p>Configura tu perfil para ver las recomendaciones de macros</p>
								<Link to='/settings' className='btn btn-outline btn-sm'>
									Ir a Ajustes
								</Link>
							</div>
						) : selectedDayNutrition ? (
							<div className='today-nutrition-macros'>
								<div className='nutrition-macro macro-calories'>
									<span className='nutrition-value'>{selectedDayNutrition.calories}</span>
									<span className='nutrition-label'>kcal</span>
								</div>
								<div className='nutrition-macro macro-protein'>
									<span className='nutrition-value'>{selectedDayNutrition.protein}g</span>
									<span className='nutrition-label'>proteína</span>
								</div>
								<div className='nutrition-macro macro-carbs'>
									<span className='nutrition-value'>{selectedDayNutrition.carbs}g</span>
									<span className='nutrition-label'>carbos</span>
								</div>
								<div className='nutrition-macro macro-fat'>
									<span className='nutrition-value'>{selectedDayNutrition.fat}g</span>
									<span className='nutrition-label'>grasa</span>
								</div>
							</div>
						) : (
							<div className='nutrition-empty'>
								<p>Sin comidas planificadas para este día</p>
							</div>
						)}
					</div>
				) : (
					<div className='weekly-summary'>
						{weeklyNutrition && (
							<>
								<div className='weekly-summary-stats'>
									<div className='weekly-summary-section'>
										<h4>Promedio Diario</h4>
										<div className='weekly-stats'>
											<div className='weekly-stat'>
												<span className='stat-value calories'>
													{weeklyNutrition.averages.calories}
												</span>
												<span className='stat-label'>kcal</span>
												{recommendedMacros && (
													<span className='stat-target'>/ {recommendedMacros.calories}</span>
												)}
											</div>
											<div className='weekly-stat'>
												<span className='stat-value protein'>
													{weeklyNutrition.averages.protein}g
												</span>
												<span className='stat-label'>prot</span>
											</div>
											<div className='weekly-stat'>
												<span className='stat-value carbs'>{weeklyNutrition.averages.carbs}g</span>
												<span className='stat-label'>carbs</span>
											</div>
											<div className='weekly-stat'>
												<span className='stat-value fat'>{weeklyNutrition.averages.fat}g</span>
												<span className='stat-label'>grasa</span>
											</div>
										</div>
									</div>

									<div className='weekly-summary-section'>
										<h4>Total Semana</h4>
										<div className='weekly-stats'>
											<div className='weekly-stat'>
												<span className='stat-value'>
													{weeklyNutrition.totals.calories.toLocaleString()}
												</span>
												<span className='stat-label'>kcal</span>
											</div>
											<div className='weekly-stat'>
												<span className='stat-value'>{weeklyNutrition.totals.protein}g</span>
												<span className='stat-label'>prot</span>
											</div>
											<div className='weekly-stat'>
												<span className='stat-value'>{weeklyNutrition.totals.carbs}g</span>
												<span className='stat-label'>carbs</span>
											</div>
											<div className='weekly-stat'>
												<span className='stat-value'>{weeklyNutrition.totals.fat}g</span>
												<span className='stat-label'>grasa</span>
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
												<span className='macro-donut-label'>prom/día</span>
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
												<span className='legend-text'>Grasa {weeklyMacroDistribution.fat}%</span>
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
						&larr; Anterior
					</button>
					<div className='text-center'>
						<strong>{weekLabel}</strong>
						<button
							className='btn btn-outline btn-sm'
							onClick={goToCurrentWeek}
							style={{ marginLeft: '1rem' }}>
							Hoy
						</button>
					</div>
					<button className='btn btn-outline btn-sm' onClick={goToNextWeek}>
						Siguiente &rarr;
					</button>
				</div>
			</div>

			{loading ? (
				<div className='loading'>Cargando plan...</div>
			) : (
				<WeekCalendar
					weekPlans={weekPlans}
					startDate={currentWeekStart}
					onRemove={handleRemove}
					onMovePlan={handleMovePlan}
					onCook={handleCook}
					onConsume={handleConsume}
				/>
			)}

			{!loading && weekPlans.length > 0 && (
				<div className='mt-2'>
					<Link to='/shopping-list' className='btn btn-primary'>
						Ver Lista de la Compra
					</Link>
				</div>
			)}
		</>
	)
}
