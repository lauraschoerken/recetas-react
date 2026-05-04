import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { ShoppingItem, shoppingService } from '@/services/shopping'
import { ingredientService, Ingredient } from '@/services/ingredient'
import { ingredientTagService } from '@/services/ingredientExtras'
import { api } from '@/services/api'
import { useDialog } from '@/utils/dialog/DialogContext'
import { normalizeText } from '@/utils/normalize'

import { ShoppingList } from '../components/ShoppingList'

const STORAGE_KEY_CHECKED = 'shopping_checked'
const STORAGE_KEY_EXCLUDED = 'shopping_excluded'

export function ShoppingListContainer() {
	const { t } = useTranslation()
	const { toast } = useDialog()
	const [allItems, setAllItems] = useState<ShoppingItem[]>([])
	const [excludedItems, setExcludedItems] = useState<Set<number>>(new Set())
	const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())
	const [loading, setLoading] = useState(true)
	const [showReview, setShowReview] = useState(false)

	// Add item form
	const [showAddItem, setShowAddItem] = useState(false)
	const [allIngredients, setAllIngredients] = useState<Ingredient[]>([])
	const [addSearch, setAddSearch] = useState('')
	const [addSelectedIngredient, setAddSelectedIngredient] = useState<Ingredient | null>(null)
	const [addQty, setAddQty] = useState<number>(1)
	const [addUnit, setAddUnit] = useState<string>('g')

	// Export
	const [exportMenuOpen, setExportMenuOpen] = useState(false)
	const [exporting, setExporting] = useState(false)

	useEffect(() => {
		// Cargar estado persistente de localStorage
		const savedExcluded = localStorage.getItem(STORAGE_KEY_EXCLUDED)
		const savedChecked = localStorage.getItem(STORAGE_KEY_CHECKED)
		if (savedExcluded) setExcludedItems(new Set(JSON.parse(savedExcluded)))
		if (savedChecked) setCheckedItems(new Set(JSON.parse(savedChecked)))
		loadShoppingList()
	}, [])

	const visibleItems = allItems.filter((item) => !excludedItems.has(item.ingredientId))

	const loadShoppingList = async () => {
		setLoading(true)
		try {
			// Sin fechas: todos los ítems pendientes desde hoy en adelante
			const data = await shoppingService.getShoppingList()
			setAllItems(data)
		} catch {
			console.error('Error al cargar la lista de la compra')
		} finally {
			setLoading(false)
		}
	}

	const handleToggle = (id: number) => {
		const newChecked = new Set(checkedItems)
		if (newChecked.has(id)) {
			newChecked.delete(id)
		} else {
			newChecked.add(id)
		}
		setCheckedItems(newChecked)
		localStorage.setItem(STORAGE_KEY_CHECKED, JSON.stringify([...newChecked]))
	}

	const handleExclude = (id: number) => {
		const newExcluded = new Set(excludedItems)
		newExcluded.add(id)
		setExcludedItems(newExcluded)
		localStorage.setItem(STORAGE_KEY_EXCLUDED, JSON.stringify([...newExcluded]))

		const newChecked = new Set(checkedItems)
		if (newChecked.has(id)) {
			newChecked.delete(id)
			setCheckedItems(newChecked)
			localStorage.setItem(STORAGE_KEY_CHECKED, JSON.stringify([...newChecked]))
		}
	}

	const handleRestoreItem = (id: number) => {
		const newExcluded = new Set(excludedItems)
		newExcluded.delete(id)
		setExcludedItems(newExcluded)
		localStorage.setItem(STORAGE_KEY_EXCLUDED, JSON.stringify([...newExcluded]))
	}

	const clearChecked = () => {
		setCheckedItems(new Set())
		localStorage.removeItem(STORAGE_KEY_CHECKED)
	}

	const resetAll = () => {
		setCheckedItems(new Set())
		localStorage.removeItem(STORAGE_KEY_CHECKED)
	}

	const handleOpenAddItem = async () => {
		setShowAddItem(true)
		if (allIngredients.length === 0) {
			try {
				const ingredients = await ingredientService.getAll()
				setAllIngredients(ingredients)
			} catch {
				console.error('Error loading ingredients')
			}
		}
	}

	const handleSelectAddIngredient = (ing: Ingredient) => {
		setAddSelectedIngredient(ing)
		setAddUnit(ing.unit)
		setAddSearch(ing.name)
	}

	const handleAddItem = async () => {
		if (!addSelectedIngredient || addQty <= 0) return
		try {
			await shoppingService.addManualItems([
				{
					ingredientId: addSelectedIngredient.id,
					quantity: addQty,
					unit: addUnit,
				},
			])
			toast.success(t('shopping.itemAdded'))
			setShowAddItem(false)
			setAddSelectedIngredient(null)
			setAddSearch('')
			setAddQty(1)
			loadShoppingList()
		} catch {
			toast.error(t('shopping.addItemError'))
		}
	}

	const addFilteredIngredients =
		addSearch.length >= 2
			? allIngredients.filter(
					(i) =>
						normalizeText(i.name).includes(normalizeText(addSearch)) &&
						i.id !== addSelectedIngredient?.id
				)
			: []

	const weekLabel = new Date().toLocaleDateString('es-ES', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	})

	const handleExportClipboard = async (withCategories: boolean) => {
		setExportMenuOpen(false)
		setExporting(true)
		try {
			const items = visibleItems

			if (!withCategories) {
				const lines = items.map((i) => {
					const qty =
						i.quantityToBuy % 1 === 0 ? String(i.quantityToBuy) : i.quantityToBuy.toFixed(1)
					return `- ${i.name}: ${qty} ${i.unit}`
				})
				await navigator.clipboard.writeText(
					`${t('shopping.title')} (${weekLabel})\n\n${lines.join('\n')}`
				)
			} else {
				const ids = items.map((i) => i.ingredientId)
				const tagMap = await ingredientTagService.getBulkTagAssignments(ids)
				const noCategory = t('shopping.noCategory')

				const groups: Record<string, typeof items> = {}
				for (const item of items) {
					const tags = tagMap[String(item.ingredientId)] || []
					const groupName = tags.length > 0 ? tags[0].name : noCategory
					if (!groups[groupName]) groups[groupName] = []
					groups[groupName].push(item)
				}

				const lines: string[] = [`${t('shopping.title')} (${weekLabel})`, '']
				for (const [group, groupItems] of Object.entries(groups)) {
					lines.push(`${group}:`)
					for (const i of groupItems) {
						const qty =
							i.quantityToBuy % 1 === 0 ? String(i.quantityToBuy) : i.quantityToBuy.toFixed(1)
						lines.push(`  - ${i.name}: ${qty} ${i.unit}`)
					}
					lines.push('')
				}
				await navigator.clipboard.writeText(lines.join('\n').trim())
			}
			toast.success(t('shopping.copiedToClipboard'))
		} catch {
			toast.error(t('shopping.exportError'))
		} finally {
			setExporting(false)
		}
	}

	const handleExportPdf = async () => {
		setExportMenuOpen(false)
		setExporting(true)
		try {
			await shoppingService.downloadShoppingPdf(
				visibleItems.map((i) => ({
					name: i.name,
					quantityToBuy: i.quantityToBuy,
					unit: i.unit,
				})),
				weekLabel
			)
		} catch {
			toast.error(t('shopping.exportError'))
		} finally {
			setExporting(false)
		}
	}
	const excludedItemsList = allItems.filter((item) => excludedItems.has(item.ingredientId))

	return (
		<>
			<div className='page-header'>
				<h1 className='page-title'>{t('shopping.title')}</h1>
				<div className='page-header-actions'>
					<div className='export-dropdown'>
						<button
							className='btn btn-outline'
							onClick={() => setExportMenuOpen((o) => !o)}
							disabled={exporting || visibleItems.length === 0}>
							{t('shopping.exportTitle')}
						</button>
						{exportMenuOpen && (
							<div className='export-dropdown__menu' onMouseLeave={() => setExportMenuOpen(false)}>
								<button
									className='export-dropdown__item'
									onClick={() => handleExportClipboard(false)}>
									{t('shopping.exportClipboard')}
								</button>
								<button
									className='export-dropdown__item'
									onClick={() => handleExportClipboard(true)}>
									{t('shopping.exportClipboardGrouped')}
								</button>
								<button className='export-dropdown__item' onClick={handleExportPdf}>
									{t('shopping.exportPdf')}
								</button>
							</div>
						)}
					</div>
					<button className='btn btn-outline' onClick={handleOpenAddItem}>
						{t('shopping.addItem')}
					</button>
					{excludedItems.size > 0 && (
						<button className='btn btn-outline btn-sm' onClick={() => setShowReview(!showReview)}>
							{showReview
								? t('shopping.hideExcluded')
								: `${t('shopping.showExcluded')} (${excludedItems.size})`}
						</button>
					)}
					<Link to='/week-plan' className='btn btn-outline'>
						{t('shopping.viewWeekPlan')}
					</Link>
				</div>
			</div>

			{showReview && excludedItemsList.length > 0 && (
				<div className='card mb-2 excluded-items-card'>
					<h3 className='text-secondary mb-1'>{t('shopping.excludedTitle')}</h3>
					<p className='text-sm text-secondary mb-1'>{t('shopping.excludedHint')}</p>
					<div className='excluded-items-list'>
						{excludedItemsList.map((item) => (
							<button
								key={item.ingredientId}
								className='excluded-item-tag'
								onClick={() => handleRestoreItem(item.ingredientId)}>
								{item.name} ({item.totalQuantity} {item.unit})
								<span className='restore-icon'>+</span>
							</button>
						))}
					</div>
				</div>
			)}

			{loading ? (
				<div className='loading'>{t('shopping.loading')}</div>
			) : (
				<>
					<ShoppingList
						items={visibleItems}
						checkedItems={checkedItems}
						onToggle={handleToggle}
						onExclude={handleExclude}
					/>

					{checkedItems.size > 0 && (
						<div className='shopping-actions mt-2'>
							{checkedItems.size > 0 && (
								<button
									className='btn btn-primary btn-sm'
									onClick={async () => {
										const itemsToMark = visibleItems.filter((i) => checkedItems.has(i.ingredientId))
										try {
											await api.post('/shopping-list/mark-purchased', {
												items: itemsToMark.map((i) => ({
													ingredientId: i.ingredientId,
													quantity: i.quantityToBuy,
													unit: i.unit,
												})),
											})
											toast.success(`${itemsToMark.length} ${t('shopping.addedToHome')}`)
											clearChecked()
											loadShoppingList()
										} catch {
											toast.error(t('shopping.purchaseError'))
										}
									}}>
									{t('shopping.markPurchased')} ({checkedItems.size})
								</button>
							)}
							{checkedItems.size > 0 && (
								<button className='btn btn-outline btn-sm' onClick={clearChecked}>
									{t('shopping.unmarkPurchased')}
								</button>
							)}
							<button className='btn btn-outline btn-sm' onClick={resetAll}>
								{t('shopping.resetAll')}
							</button>
						</div>
					)}
				</>
			)}

			{showAddItem && (
				<div className='modal-overlay' onClick={() => setShowAddItem(false)}>
					<div className='modal-card' onClick={(e) => e.stopPropagation()}>
						<h3>{t('shopping.addItemTitle')}</h3>

						<div className='form-group'>
							<label>{t('ingredients.ingredientLabel')}</label>
							<input
								type='text'
								value={addSearch}
								onChange={(e) => {
									setAddSearch(e.target.value)
									if (addSelectedIngredient && e.target.value !== addSelectedIngredient.name) {
										setAddSelectedIngredient(null)
									}
								}}
								placeholder={t('ingredients.searchPlaceholder')}
								autoFocus
							/>
							{addFilteredIngredients.length > 0 && !addSelectedIngredient && (
								<ul className='suggestions-list'>
									{addFilteredIngredients.slice(0, 8).map((ing) => (
										<li key={ing.id} onClick={() => handleSelectAddIngredient(ing)}>
											{ing.name} <span className='text-secondary'>({ing.unit})</span>
										</li>
									))}
								</ul>
							)}
						</div>

						{addSelectedIngredient && (
							<div className='form-row'>
								<div className='form-group'>
									<label>{t('ingredients.quantityPlaceholder')}</label>
									<input
										type='number'
										min='0'
										step='any'
										value={addQty}
										onChange={(e) => setAddQty(parseFloat(e.target.value) || 0)}
									/>
								</div>
								<div className='form-group'>
									<label>{t('ingredients.unitHeader')}</label>
									<select value={addUnit} onChange={(e) => setAddUnit(e.target.value)}>
										<option value={addSelectedIngredient.unit}>{addSelectedIngredient.unit}</option>
										{addSelectedIngredient.unit === 'g' && <option value='kg'>kg</option>}
										{addSelectedIngredient.unit === 'ml' && <option value='l'>l</option>}
										{(addSelectedIngredient.conversions || []).map((c) => (
											<option key={c.id} value={c.unitName}>
												{c.unitName}
											</option>
										))}
									</select>
								</div>
							</div>
						)}

						<div className='modal-actions'>
							<button className='btn btn-outline' onClick={() => setShowAddItem(false)}>
								{t('cancel')}
							</button>
							<button
								className='btn btn-primary'
								disabled={!addSelectedIngredient || addQty <= 0}
								onClick={handleAddItem}>
								{t('shopping.addToList')}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	)
}
