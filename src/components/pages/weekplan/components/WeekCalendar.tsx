import './WeekCalendar.css'

import { WeekPlan } from '@/services/shopping'

import { DayCardRow } from './DayCardRow'

interface WeekCalendarProps {
	weekPlans: WeekPlan[]
	startDate: Date
	onRemove: (id: number) => void
	onMovePlan?: (planId: number, newDate: string) => void
	onCook?: (planId: number, leftoverServings: number, leftoverLocation: string) => void
	onConsume?: (planId: number) => void
}

function formatLocalDate(date: Date): string {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

export function WeekCalendar({
	weekPlans,
	startDate,
	onRemove,
	onMovePlan,
	onCook,
	onConsume,
}: WeekCalendarProps) {
	const days = []
	const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

	for (let i = 0; i < 7; i++) {
		const date = new Date(startDate)
		date.setDate(date.getDate() + i)

		const dateStr = formatLocalDate(date)
		const plansForDay = weekPlans.filter((plan) => {
			const planDate = new Date(plan.plannedDate)
			return formatLocalDate(planDate) === dateStr
		})

		days.push({
			date,
			dateStr,
			dayName: dayNames[date.getDay()],
			meals: plansForDay.filter((p) => p.type === 'meal'),
			preps: plansForDay.filter((p) => p.type === 'prep'),
		})
	}

	return (
		<div className='week-calendar-split'>
			{/* Cabecera de días */}
			<div className='week-calendar-header'>
				<div className='week-calendar-label'></div>
				{days.map((day, index) => {
					const isToday = new Date().toDateString() === day.date.toDateString()
					const displayDate = day.date.toLocaleDateString('es-ES', {
						day: 'numeric',
						month: 'short',
					})
					return (
						<div key={index} className={`week-calendar-day-header ${isToday ? 'is-today' : ''}`}>
							<span className='day-name'>{day.dayName}</span>
							<span className='day-date'>{displayDate}</span>
						</div>
					)
				})}
			</div>

			{/* Fila de Comidas */}
			<DayCardRow
				title='🍽️ Comidas'
				type='meal'
				days={days}
				onRemove={onRemove}
				onMovePlan={onMovePlan}
				onConsume={onConsume}
			/>

			{/* Fila de A Preparar */}
			<DayCardRow
				title='👨‍🍳 A Preparar'
				type='prep'
				days={days}
				onRemove={onRemove}
				onMovePlan={onMovePlan}
				onCook={onCook}
			/>
		</div>
	)
}
