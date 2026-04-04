import './ItemCard.scss'

import { Link } from 'react-router-dom'

import { CalendarAddIcon, DeleteIcon, EditIcon } from '@/components/shared/icons'

export interface ItemCardData {
	id: number
	title: string
	description?: string | null
	imageUrl?: string | null
	isPublic: boolean
	userId: number
	authorName?: string
	caloriesPerServing?: number | null
	hasVariants?: boolean
	type: 'recipe' | 'dish'
}

interface ItemCardProps {
	item: ItemCardData
	currentUserId: number
	onDelete: (id: number) => void
	onAddToWeek: () => void
	editPath: string
	detailPath?: string
}

export function ItemCard({
	item,
	currentUserId,
	onDelete,
	onAddToWeek,
	editPath,
	detailPath,
}: ItemCardProps) {
	const isOwner = item.userId === currentUserId
	const linkPath = detailPath || editPath

	return (
		<div className={`item-card ${item.type === 'dish' ? 'item-card-dish' : ''}`}>
			<div className='item-card-header'>
				<h3 className='item-card-title'>
					<Link to={linkPath}>{item.title}</Link>
				</h3>
				<div className='item-card-badges'>
					{item.hasVariants && <span className='badge badge-variants'>Opciones</span>}
					<span className={`badge ${item.isPublic ? 'badge-public' : 'badge-private'}`}>
						{item.isPublic ? 'Pública' : 'Privada'}
					</span>
				</div>
			</div>

			{item.imageUrl ? (
				<div className='item-card-image'>
					<img src={item.imageUrl} alt={item.title} />
				</div>
			) : (
				<>
					{!isOwner && item.authorName && <p className='item-card-author'>Por {item.authorName}</p>}
					{item.description && <p className='item-card-description'>{item.description}</p>}
				</>
			)}

			<div className='item-card-footer'>
				{item.caloriesPerServing != null && (
					<span className='item-card-calories'>{item.caloriesPerServing} kcal/porción</span>
				)}

				<div className='item-card-actions'>
					<div className='item-card-actions-left'>
						<button
							className='btn-icon btn-icon-primary'
							onClick={onAddToWeek}
							title='Añadir a la semana'>
							<CalendarAddIcon size={16} aria-hidden='true' />
						</button>
					</div>
					<div className='item-card-actions-right'>
						{isOwner && (
							<>
								<Link to={editPath} className='btn-icon btn-icon-outline' title='Editar'>
									<EditIcon size={16} aria-hidden='true' />
								</Link>
								<button
									className='btn-icon btn-icon-danger'
									onClick={() => onDelete(item.id)}
									title='Eliminar'>
									<DeleteIcon size={16} aria-hidden='true' />
								</button>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
