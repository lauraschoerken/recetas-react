import './ShoppingItem.scss'

import { useTranslation } from 'react-i18next'

import { DeleteIcon } from '@/components/shared/icons'
import { ShoppingItem } from '@/services/shopping'

interface ShoppingItemRowProps {
	item: ShoppingItem
	checked: boolean
	onToggle: () => void
	onExclude?: () => void
}

export function ShoppingItemRow({ item, checked, onToggle, onExclude }: ShoppingItemRowProps) {
	const { t } = useTranslation()

	const formatQuantity = (qty: number): string => {
		if (Number.isInteger(qty)) return qty.toString()
		return qty.toFixed(1)
	}

	const hasAtHome = item.quantityAtHome > 0
	const needsToBuy = item.quantityToBuy > 0

	// Usar unidad preferida si está disponible
	const hasPreferred = item.preferredUnit && item.preferredQuantity != null
	const displayQuantity = hasPreferred
		? formatQuantity(item.preferredQuantity!)
		: formatQuantity(item.quantityToBuy)
	const displayUnit = hasPreferred ? item.preferredUnit : item.unit

	return (
		<li
			className={`shopping-item ${checked ? 'shopping-item-checked' : ''} ${!needsToBuy ? 'shopping-item-covered' : ''}`}>
			<label className='shopping-item-label'>
				<input
					type='checkbox'
					checked={checked}
					onChange={onToggle}
					className='shopping-item-checkbox'
				/>
				<div className='shopping-item-info'>
					<span className='shopping-item-name'>{item.name}</span>
					<div className='shopping-item-breakdown'>
						<span className='shopping-item-total' title={t('shopping.totalNeeded')}>
							{formatQuantity(item.totalQuantity)} {item.unit} {t('shopping.needed')}
						</span>
						{hasAtHome && (
							<span className='shopping-item-athome' title={t('shopping.atHome')}>
								-{formatQuantity(item.quantityAtHome)} {item.unit} {t('shopping.atHome')}
							</span>
						)}
					</div>
				</div>
				<span className={`shopping-item-tobuy ${!needsToBuy ? 'shopping-item-tobuy-zero' : ''}`}>
					{needsToBuy ? (
						<>
							<span className='shopping-item-preferred'>
								{displayQuantity} {displayUnit}
							</span>
							{hasPreferred && (
								<span className='shopping-item-base-qty' title={t('shopping.inGrams')}>
									({formatQuantity(item.quantityToBuy)} {item.unit})
								</span>
							)}
						</>
					) : (
						<span className='shopping-item-covered-text'>{t('shopping.covered')}</span>
					)}
				</span>
			</label>
			{onExclude && !checked && needsToBuy && (
				<button
					className='shopping-item-exclude'
					onClick={onExclude}
					title={t('shopping.excludeItem')}>
					<DeleteIcon size={14} aria-hidden='true' />
				</button>
			)}
		</li>
	)
}
