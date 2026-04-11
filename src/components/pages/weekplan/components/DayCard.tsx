import './DayCard.scss'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { CheckIcon, CookIcon, DeleteIcon } from '@/components/shared/icons'
import { WeekPlan } from '@/services/shopping'

interface DayCardProps {
	date: Date
	dateStr: string
	dayName: string
	plans: WeekPlan[]
	onRemove: (id: number) => void
	onMovePlan?: (planId: number, newDate: string) => void
	onCook?: (planId: number, leftoverServings: number, leftoverLocation: string) => void
	onConsume?: (planId: number) => void
}

export function DayCard({
	date,
	dateStr,
	dayName,
	plans,
	onRemove,
	onMovePlan,
	onCook,
	onConsume,
}: DayCardProps) {
	const { t } = useTranslation()
	const [isDragOver, setIsDragOver] = useState(false)
	const [cookingPlan, setCookingPlan] = useState<WeekPlan | null>(null)
	const [leftoverServings, setLeftoverServings] = useState(0)
	const [leftoverLocation, setLeftoverLocation] = useState<'nevera' | 'congelador'>('nevera')
	const isToday = new Date().toDateString() === date.toDateString()
	const displayDate = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

	const meals = plans.filter((p) => p.type === 'meal')
	const preps = plans.filter((p) => p.type === 'prep')

	const getItemTitle = (plan: WeekPlan) => {
		return plan.recipe?.title || t('noTitle')
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

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault()
		e.dataTransfer.dropEffect = 'move'
		setIsDragOver(true)
	}

	const handleDragLeave = () => {
		setIsDragOver(false)
	}

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragOver(false)
		const planId = parseInt(e.dataTransfer.getData('planId'))
		if (planId && onMovePlan) {
			onMovePlan(planId, dateStr)
		}
	}

	const handleOpenCookModal = (plan: WeekPlan) => {
		setCookingPlan(plan)
		setLeftoverServings(0)
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

	const renderPlanItem = (plan: WeekPlan, isPrep: boolean) => {
		const isCompleted = isPrep ? plan.cooked : plan.consumed
		const canDrag = !isCompleted

		return (
			<li
				key={plan.id}
				className={`day-card-item ${hasComponents(plan) ? 'has-components' : ''} ${isCompleted ? 'day-card-item-done' : ''}`}
				draggable={canDrag}
				onDragStart={(e) => handleDragStart(e, plan)}>
				<div className='day-card-item-header'>
					{!isCompleted && (
						<span className='drag-handle' title={t('weekPlan.dragToMove')}>
							⋮⋮
						</span>
					)}
					{isCompleted && (
						<span
							className='done-icon'
							title={isPrep ? t('weekPlan.cookedLabel') : t('weekPlan.consumedLabel')}>
							<CheckIcon size={14} aria-hidden='true' />
						</span>
					)}
					{hasComponents(plan) && <span className='day-card-badge'>{t('recipes.variants')}</span>}
					<Link to={getItemLink(plan)} className='day-card-recipe'>
						{getItemTitle(plan)}
					</Link>
				</div>
				<div className='day-card-item-footer'>
					<span className='day-card-servings'>
						{plan.servings} {t('weekPlan.portions')}
					</span>
					<div className='day-card-actions'>
						{isPrep && !plan.cooked && (
							<button
								className='day-card-cook'
								onClick={() => handleOpenCookModal(plan)}
								title={t('weekPlan.cookTitle')}>
								<CookIcon size={14} aria-hidden='true' />
							</button>
						)}
						{!isPrep && !plan.consumed && onConsume && (
							<button
								className='day-card-consume'
								onClick={() => onConsume(plan.id)}
								title={t('weekPlan.markConsumed')}>
								<CheckIcon size={14} aria-hidden='true' />
							</button>
						)}
						<button
							className='day-card-remove'
							onClick={() => onRemove(plan.id)}
							title={t('delete')}>
							<DeleteIcon size={14} aria-hidden='true' />
						</button>
					</div>
				</div>
			</li>
		)
	}

	return (
		<div
			className={`day-card ${isToday ? 'day-card-today' : ''} ${isDragOver ? 'day-card-dragover' : ''}`}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}>
			<div className='day-card-header'>
				<span className='day-card-name'>{dayName}</span>
				<span className='day-card-date'>{displayDate}</span>
			</div>

			<div className='day-card-content'>
				{plans.length === 0 ? (
					<p className='day-card-empty'>{t('weekPlan.noPlans')}</p>
				) : (
					<>
						{meals.length > 0 && (
							<div className='day-card-section'>
								<h4 className='day-card-section-title section-meals'>{t('weekPlan.meals')}</h4>
								<ul className='day-card-list'>
									{meals.map((plan) => renderPlanItem(plan, false))}
								</ul>
							</div>
						)}

						{preps.length > 0 && (
							<div className='day-card-section'>
								<h4 className='day-card-section-title section-preps'>{t('weekPlan.toPrep')}</h4>
								<ul className='day-card-list'>{preps.map((plan) => renderPlanItem(plan, true))}</ul>
							</div>
						)}
					</>
				)}
			</div>

			{cookingPlan && (
				<div className='cook-modal-overlay' onClick={handleCancelCook}>
					<div className='cook-modal' onClick={(e) => e.stopPropagation()}>
						<h3>{t('weekPlan.cookTitle')}</h3>
						<p className='cook-modal-recipe'>{getItemTitle(cookingPlan)}</p>
						<p className='cook-modal-servings'>
							{t('weekPlan.preparedServings')} {cookingPlan.servings}
						</p>

						<div className='cook-modal-field'>
							<label htmlFor='leftovers'>{t('weekPlan.storeServingsShort')}</label>
							<input
								type='number'
								id='leftovers'
								min='0'
								value={leftoverServings}
								onChange={(e) => setLeftoverServings(Math.max(0, parseInt(e.target.value) || 0))}
							/>
						</div>

						{leftoverServings > 0 && (
							<div className='cook-modal-field'>
								<label>{t('weekPlan.storeIn')}</label>
								<div className='cook-modal-location-options'>
									<button
										type='button'
										className={`cook-modal-location-btn ${leftoverLocation === 'nevera' ? 'active' : ''}`}
										onClick={() => setLeftoverLocation('nevera')}>
										{t('weekPlan.fridgeLocation')}
									</button>
									<button
										type='button'
										className={`cook-modal-location-btn ${leftoverLocation === 'congelador' ? 'active' : ''}`}
										onClick={() => setLeftoverLocation('congelador')}>
										{t('weekPlan.freezerLocation')}
									</button>
								</div>
							</div>
						)}

						<div className='cook-modal-actions'>
							<button className='cook-modal-cancel' onClick={handleCancelCook}>
								{t('cancel')}
							</button>
							<button className='cook-modal-confirm' onClick={handleConfirmCook}>
								{t('confirm')}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
