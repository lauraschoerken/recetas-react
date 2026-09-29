import './ShoppingItem.scss'

import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DeleteIcon } from '@/components/shared/icons'
import { ShoppingItem } from '@/services/shopping'
import {
	convertUnitQuantity,
	formatUnitQuantity,
	getAvailableUnits,
	roundUnitQuantity,
} from '@/utils/unitConversion'

interface ShoppingItemRowProps {
	item: ShoppingItem
	checked: boolean
	onToggle: () => void
	onExclude?: () => void
	quantityOverride?: number
	onQuantityOverride?: (qty: number) => void
	unitOverride?: string
	onUnitOverride?: (unit: string, qty: number) => void
}

export function ShoppingItemRow({
	item,
	checked,
	onToggle,
	onExclude,
	quantityOverride,
	onQuantityOverride,
	unitOverride,
	onUnitOverride,
}: ShoppingItemRowProps) {
	const { t } = useTranslation()
	const [editingQty, setEditingQty] = useState(false)
	const [editingUnit, setEditingUnit] = useState(false)
	const [editQtyValue, setEditQtyValue] = useState('')
	const [editUnitValue, setEditUnitValue] = useState('')
	const qtyInputRef = useRef<HTMLInputElement>(null)

	const hasAtHome = item.quantityAtHome > 0

	const conversions = item.conversions ?? []
	const allUnits = getAvailableUnits(item.unit, conversions)
	const activeUnit = unitOverride ?? item.preferredUnit ?? item.unit
	const convertedDefaultQty = convertUnitQuantity(
		item.quantityToBuy,
		item.unit,
		activeUnit,
		item.unit,
		conversions
	)
	const computedQtyInActiveUnit = roundUnitQuantity(
		item.preferredQuantity != null &&
			item.preferredUnit != null &&
			activeUnit.toLowerCase() === item.preferredUnit.toLowerCase()
			? item.preferredQuantity
			: (convertedDefaultQty ?? item.quantityToBuy)
	)

	const effectiveDisplayQty = quantityOverride ?? computedQtyInActiveUnit
	const purchaseTotal = convertUnitQuantity(
		effectiveDisplayQty,
		activeUnit,
		item.unit,
		item.unit,
		conversions
	)
	const difference =
		purchaseTotal == null ? null : roundUnitQuantity(purchaseTotal - item.quantityToBuy)
	const displayQuantity = formatUnitQuantity(effectiveDisplayQty)
	const displayUnit = activeUnit

	// --- Cantidad ---
	const handleQtyEditStart = (e: React.MouseEvent) => {
		e.stopPropagation()
		if (!onQuantityOverride) return
		setEditQtyValue(String(roundUnitQuantity(effectiveDisplayQty)))
		setEditingQty(true)
		setTimeout(() => qtyInputRef.current?.select(), 0)
	}

	const handleQtyConfirm = () => {
		const val = parseFloat(editQtyValue.replace(',', '.'))
		if (!isNaN(val) && val >= 0) onQuantityOverride?.(roundUnitQuantity(val))
		setEditingQty(false)
	}

	const handleQtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') handleQtyConfirm()
		if (e.key === 'Escape') setEditingQty(false)
	}

	// --- Unidad ---
	const handleUnitEditStart = (e: React.MouseEvent) => {
		e.stopPropagation()
		if (!onUnitOverride) return
		setEditUnitValue(displayUnit)
		setEditingUnit(true)
	}

	const applyUnitChange = (newUnit: string) => {
		const trimmed = newUnit.trim()
		if (!trimmed) {
			setEditingUnit(false)
			return
		}
		const converted = convertUnitQuantity(
			effectiveDisplayQty,
			activeUnit,
			trimmed,
			item.unit,
			conversions
		)
		onUnitOverride?.(trimmed, roundUnitQuantity(converted ?? effectiveDisplayQty))
		setEditingUnit(false)
	}

	return (
		<li
			className={`shopping-item ${checked ? 'shopping-item-checked' : ''} ${effectiveDisplayQty <= 0 ? 'shopping-item-covered' : ''}`}>
			<label className='shopping-item-label'>
				<input
					type='checkbox'
					checked={checked}
					onChange={onToggle}
					disabled={effectiveDisplayQty <= 0}
					className='shopping-item-checkbox'
				/>
				<div className='shopping-item-info'>
					<span className='shopping-item-name'>{item.name}</span>
					<div className='shopping-item-breakdown'>
						{item.totalQuantity > 0 && (
							<span className='shopping-item-total' title={t('shopping.totalNeeded')}>
								{t('shopping.recipeNeeds')}: {formatUnitQuantity(item.totalQuantity)} {item.unit}
							</span>
						)}
						{hasAtHome && (
							<span className='shopping-item-athome' title={t('shopping.atHome')}>
								{t('shopping.atHome')}: {formatUnitQuantity(item.quantityAtHome)} {item.unit}
							</span>
						)}
						{(item.manualQuantity ?? 0) > 0 && (
							<span className='shopping-item-manual' title={t('shopping.manualRequest')}>
								{t('shopping.manualRequest')}: {formatUnitQuantity(item.manualQuantity ?? 0)}{' '}
								{item.unit}
							</span>
						)}
					</div>
				</div>
			</label>
			<span
				className={`shopping-item-tobuy ${effectiveDisplayQty <= 0 ? 'shopping-item-tobuy-zero' : ''}`}
				onClick={(e) => e.stopPropagation()}>
				<span className='shopping-item-qty-display'>
					{/* Cantidad */}
					{editingQty ? (
						<input
							ref={qtyInputRef}
							type='number'
							className='shopping-item-qty-input'
							value={editQtyValue}
							min={0}
							step='any'
							onChange={(e) => setEditQtyValue(e.target.value)}
							onBlur={handleQtyConfirm}
							onKeyDown={handleQtyKeyDown}
							aria-label={t('shopping.editQuantity')}
						/>
					) : (
						<span
							className={`shopping-item-preferred ${onQuantityOverride ? 'shopping-item-qty-clickable' : ''} ${quantityOverride != null ? 'shopping-item-qty-overridden' : ''}`}
							onClick={onQuantityOverride ? handleQtyEditStart : undefined}
							title={onQuantityOverride ? t('shopping.editQuantity') : undefined}>
							{displayQuantity}
						</span>
					)}

					{/* Unidad — clickable solo si tiene conversiones */}
					{editingUnit && allUnits.length > 1 ? (
						<select
							className='shopping-item-unit-select'
							value={editUnitValue}
							autoFocus
							onChange={(e) => applyUnitChange(e.target.value)}
							onBlur={() => setTimeout(() => setEditingUnit(false), 150)}
							aria-label={t('shopping.changeUnit')}>
							{allUnits.map((unit) => (
								<option key={unit} value={unit}>
									{unit}
								</option>
							))}
						</select>
					) : (
						<span
							className={`shopping-item-unit-label ${allUnits.length > 1 && onUnitOverride ? 'shopping-item-unit-clickable' : ''} ${unitOverride != null ? 'shopping-item-unit-overridden' : ''}`}
							onClick={allUnits.length > 1 && onUnitOverride ? handleUnitEditStart : undefined}
							title={allUnits.length > 1 && onUnitOverride ? t('shopping.changeUnit') : undefined}>
							{displayUnit}
						</span>
					)}
				</span>

				{activeUnit.toLowerCase() !== item.unit.toLowerCase() && purchaseTotal != null && (
					<span className='shopping-item-base-qty' title={t('shopping.inGrams')}>
						{difference != null && Math.abs(difference) > 0.001 ? (
							<>
								({t('shopping.neededQty')} {formatUnitQuantity(item.quantityToBuy)} {item.unit}
								{' · '}
								{t('shopping.buyingQty')} {formatUnitQuantity(purchaseTotal)} {item.unit}
								{difference > 0.001 && (
									<>
										{' '}
										· {t('shopping.surplus')} {formatUnitQuantity(difference)} {item.unit}
									</>
								)}
								)
							</>
						) : (
							<>
								({formatUnitQuantity(item.quantityToBuy)} {item.unit})
							</>
						)}
					</span>
				)}
			</span>
			{onExclude && !checked && (
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
