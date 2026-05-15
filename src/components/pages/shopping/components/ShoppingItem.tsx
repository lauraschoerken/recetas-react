import './ShoppingItem.scss'

import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DeleteIcon } from '@/components/shared/icons'
import { ShoppingItem } from '@/services/shopping'

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
	const unitInputRef = useRef<HTMLInputElement>(null)

	const formatQuantity = (qty: number): string => {
		if (Number.isInteger(qty)) return qty.toString()
		return qty.toFixed(1)
	}

	const hasAtHome = item.quantityAtHome > 0
	const needsToBuy = item.quantityToBuy > 0

	// Unidades disponibles: base + conversiones del ingrediente (sin duplicar la unidad base)
	const conversions = item.conversions ?? []
	const conversionsWithoutBase = conversions.filter(
		(c) => c.unitName.toLowerCase() !== item.unit.toLowerCase()
	)
	const allUnits: { unitName: string; gramsPerUnit: number | null }[] = [
		{ unitName: item.unit, gramsPerUnit: null },
		...conversionsWithoutBase,
	]

	// Para ingredientes cuya unidad base NO es g/ml (p.ej. "ud."),
	// la conversión de la propia unidad base nos dice cuántos g/ml vale 1 ud.
	// Así podemos convertir correctamente: 1 ud. * 100 ml/ud. / 400 ml/pack = 0.25 pack
	const baseUnitConversion = conversions.find(
		(c) => c.unitName.toLowerCase() === item.unit.toLowerCase()
	)
	const quantityInGrams =
		baseUnitConversion && baseUnitConversion.gramsPerUnit > 0
			? item.quantityToBuy * baseUnitConversion.gramsPerUnit
			: item.quantityToBuy

	const activeUnit = unitOverride ?? item.preferredUnit ?? item.unit
	const activeConversion = conversionsWithoutBase.find(
		(c) => c.unitName.toLowerCase() === activeUnit.toLowerCase()
	)
	const computedQtyInActiveUnit =
		activeConversion && activeConversion.gramsPerUnit > 0
			? Math.round((quantityInGrams / activeConversion.gramsPerUnit) * 10) / 10
			: item.quantityToBuy

	// Cantidad efectiva en la unidad mostrada (respeta override del usuario)
	const effectiveDisplayQty = quantityOverride ?? computedQtyInActiveUnit
	// Conversión para la unidad activa: puede ser una conversión normal o la de la propia unidad base
	const activeUnitConversion =
		activeConversion ??
		(activeUnit.toLowerCase() === item.unit.toLowerCase() ? (baseUnitConversion ?? null) : null)
	// Cantidad efectiva en g/ml para poder hacer conversiones usando el override actual
	const effectiveQtyInGrams =
		activeUnitConversion && activeUnitConversion.gramsPerUnit > 0
			? effectiveDisplayQty * activeUnitConversion.gramsPerUnit
			: effectiveDisplayQty

	const displayQuantity =
		quantityOverride != null
			? formatQuantity(quantityOverride)
			: formatQuantity(computedQtyInActiveUnit)
	const displayUnit = activeUnit

	// --- Cantidad ---
	const handleQtyEditStart = (e: React.MouseEvent) => {
		e.stopPropagation()
		if (!onQuantityOverride) return
		setEditQtyValue(displayQuantity)
		setEditingQty(true)
		setTimeout(() => qtyInputRef.current?.select(), 0)
	}

	const handleQtyConfirm = () => {
		const val = parseFloat(editQtyValue.replace(',', '.'))
		if (!isNaN(val) && val > 0) onQuantityOverride?.(val)
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
		setTimeout(() => unitInputRef.current?.select(), 0)
	}

	const applyUnitChange = (newUnit: string) => {
		const trimmed = newUnit.trim()
		if (!trimmed) {
			setEditingUnit(false)
			return
		}
		// Si vuelven a la unidad base
		if (trimmed.toLowerCase() === item.unit.toLowerCase()) {
			const baseQty =
				baseUnitConversion && baseUnitConversion.gramsPerUnit > 0
					? Math.round((effectiveQtyInGrams / baseUnitConversion.gramsPerUnit) * 10) / 10
					: effectiveQtyInGrams
			onUnitOverride?.(trimmed, baseQty)
			setEditingUnit(false)
			return
		}
		const conv = conversions.find((c) => c.unitName.toLowerCase() === trimmed.toLowerCase())
		const newQty =
			conv && conv.gramsPerUnit > 0
				? Math.round((effectiveQtyInGrams / conv.gramsPerUnit) * 10) / 10
				: effectiveDisplayQty
		onUnitOverride?.(trimmed, newQty)
		setEditingUnit(false)
	}

	const handleUnitKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') applyUnitChange(editUnitValue)
		if (e.key === 'Escape') setEditingUnit(false)
	}

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
			</label>
			<span
				className={`shopping-item-tobuy ${!needsToBuy ? 'shopping-item-tobuy-zero' : ''}`}
				onClick={(e) => e.stopPropagation()}>
				{needsToBuy ? (
					<>
						<span className='shopping-item-qty-display'>
							{/* Cantidad */}
							{editingQty ? (
								<input
									ref={qtyInputRef}
									type='number'
									className='shopping-item-qty-input'
									value={editQtyValue}
									min={0.1}
									step={0.5}
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
							{editingUnit && conversionsWithoutBase.length > 0 ? (
								<select
									className='shopping-item-unit-select'
									value={editUnitValue}
									autoFocus
									onChange={(e) => applyUnitChange(e.target.value)}
									onBlur={() => setTimeout(() => setEditingUnit(false), 150)}
									aria-label={t('shopping.changeUnit')}>
									{allUnits.map((u) => (
										<option key={u.unitName} value={u.unitName}>
											{u.unitName}
										</option>
									))}
								</select>
							) : (
								<span
									className={`shopping-item-unit-label ${conversionsWithoutBase.length > 0 && onUnitOverride ? 'shopping-item-unit-clickable' : ''} ${unitOverride != null ? 'shopping-item-unit-overridden' : ''}`}
									onClick={
										conversionsWithoutBase.length > 0 && onUnitOverride
											? handleUnitEditStart
											: undefined
									}
									title={
										conversionsWithoutBase.length > 0 && onUnitOverride
											? t('shopping.changeUnit')
											: undefined
									}>
									{displayUnit}
								</span>
							)}
						</span>

						{activeUnit !== item.unit && (
							<span className='shopping-item-base-qty' title={t('shopping.inGrams')}>
								({formatQuantity(item.quantityToBuy)} {item.unit})
							</span>
						)}
					</>
				) : (
					<span className='shopping-item-covered-text'>{t('shopping.covered')}</span>
				)}
			</span>
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
