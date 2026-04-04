import './ShoppingReview.css'

import { useEffect,useState } from 'react'

export interface ReviewIngredient {
	id: number
	name: string
	unit: string
	quantity: number
	source: string
	selected: boolean
}

interface ShoppingReviewProps {
	ingredients: ReviewIngredient[]
	onConfirm: (selectedIds: number[]) => void
	onCancel: () => void
}

export function ShoppingReview({ ingredients, onConfirm, onCancel }: ShoppingReviewProps) {
	const [items, setItems] = useState<ReviewIngredient[]>(ingredients)

	useEffect(() => {
		setItems(ingredients)
	}, [ingredients])

	const toggleItem = (id: number) => {
		setItems((prev) =>
			prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
		)
	}

	const selectAll = () => {
		setItems((prev) => prev.map((item) => ({ ...item, selected: true })))
	}

	const deselectAll = () => {
		setItems((prev) => prev.map((item) => ({ ...item, selected: false })))
	}

	const selectedCount = items.filter((i) => i.selected).length

	const handleConfirm = () => {
		const selectedIds = items.filter((i) => i.selected).map((i) => i.id)
		onConfirm(selectedIds)
	}

	const groupBySource = () => {
		const groups: Record<string, ReviewIngredient[]> = {}
		for (const item of items) {
			if (!groups[item.source]) {
				groups[item.source] = []
			}
			groups[item.source].push(item)
		}
		return groups
	}

	const groups = groupBySource()

	return (
		<div className='shopping-review'>
			<div className='shopping-review-header'>
				<h3>Revisar ingredientes</h3>
				<p className='shopping-review-subtitle'>Desmarca los ingredientes que ya tienes en casa</p>
				<div className='shopping-review-actions-top'>
					<button className='btn btn-outline btn-sm' onClick={selectAll}>
						Seleccionar todos
					</button>
					<button className='btn btn-outline btn-sm' onClick={deselectAll}>
						Deseleccionar todos
					</button>
				</div>
			</div>

			<div className='shopping-review-list'>
				{Object.entries(groups).map(([source, sourceItems]) => (
					<div key={source} className='shopping-review-group'>
						<h4 className='shopping-review-group-title'>{source}</h4>
						{sourceItems.map((item) => (
							<label
								key={item.id}
								className={`shopping-review-item ${item.selected ? 'selected' : ''}`}>
								<input
									type='checkbox'
									checked={item.selected}
									onChange={() => toggleItem(item.id)}
								/>
								<span className='shopping-review-item-content'>
									<span className='shopping-review-item-name'>{item.name}</span>
									<span className='shopping-review-item-qty'>
										{item.quantity} {item.unit}
									</span>
								</span>
							</label>
						))}
					</div>
				))}
			</div>

			<div className='shopping-review-footer'>
				<span className='shopping-review-count'>
					{selectedCount} de {items.length} seleccionados
				</span>
				<div className='shopping-review-actions'>
					<button className='btn btn-outline' onClick={onCancel}>
						Cancelar
					</button>
					<button className='btn btn-primary' onClick={handleConfirm}>
						Añadir a la lista ({selectedCount})
					</button>
				</div>
			</div>
		</div>
	)
}
