import './ItemCard.scss'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	HiOutlineArrowDownTray,
	HiOutlineEye,
	HiOutlineGlobeAlt,
	HiOutlineLockClosed,
} from 'react-icons/hi2'
import { Link } from 'react-router-dom'

import { CalendarAddIcon, DeleteIcon, EditIcon, HideIcon } from '@/components/shared/icons'

export interface ItemCardData {
	id: number
	title: string
	description?: string | null
	imageUrl?: string | null
	userId: number
	caloriesPerServing?: number | null
	cookTimeMinutes?: number | null
	difficulty?: string | null
	servings?: number | null
	tags?: { id: number; name: string; color?: string | null }[]
	type: 'recipe' | 'dish'
	isPublic?: boolean
	authorName?: string | null
}

interface ItemCardProps {
	item: ItemCardData
	currentUserId: number
	onDelete: (id: number) => void
	onAddToWeek: () => void
	onDownloadPdf?: () => void
	editPath: string
	detailPath?: string
	isSelected?: boolean
	onSelect?: () => void
	onHide?: () => void
	onUnhide?: () => void
	canEdit?: boolean
	canDelete?: boolean
	managementLabel?: string
}

export function ItemCard({
	item,
	currentUserId,
	onDelete,
	onAddToWeek,
	onDownloadPdf,
	editPath,
	detailPath,
	isSelected,
	onSelect,
	onHide,
	onUnhide,
	canEdit,
	canDelete,
	managementLabel,
}: ItemCardProps) {
	const { t } = useTranslation()
	const isOwner = item.userId === currentUserId
	const linkPath = detailPath || editPath
	const [imageFailed, setImageFailed] = useState(false)
	const hasImage = Boolean(item.imageUrl) && !imageFailed
	const visibilityState = item.isPublic === true ? 'public' : item.isPublic === false ? 'private' : 'unknown'

	const metaChips: string[] = []
	if (item.caloriesPerServing != null)
		metaChips.push(t('recipes.kcalPerServing', { kcal: item.caloriesPerServing }))
	if (item.cookTimeMinutes != null)
		metaChips.push(`${item.cookTimeMinutes} ${t('recipes.minuteShort')}`)
	if (item.difficulty) {
		const key = `recipes.difficulty${item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1).toLowerCase()}`
		metaChips.push(t(key, item.difficulty))
	}

	return (
		<article
			className={`item-card ${item.type === 'dish' ? 'item-card--dish' : ''}${isSelected ? ' item-card--selected' : ''}${managementLabel ? ' item-card--managed' : ''}`}>
			{managementLabel && <span className='item-card-management'>{managementLabel}</span>}
			{/* Checkbox de selección — esquina superior derecha */}
			{onSelect && (
				<button
					className={`item-card-select${isSelected ? ' item-card-select--active' : ''}`}
					onClick={(e) => {
						e.preventDefault()
						e.stopPropagation()
						onSelect()
					}}
					aria-label={isSelected ? t('recipes.deselectRecipe') : t('recipes.selectRecipe')}
					aria-pressed={isSelected}>
					{isSelected ? '✓' : ''}
				</button>
			)}
			<Link to={linkPath} className='item-card-clickable' tabIndex={0}>
				<div className={`item-card-media${hasImage ? '' : ' item-card-media--empty'}`}>
					{hasImage ? (
						<img src={item.imageUrl!} alt='' onError={() => setImageFailed(true)} />
					) : (
						<span className='item-card-placeholder' aria-hidden='true'>
							{item.title.trim().charAt(0).toUpperCase() || 'M'}
						</span>
					)}
					<span className={`item-card-visibility item-card-visibility--${visibilityState}`}>
						{visibilityState === 'public' ? (
							<HiOutlineGlobeAlt aria-hidden='true' />
						) : visibilityState === 'private' ? (
							<HiOutlineLockClosed aria-hidden='true' />
						) : <span aria-hidden='true'>?</span>}
						{visibilityState === 'unknown' ? t('recipes.visibilityUnknown') : t(visibilityState)}
					</span>
				</div>
				<div className='item-card-content'>
					<h3 className='item-card-title'>{item.title}</h3>
					<p className='item-card-author'>{item.authorName || `#${item.userId}`}</p>
					{metaChips.length > 0 && <p className='item-card-meta'>{metaChips.join(' · ')}</p>}
					{!hasImage && item.description && <p className='item-card-description'>{item.description}</p>}
					{item.tags && item.tags.length > 0 && (
						<div className='item-card-tags'>
							{item.tags.slice(0, 2).map((tag) => (
								<span key={tag.id} className='item-card-tag'>{tag.name}</span>
							))}
							{item.tags.length > 2 && <span className='item-card-tag'>+{item.tags.length - 2}</span>}
						</div>
					)}
				</div>
			</Link>

			{/* Acciones rápidas (hover) */}
			<div className='item-card-bottom-bar'>
				<div className='item-card-quick-actions'>
					<button
						className='item-card-action-btn'
						onClick={onAddToWeek}
						aria-label={t('recipes.addToWeekBtn')}
						title={t('recipes.addToWeekBtn')}>
						<CalendarAddIcon size={14} aria-hidden='true' />
					</button>
					{onDownloadPdf && (
						<button
							className='item-card-action-btn'
							onClick={onDownloadPdf}
							aria-label={t('recipes.downloadPdf')}
							title={t('recipes.downloadPdf')}>
							<HiOutlineArrowDownTray size={14} aria-hidden='true' />
						</button>
					)}
					{(isOwner || canEdit) && (
						<Link to={editPath} className='item-card-action-btn' aria-label={t('edit')} title={t('edit')}>
							<EditIcon size={14} aria-hidden='true' />
						</Link>
					)}
					{(isOwner || canDelete) && (
						<>
							<button
								className='item-card-action-btn item-card-action-btn--danger'
								onClick={() => onDelete(item.id)}
								aria-label={t('delete')}
								title={t('delete')}>
								<DeleteIcon size={14} aria-hidden='true' />
							</button>
						</>
					)}
					{!isOwner && item.isPublic && onHide && (
						<button
							className='item-card-action-btn'
							onClick={onHide}
							aria-label={t('recipes.hide')}
							title={t('recipes.hide')}>
							<HideIcon size={14} aria-hidden='true' />
						</button>
					)}
					{!isOwner && item.isPublic && onUnhide && (
						<button
							className='item-card-action-btn'
							onClick={onUnhide}
							aria-label={t('recipes.unhide')}
							title={t('recipes.unhide')}>
							<HiOutlineEye size={14} aria-hidden='true' />
						</button>
					)}
				</div>
			</div>

		</article>
	)
}
