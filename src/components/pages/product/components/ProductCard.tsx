import './ProductCard.scss'

import { useTranslation } from 'react-i18next'

import { DeleteIcon, EditIcon, HideIcon } from '@/components/shared/icons'
import { Product } from '@/services/product'

interface ProductCardProps {
	product: Product
	isAdmin?: boolean
	onEdit?: (product: Product) => void
	onDelete?: (product: Product) => void
	onOverride?: (product: Product) => void
	onHide?: (product: Product) => void
	onAddToShopping?: (product: Product) => void
	onAddToHome?: (product: Product) => void
}

export function ProductCard({
	product,
	isAdmin,
	onEdit,
	onDelete,
	onOverride,
	onHide,
	onAddToShopping,
	onAddToHome,
}: ProductCardProps) {
	const { t } = useTranslation()

	const capitalizedName = product.name.charAt(0).toUpperCase() + product.name.slice(1)
	const isGlobal = product.status === 'GLOBAL'

	const handleCardClick = () => {
		if (isGlobal) onOverride?.(product)
		else onEdit?.(product)
	}

	return (
		<div className='ingredient-card'>
			<div
				className='card-clickable'
				onClick={handleCardClick}
				role='button'
				tabIndex={0}
				onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}>
				{product.imageUrl ? (
					<div className='card-cover' style={{ backgroundImage: `url(${product.imageUrl})` }}>
						<div className='card-info-overlay'>
							<span className='ingredient-name is-over-image'>{capitalizedName}</span>
						</div>
					</div>
				) : (
					<div className='card-no-image'>
						<span className='ingredient-name'>{capitalizedName}</span>
						<p className='card-macros'>
							{t(isGlobal ? 'products.globalBadge' : 'products.privateBadge')}
						</p>
					</div>
				)}

				{isGlobal && (
					<span className='product-badge product-badge--global' title={t('products.globalBadge')}>
						G
					</span>
				)}
			</div>

			<div className='card-quick-actions'>
				{onAddToShopping && (
					<button
						className='card-action-btn'
						onClick={(e) => {
							e.stopPropagation()
							onAddToShopping(product)
						}}
						title={t('products.addToShopping')}>
						+
					</button>
				)}
				{onAddToHome && (
					<button
						className='card-action-btn'
						onClick={(e) => {
							e.stopPropagation()
							onAddToHome(product)
						}}
						title={t('products.addToHome')}>
						🏠
					</button>
				)}
				{isGlobal ? (
					<>
						<button
							className='card-action-btn card-action-btn--override'
							onClick={(e) => {
								e.stopPropagation()
								onOverride?.(product)
							}}
							title={t('products.customizeTitle')}>
							<EditIcon size={13} aria-hidden='true' />
						</button>
						{isAdmin ? (
							<button
								className='card-action-btn card-action-btn--danger'
								onClick={(e) => {
									e.stopPropagation()
									onDelete?.(product)
								}}
								title={t('delete')}>
								<DeleteIcon size={13} aria-hidden='true' />
							</button>
						) : (
							<button
								className='card-action-btn card-action-btn--muted'
								onClick={(e) => {
									e.stopPropagation()
									onHide?.(product)
								}}
								title={t('products.hide')}>
								<HideIcon size={13} aria-hidden='true' />
							</button>
						)}
					</>
				) : (
					<>
						<button
							className='card-action-btn'
							onClick={(e) => {
								e.stopPropagation()
								onEdit?.(product)
							}}
							title={t('edit')}>
							<EditIcon size={13} aria-hidden='true' />
						</button>
						<button
							className='card-action-btn card-action-btn--danger'
							onClick={(e) => {
								e.stopPropagation()
								onDelete?.(product)
							}}
							title={t('delete')}>
							<DeleteIcon size={13} aria-hidden='true' />
						</button>
					</>
				)}
			</div>
		</div>
	)
}
