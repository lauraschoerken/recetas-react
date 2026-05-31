import './DayCardRow.scss'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { CheckIcon, CookIcon, DeleteIcon } from '@/components/shared/icons'
import { HouseholdMember, householdService } from '@/services/household'
import { WeekPlan } from '@/services/shopping'
import { authService } from '@/services/auth'

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
	onConsume?: (
		planId: number,
		options?: { myPercentage?: number; householdShares?: { userId: number; percentage: number }[] }
	) => void
	onDayClick?: (dateStr: string) => void
}

export function DayCardRow({
	title,
	type,
	days,
	onRemove,
	onMovePlan,
	onCook,
	onConsume,
	onDayClick,
}: DayCardRowProps) {
	const { t } = useTranslation()
	const [cookingPlan, setCookingPlan] = useState<WeekPlan | null>(null)
	const [leftoverServings, setLeftoverServings] = useState(0)
	const [leftoverLocation, setLeftoverLocation] = useState<'nevera' | 'congelador'>('nevera')
	const [dragOverDate, setDragOverDate] = useState<string | null>(null)

	// Share feature state
	const [consumingPlan, setConsumingPlan] = useState<WeekPlan | null>(null)
	const [cookShareEnabled, setCookShareEnabled] = useState(false)
	const [consumeShareEnabled, setConsumeShareEnabled] = useState(false)
	const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([])
	const [householdLoaded, setHouseholdLoaded] = useState(false)
	const [householdLoading, setHouseholdLoading] = useState(false)
	const [memberShares, setMemberShares] = useState<Record<number, number>>({})

	const currentUserId = authService.getUser()?.id

	const loadHousehold = async () => {
		if (householdLoaded || householdLoading) return
		setHouseholdLoading(true)
		try {
			const hh = await householdService.get()
			const members = hh?.members ?? []
			setHouseholdMembers(members)
			if (members.length > 0) {
				const perMember = Math.floor(100 / members.length)
				const shares: Record<number, number> = {}
				members.forEach((m) => {
					shares[m.userId] = perMember
				})
				setMemberShares(shares)
			}
		} catch {
			// sin hogar
		} finally {
			setHouseholdLoaded(true)
			setHouseholdLoading(false)
		}
	}

	const totalConsumedPct = Object.values(memberShares).reduce((a, b) => a + b, 0)
	const leftoverPct = Math.max(0, 100 - totalConsumedPct)

	const getSharedLeftoverServings = (plan: WeekPlan) =>
		Math.round(((plan.servings * leftoverPct) / 100) * 10) / 10

	const getItemTitle = (plan: WeekPlan) => {
		if (plan.ingredient) return `🥕 ${plan.ingredient.name}`
		return plan.recipe?.title || t('noTitle')
	}

	const getItemLink = (plan: WeekPlan) => {
		if (plan.ingredient) return '#'
		return plan.recipe ? `/recipes/${plan.recipeId}` : '#'
	}

	const isIngredientPlan = (plan: WeekPlan) => !!plan.ingredientId

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
		setLeftoverServings(plan.servings)
		setLeftoverLocation('nevera')
		setCookShareEnabled(false)
	}

	const handleConfirmCook = () => {
		if (cookingPlan && onCook) {
			const servingsToStore = cookShareEnabled
				? getSharedLeftoverServings(cookingPlan)
				: leftoverServings
			onCook(cookingPlan.id, servingsToStore, leftoverLocation)
			setCookingPlan(null)
			setCookShareEnabled(false)
		}
	}

	const handleCancelCook = () => {
		setCookingPlan(null)
		setLeftoverServings(0)
		setLeftoverLocation('nevera')
		setCookShareEnabled(false)
	}

	const handleOpenConsumeModal = (plan: WeekPlan) => {
		setConsumingPlan(plan)
		setConsumeShareEnabled(false)
	}

	const handleConfirmConsume = () => {
		if (consumingPlan && onConsume) {
			if (consumeShareEnabled && householdMembers.length > 0) {
				const currentUserMember = householdMembers.find((m) => m.userId === currentUserId)
				const myPct = currentUserMember ? (memberShares[currentUserMember.userId] ?? 0) : 100
				const otherShares = householdMembers
					.filter((m) => m.userId !== currentUserId)
					.map((m) => ({ userId: m.userId, percentage: memberShares[m.userId] ?? 0 }))
					.filter((s) => s.percentage > 0)
				onConsume(consumingPlan.id, { myPercentage: myPct, householdShares: otherShares })
			} else {
				onConsume(consumingPlan.id)
			}
			setConsumingPlan(null)
			setConsumeShareEnabled(false)
		}
	}

	const handleCancelConsume = () => {
		setConsumingPlan(null)
		setConsumeShareEnabled(false)
	}

	const handleToggleCookShare = async (enabled: boolean) => {
		setCookShareEnabled(enabled)
		if (enabled) await loadHousehold()
	}

	const handleToggleConsumeShare = async (enabled: boolean) => {
		setConsumeShareEnabled(enabled)
		if (enabled) await loadHousehold()
	}

	const handleMemberShareChange = (userId: number, value: number) => {
		setMemberShares((prev) => ({ ...prev, [userId]: Math.min(100, Math.max(0, value)) }))
	}

	const renderPlanItem = (plan: WeekPlan) => {
		const isCompleted = type === 'prep' ? plan.cooked : plan.consumed
		const canDrag = !isCompleted

		return (
			<div
				key={plan.id}
				className={`row-plan-item ${hasComponents(plan) ? 'has-components' : ''} ${isCompleted ? 'is-done' : ''}`}
				draggable={canDrag}
				onClick={(e) => e.stopPropagation()}
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
					<span className='row-plan-servings'>
						{isIngredientPlan(plan)
							? `${plan.ingredientQty} ${plan.ingredientUnit}`
							: `${parseFloat(plan.servings.toFixed(2))} ${t('weekPlan.portions')}`}
					</span>
					<div className='row-plan-actions'>
						{!isIngredientPlan(plan) && type === 'prep' && !plan.cooked && (
							<button
								className='action-cook'
								onClick={(e) => {
									e.stopPropagation()
									handleOpenCookModal(plan)
								}}
								title={t('weekPlan.cookTitle')}>
								<CookIcon size={14} aria-hidden='true' />
							</button>
						)}
						{!isIngredientPlan(plan) && type === 'meal' && !plan.consumed && onConsume && (
							<button
								className='action-consume'
								onClick={(e) => {
									e.stopPropagation()
									handleOpenConsumeModal(plan)
								}}
								title={t('weekPlan.markConsumed')}>
								<CheckIcon size={14} aria-hidden='true' />
							</button>
						)}
						<button
							className='action-remove'
							onClick={(e) => {
								e.stopPropagation()
								onRemove(plan.id)
							}}
							title={t('delete')}>
							<DeleteIcon size={14} aria-hidden='true' />
						</button>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className='week-calendar-scroll-wrapper'>
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
							onClick={() => onDayClick?.(day.dateStr)}
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
							<h3>{t('weekPlan.cookTitle')}</h3>
							<p className='cook-modal-recipe'>{getItemTitle(cookingPlan)}</p>
							<p className='cook-modal-servings'>
								{t('weekPlan.preparedServings')} {cookingPlan.servings}
							</p>

							{!cookShareEnabled && (
								<div className='cook-modal-field'>
									<label htmlFor='leftovers'>{t('weekPlan.storeServings')}</label>
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
											? t('weekPlan.consumeAll')
											: leftoverServings === cookingPlan.servings
												? t('weekPlan.storeAll')
												: t('weekPlan.consumeSome', {
														count: cookingPlan.servings - leftoverServings,
													})}
									</small>
								</div>
							)}

							{/* Toggle de reparto */}
							<div className='cook-modal-field share-toggle-row'>
								<label className='share-toggle-label'>
									<input
										type='checkbox'
										checked={cookShareEnabled}
										onChange={(e) => handleToggleCookShare(e.target.checked)}
									/>
									<span>{t('weekPlan.shareToggle')}</span>
								</label>
								<small className='cook-modal-hint'>{t('weekPlan.shareToggleHint')}</small>
							</div>

							{/* Panel de reparto por porcentajes */}
							{cookShareEnabled && (
								<div className='share-panel'>
									{householdLoading && (
										<p className='share-loading'>{t('weekPlan.shareLoadingMembers')}</p>
									)}
									{!householdLoading && householdMembers.length === 0 && (
										<p className='share-loading'>{t('weekPlan.shareNoHousehold')}</p>
									)}
									{!householdLoading &&
										householdMembers.map((m) => {
											const name =
												m.userId === currentUserId
													? t('weekPlan.shareYou')
													: (m.user?.name ?? `#${m.userId}`)
											const pct = memberShares[m.userId] ?? 0
											const servings = Math.round(((cookingPlan.servings * pct) / 100) * 10) / 10
											return (
												<div key={m.userId} className='share-member-row'>
													<span className='share-member-name'>{name}</span>
													<input
														type='number'
														className='share-percent-input'
														min='0'
														max='100'
														value={pct}
														onChange={(e) =>
															handleMemberShareChange(m.userId, parseInt(e.target.value) || 0)
														}
													/>
													<span className='share-percent-sign'>%</span>
													<span className='share-member-servings'>= {servings} porc.</span>
												</div>
											)
										})}
									{!householdLoading && householdMembers.length > 0 && (
										<div className='share-summary'>
											<div className='share-bar-track'>
												{householdMembers.map((m, i) => (
													<div
														key={m.userId}
														className={`share-bar-segment share-color-${i % 6}`}
														style={{ width: `${Math.min(memberShares[m.userId] ?? 0, 100)}%` }}
													/>
												))}
											</div>
											<div className='share-remainder-row'>
												<span className='share-remainder-label'>
													{t('weekPlan.shareRemainder')}
												</span>
												<span className='share-remainder-value'>
													{leftoverPct > 0
														? t('weekPlan.shareLeftovers', {
																servings: getSharedLeftoverServings(cookingPlan),
																pct: leftoverPct,
															})
														: t('weekPlan.shareNoLeftovers')}
												</span>
											</div>
										</div>
									)}
								</div>
							)}

							{(cookShareEnabled
								? getSharedLeftoverServings(cookingPlan) > 0
								: leftoverServings > 0) && (
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

				{/* Modal de consumir */}
				{consumingPlan && (
					<div className='cook-modal-overlay' onClick={handleCancelConsume}>
						<div className='cook-modal' onClick={(e) => e.stopPropagation()}>
							<h3>{t('weekPlan.consumeTitle')}</h3>
							<p className='cook-modal-recipe'>{getItemTitle(consumingPlan)}</p>
							<p className='cook-modal-servings'>
								{t('weekPlan.consumeServings')} {consumingPlan.servings}
							</p>

							{/* Toggle de reparto */}
							<div className='cook-modal-field share-toggle-row'>
								<label className='share-toggle-label'>
									<input
										type='checkbox'
										checked={consumeShareEnabled}
										onChange={(e) => handleToggleConsumeShare(e.target.checked)}
									/>
									<span>{t('weekPlan.shareToggle')}</span>
								</label>
								<small className='cook-modal-hint'>{t('weekPlan.shareToggleHint')}</small>
							</div>

							{/* Panel de reparto */}
							{consumeShareEnabled && (
								<div className='share-panel'>
									{householdLoading && (
										<p className='share-loading'>{t('weekPlan.shareLoadingMembers')}</p>
									)}
									{!householdLoading && householdMembers.length === 0 && (
										<p className='share-loading'>{t('weekPlan.shareNoHousehold')}</p>
									)}
									{!householdLoading &&
										householdMembers.map((m) => {
											const name =
												m.userId === currentUserId
													? t('weekPlan.shareYou')
													: (m.user?.name ?? `#${m.userId}`)
											const pct = memberShares[m.userId] ?? 0
											const servings = Math.round(((consumingPlan.servings * pct) / 100) * 10) / 10
											return (
												<div key={m.userId} className='share-member-row'>
													<span className='share-member-name'>{name}</span>
													<input
														type='number'
														className='share-percent-input'
														min='0'
														max='100'
														value={pct}
														onChange={(e) =>
															handleMemberShareChange(m.userId, parseInt(e.target.value) || 0)
														}
													/>
													<span className='share-percent-sign'>%</span>
													<span className='share-member-servings'>= {servings} porc.</span>
												</div>
											)
										})}
									{!householdLoading && householdMembers.length > 0 && (
										<div className='share-summary'>
											<div className='share-bar-track'>
												{householdMembers.map((m, i) => (
													<div
														key={m.userId}
														className={`share-bar-segment share-color-${i % 6}`}
														style={{ width: `${Math.min(memberShares[m.userId] ?? 0, 100)}%` }}
													/>
												))}
											</div>
											<p className='cook-modal-hint'>
												{t('weekPlan.shareTotalConsumed', { pct: Math.min(100, totalConsumedPct) })}
											</p>
											{leftoverPct > 0 && (
												<div className='share-remainder-row'>
													<span className='share-remainder-label'>
														{t('weekPlan.shareRemainder')}
													</span>
													<span className='share-remainder-value'>
														{t('weekPlan.shareConsumeRemainder', {
															servings: getSharedLeftoverServings(consumingPlan),
															pct: leftoverPct,
														})}
													</span>
												</div>
											)}
										</div>
									)}
								</div>
							)}

							<div className='cook-modal-actions'>
								<button className='cook-modal-cancel' onClick={handleCancelConsume}>
									{t('cancel')}
								</button>
								<button className='cook-modal-confirm' onClick={handleConfirmConsume}>
									{t('confirm')}
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
