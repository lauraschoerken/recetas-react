import './DayCard.scss'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { CheckIcon, CookIcon, DeleteIcon } from '@/components/shared/icons'
import { authService } from '@/services/auth'
import { HouseholdMember, householdService } from '@/services/household'
import { WeekPlan } from '@/services/shopping'

interface DayCardProps {
	date: Date
	dateStr: string
	dayName: string
	plans: WeekPlan[]
	onRemove: (id: number) => void
	onMovePlan?: (planId: number, newDate: string) => void
	onCook?: (planId: number, leftoverServings: number, leftoverLocation: string) => void
	onConsume?: (
		planId: number,
		options?: { myPercentage?: number; householdShares?: { userId: number; percentage: number }[] }
	) => void
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
								onClick={() => handleOpenConsumeModal(plan)}
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

						{!cookShareEnabled && (
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

						{/* Panel de reparto */}
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
											<span className='share-remainder-label'>{t('weekPlan.shareRemainder')}</span>
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
	)
}
