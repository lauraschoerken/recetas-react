import './DayCardRow.scss'

import { useState } from 'react'
import { Link } from 'react-router-dom'

import { CheckIcon, CookIcon, DeleteIcon } from '@/components/shared/icons'
import { WeekPlan } from '@/services/shopping'

interface DayData {
	date: Date
	dateStr: string
	dayName: string
	meals: WeekPlan[]
	preps: WeekPlan[]
}

interface DayCardRowProps {
	title: string
	type: 'meal' | 'prep'
	days: DayData[]
	onRemove: (id: number) => void
	onMovePlan?: (planId: number, newDate: string) => void
	onCook?: (planId: number, leftoverServings: number, leftoverLocation: string) => void
	onConsume?: (planId: number) => void
}

export function DayCardRow({
	title,
	type,
	days,
	onRemove,
	onMovePlan,
	onCook,
	onConsume,
}: DayCardRowProps) {
	const [cookingPlan, setCookingPlan] = useState<WeekPlan | null>(null)
	const [leftoverServings, setLeftoverServings] = useState(0)
	const [leftoverLocation, setLeftoverLocation] = useState<'nevera' | 'congelador'>('nevera')
	const [dragOverDate, setDragOverDate] = useState<string | null>(null)

	const getItemTitle = (plan: WeekPlan) => {
		return plan.recipe?.title || 'Sin titulo'
	}

	const getItemLink = (plan: WeekPlan) => {
		return plan.recipe ? `/recipes/${plan.recipeId}` : '#'
	}

	const hasComponents = (plan: WeekPlan) => {
		return plan.recipe?.components && plan.recipe.components.length > 0
	}

	const handleDragStart = (e: React.DragEvent, plan: WeekPlan) => {
		e.dataTransfer.setData('planId', plan.id.toString())
		e.dataTransfer.effectAllowed = 'move'
	}

	const handleDragOver = (e: React.DragEvent, dateStr: string) => {
		e.preventDefault()
		e.dataTransfer.dropEffect = 'move'
		setDragOverDate(dateStr)
	}

	const handleDragLeave = () => {
		setDragOverDate(null)
	}

	const handleDrop = (e: React.DragEvent, dateStr: string) => {
		e.preventDefault()
		setDragOverDate(null)
		const planId = parseInt(e.dataTransfer.getData('planId'))
		if (planId && onMovePlan) {
			onMovePlan(planId, dateStr)
		}
	}

	const handleOpenCookModal = (plan: WeekPlan) => {
		setCookingPlan(plan)
		setLeftoverServings(plan.servings) // Por defecto, guardar todas las raciones
		setLeftoverLocation('nevera')
	}

	const handleConfirmCook = () => {
		if (cookingPlan && onCook) {
			onCook(cookingPlan.id, leftoverServings, leftoverLocation)
			setCookingPlan(null)
		}
	}

	const handleCancelCook = () => {
		setCookingPlan(null)
		setLeftoverServings(0)
		setLeftoverLocation('nevera')
	}

	const renderPlanItem = (plan: WeekPlan) => {
		const isCompleted = type === 'prep' ? plan.cooked : plan.consumed
		const canDrag = !isCompleted

		return (
			<div
				key={plan.id}
				className={`row-plan-item ${hasComponents(plan) ? 'has-components' : ''} ${isCompleted ? 'is-done' : ''}`}
				draggable={canDrag}
				onDragStart={(e) => handleDragStart(e, plan)}>
				<div className='row-plan-header'>
					{!isCompleted && <span className='drag-handle'>⋮⋮</span>}
					{isCompleted && (
						<span className='done-icon'>
							<CheckIcon size={14} aria-hidden='true' />
						</span>
					)}
					<Link to={getItemLink(plan)} className='row-plan-title'>
						{getItemTitle(plan)}
					</Link>
				</div>
				<div className='row-plan-footer'>
					<span className='row-plan-servings'>{plan.servings} porc.</span>
					<div className='row-plan-actions'>
						{type === 'prep' && !plan.cooked && (
							<button
								className='action-cook'
								onClick={() => handleOpenCookModal(plan)}
								title='Marcar como cocinado'>
								<CookIcon size={14} aria-hidden='true' />
							</button>
						)}
						{type === 'meal' && !plan.consumed && onConsume && (
							<button
								className='action-consume'
								onClick={() => onConsume(plan.id)}
								title='Marcar como consumido'>
								<CheckIcon size={14} aria-hidden='true' />
							</button>
						)}
						<button className='action-remove' onClick={() => onRemove(plan.id)} title='Eliminar'>
							<DeleteIcon size={14} aria-hidden='true' />
						</button>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className={`day-card-row row-${type}`}>
			<div className='row-label'>
				<span>{title}</span>
			</div>
			{days.map((day, index) => {
				const plans = type === 'meal' ? day.meals : day.preps
				const isToday = new Date().toDateString() === day.date.toDateString()
				const isDragOver = dragOverDate === day.dateStr

				return (
					<div
						key={index}
						className={`row-day-cell ${isToday ? 'is-today' : ''} ${isDragOver ? 'is-dragover' : ''}`}
						onDragOver={(e) => handleDragOver(e, day.dateStr)}
						onDragLeave={handleDragLeave}
						onDrop={(e) => handleDrop(e, day.dateStr)}>
						{plans.length === 0 ? (
							<span className='row-empty'>-</span>
						) : (
							plans.map((plan) => renderPlanItem(plan))
						)}
					</div>
				)
			})}

			{/* Modal de cocinar */}
			{cookingPlan && (
				<div className='cook-modal-overlay' onClick={handleCancelCook}>
					<div className='cook-modal' onClick={(e) => e.stopPropagation()}>
						<h3>Marcar como cocinado</h3>
						<p className='cook-modal-recipe'>{getItemTitle(cookingPlan)}</p>
						<p className='cook-modal-servings'>Raciones preparadas: {cookingPlan.servings}</p>

						<div className='cook-modal-field'>
							<label htmlFor='leftovers'>Raciones a guardar en casa:</label>
							<input
								type='number'
								id='leftovers'
								min='0'
								max={cookingPlan.servings}
								value={leftoverServings}
								onChange={(e) =>
									setLeftoverServings(
										Math.min(cookingPlan.servings, Math.max(0, parseInt(e.target.value) || 0))
									)
								}
							/>
							<small className='cook-modal-hint'>
								{leftoverServings === 0
									? 'No se guardará nada (se consumirá todo)'
									: leftoverServings === cookingPlan.servings
										? 'Se guardarán todas las raciones'
										: `Se consumirán ${cookingPlan.servings - leftoverServings} raciones`}
							</small>
						</div>

						{leftoverServings > 0 && (
							<div className='cook-modal-field'>
								<label>Guardar en:</label>
								<div className='cook-modal-location-options'>
									<button
										type='button'
										className={`cook-modal-location-btn ${leftoverLocation === 'nevera' ? 'active' : ''}`}
										onClick={() => setLeftoverLocation('nevera')}>
										Nevera
									</button>
									<button
										type='button'
										className={`cook-modal-location-btn ${leftoverLocation === 'congelador' ? 'active' : ''}`}
										onClick={() => setLeftoverLocation('congelador')}>
										Congelador
									</button>
								</div>
							</div>
						)}

						<div className='cook-modal-actions'>
							<button className='cook-modal-cancel' onClick={handleCancelCook}>
								Cancelar
							</button>
							<button className='cook-modal-confirm' onClick={handleConfirmCook}>
								Confirmar
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
