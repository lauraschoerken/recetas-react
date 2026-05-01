import './ItemCard.scss'

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { CalendarAddIcon, DeleteIcon, EditIcon } from '@/components/shared/icons'
import { HiOutlineArrowDownTray } from 'react-icons/hi2'

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
}: ItemCardProps) {
	const { t } = useTranslation()
	const isOwner = item.userId === currentUserId
	const linkPath = detailPath || editPath

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
		<div
			className={`item-card ${item.type === 'dish' ? 'item-card--dish' : ''}${isSelected ? ' item-card--selected' : ''}`}>
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
			{/* Área clickable principal */}
			<Link to={linkPath} className='item-card-clickable' tabIndex={0}>
				{item.imageUrl ? (
					<div className='item-card-cover' style={{ backgroundImage: `url(${item.imageUrl})` }}>
						<div className='item-card-overlay'>
							<span className='item-card-title item-card-title--over-image'>{item.title}</span>
							{metaChips.length > 0 && (
								<span className='item-card-meta item-card-meta--over-image'>
									{metaChips.join(' · ')}
								</span>
							)}
						</div>
					</div>
				) : (
					<div className='item-card-no-image'>
						<span className='item-card-title'>{item.title}</span>
						{item.description && <p className='item-card-meta'>{item.description}</p>}
						{metaChips.length > 0 && <p className='item-card-chips'>{metaChips.join(' · ')}</p>}
					</div>
				)}
			</Link>

			{/* Acciones rápidas (hover) */}
			<div className='item-card-bottom-bar'>
				<div className='item-card-quick-actions'>
					<button
						className='item-card-action-btn'
						onClick={onAddToWeek}
						title={t('recipes.addToWeekBtn')}>
						<CalendarAddIcon size={14} aria-hidden='true' />
					</button>
					{onDownloadPdf && (
						<button
							className='item-card-action-btn'
							onClick={onDownloadPdf}
							title={t('recipes.downloadPdf')}>
							<HiOutlineArrowDownTray size={14} aria-hidden='true' />
						</button>
					)}
					{isOwner && (
						<>
							<Link to={editPath} className='item-card-action-btn' title={t('edit')}>
								<EditIcon size={14} aria-hidden='true' />
							</Link>
							<button
								className='item-card-action-btn item-card-action-btn--danger'
								onClick={() => onDelete(item.id)}
								title={t('delete')}>
								<DeleteIcon size={14} aria-hidden='true' />
							</button>
						</>
					)}
				</div>
			</div>

			{/* Tags de ingredientes */}
			{item.tags && item.tags.length > 0 && (
				<div className={`item-card-tags${item.imageUrl ? ' item-card-tags--over-image' : ''}`}>
					{item.tags.slice(0, 2).map((tag) => (
						<span
							key={tag.id}
							className='item-card-tag'
							style={tag.color ? ({ '--tag-color': tag.color } as React.CSSProperties) : undefined}>
							{tag.name}
						</span>
					))}
					{item.tags.length > 2 && (
						<span className='item-card-tag item-card-tag--more'>+{item.tags.length - 2}</span>
					)}
				</div>
			)}
		</div>
	)
}
