import './ShoppingList.scss'

import { useTranslation } from 'react-i18next'

import { ShoppingItem } from '@/services/shopping'

import { ShoppingItemRow } from './ShoppingItem'

interface ShoppingListProps {
	items: ShoppingItem[]
	checkedItems: Set<number>
	onToggle: (id: number) => void
	onExclude?: (id: number) => void
}

export function ShoppingList({ items, checkedItems, onToggle, onExclude }: ShoppingListProps) {
	const { t } = useTranslation()

	if (items.length === 0) {
		return (
			<div className='empty-state'>
				<p>{t('shopping.emptyList')}</p>
				<p className='text-secondary text-sm mt-1'>{t('shopping.emptyHint')}</p>
			</div>
		)
	}

	const uncheckedItems = items.filter((item) => !checkedItems.has(item.ingredientId))
	const checked = items.filter((item) => checkedItems.has(item.ingredientId))

	return (
		<div className='shopping-list'>
			{uncheckedItems.length > 0 && (
				<div className='shopping-list-section'>
					<h3 className='shopping-list-title'>
						{t('shopping.toBuy')} ({uncheckedItems.length})
					</h3>
					<ul className='shopping-list-items'>
						{uncheckedItems.map((item) => (
							<ShoppingItemRow
								key={item.ingredientId}
								item={item}
								checked={false}
								onToggle={() => onToggle(item.ingredientId)}
								onExclude={onExclude ? () => onExclude(item.ingredientId) : undefined}
							/>
						))}
					</ul>
				</div>
			)}

			{checked.length > 0 && (
				<div className='shopping-list-section'>
					<h3 className='shopping-list-title text-secondary'>
						{t('shopping.purchased')} ({checked.length})
					</h3>
					<ul className='shopping-list-items shopping-list-checked'>
						{checked.map((item) => (
							<ShoppingItemRow
								key={item.ingredientId}
								item={item}
								checked={true}
								onToggle={() => onToggle(item.ingredientId)}
							/>
						))}
					</ul>
				</div>
			)}
		</div>
	)
}
