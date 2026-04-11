import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { ShoppingItem, shoppingService } from '@/services/shopping'
import { ingredientService, Ingredient } from '@/services/ingredient'
import { api } from '@/services/api'
import { useDialog } from '@/utils/dialog/DialogContext'

import { ShoppingList } from '../components/ShoppingList'

function getWeekStart(date: Date): Date {
	const d = new Date(date)
	const day = d.getDay()
	const diff = d.getDate() - day + (day === 0 ? -6 : 1)
	d.setDate(diff)
	d.setHours(0, 0, 0, 0)
	return d
}

function getWeekEnd(startDate: Date): Date {
	const d = new Date(startDate)
	d.setDate(d.getDate() + 6)
	d.setHours(23, 59, 59, 999)
	return d
}

function getStorageKey(weekStart: Date): string {
	return `shopping_${weekStart.toISOString().split('T')[0]}`
}

export function ShoppingListContainer() {
	const { t } = useTranslation()
	const { toast } = useDialog()
	const [allItems, setAllItems] = useState<ShoppingItem[]>([])
	const [filteredItems, setFilteredItems] = useState<ShoppingItem[]>([])
	const [excludedItems, setExcludedItems] = useState<Set<number>>(new Set())
	const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())
	const [loading, setLoading] = useState(true)
	const [showReview, setShowReview] = useState(false)
	const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()))

	// Add item form
	const [showAddItem, setShowAddItem] = useState(false)
	const [allIngredients, setAllIngredients] = useState<Ingredient[]>([])
	const [addSearch, setAddSearch] = useState('')
	const [addSelectedIngredient, setAddSelectedIngredient] = useState<Ingredient | null>(null)
	const [addQty, setAddQty] = useState<number>(1)
	const [addUnit, setAddUnit] = useState<string>('g')

	useEffect(() => {
		loadShoppingList()
	}, [currentWeekStart])

	useEffect(() => {
		const key = getStorageKey(currentWeekStart)
		const savedExcluded = localStorage.getItem(`${key}_excluded`)
		const savedChecked = localStorage.getItem(`${key}_checked`)

		if (savedExcluded) {
			setExcludedItems(new Set(JSON.parse(savedExcluded)))
		} else {
			setExcludedItems(new Set())
		}

		if (savedChecked) {
			setCheckedItems(new Set(JSON.parse(savedChecked)))
		} else {
			setCheckedItems(new Set())
		}
	}, [currentWeekStart])

	useEffect(() => {
		setFilteredItems(allItems.filter((item) => !excludedItems.has(item.ingredientId)))
	}, [allItems, excludedItems])

	const loadShoppingList = async () => {
		setLoading(true)
		try {
			const endDate = getWeekEnd(currentWeekStart)
			const data = await shoppingService.getShoppingList(
				currentWeekStart.toISOString(),
				endDate.toISOString()
			)
			setAllItems(data)
		} catch {
			console.error('Error al cargar la lista de la compra')
		} finally {
			setLoading(false)
		}
	}

	const handleToggle = (id: number) => {
		const key = getStorageKey(currentWeekStart)
		const newChecked = new Set(checkedItems)
		if (newChecked.has(id)) {
			newChecked.delete(id)
		} else {
			newChecked.add(id)
		}
		setCheckedItems(newChecked)
		localStorage.setItem(`${key}_checked`, JSON.stringify([...newChecked]))
	}

	const handleExclude = (id: number) => {
		const key = getStorageKey(currentWeekStart)
		const newExcluded = new Set(excludedItems)
		newExcluded.add(id)
		setExcludedItems(newExcluded)
		localStorage.setItem(`${key}_excluded`, JSON.stringify([...newExcluded]))
	}

	const handleRestoreItem = (id: number) => {
		const key = getStorageKey(currentWeekStart)
		const newExcluded = new Set(excludedItems)
		newExcluded.delete(id)
		setExcludedItems(newExcluded)
		localStorage.setItem(`${key}_excluded`, JSON.stringify([...newExcluded]))
	}

	const clearChecked = () => {
		const key = getStorageKey(currentWeekStart)
		setCheckedItems(new Set())
		localStorage.removeItem(`${key}_checked`)
	}

	const resetAll = () => {
		const key = getStorageKey(currentWeekStart)
		setCheckedItems(new Set())
		setExcludedItems(new Set())
		localStorage.removeItem(`${key}_checked`)
		localStorage.removeItem(`${key}_excluded`)
	}

	const goToPreviousWeek = () => {
		const prev = new Date(currentWeekStart)
		prev.setDate(prev.getDate() - 7)
		setCurrentWeekStart(prev)
	}

	const goToNextWeek = () => {
		const next = new Date(currentWeekStart)
		next.setDate(next.getDate() + 7)
		setCurrentWeekStart(next)
	}

	const goToCurrentWeek = () => {
		setCurrentWeekStart(getWeekStart(new Date()))
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
						i.name.toLowerCase().includes(addSearch.toLowerCase()) &&
						i.id !== addSelectedIngredient?.id
				)
			: []

	const weekEndDate = getWeekEnd(currentWeekStart)
	const weekLabel = `${currentWeekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${weekEndDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`

	const excludedItemsList = allItems.filter((item) => excludedItems.has(item.ingredientId))

	return (
		<>
			<div className='page-header'>
				<h1 className='page-title'>{t('shopping.title')}</h1>
				<div className='page-header-actions'>
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

			<div className='card mb-2'>
				<div className='flex flex-between flex-center'>
					<button className='btn btn-outline btn-sm' onClick={goToPreviousWeek}>
						&larr; {t('shopping.prev')}
					</button>
					<div className='text-center'>
						<strong>{weekLabel}</strong>
						<button
							className='btn btn-outline btn-sm'
							onClick={goToCurrentWeek}
							style={{ marginLeft: '1rem' }}>
							{t('shopping.today')}
						</button>
					</div>
					<button className='btn btn-outline btn-sm' onClick={goToNextWeek}>
						{t('shopping.next')} &rarr;
					</button>
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
						items={filteredItems}
						checkedItems={checkedItems}
						onToggle={handleToggle}
						onExclude={handleExclude}
					/>

					{(checkedItems.size > 0 || excludedItems.size > 0) && (
						<div className='shopping-actions mt-2'>
							{checkedItems.size > 0 && (
								<button
									className='btn btn-primary btn-sm'
									onClick={async () => {
										const itemsToMark = filteredItems.filter((i) =>
											checkedItems.has(i.ingredientId)
										)
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
							{(checkedItems.size > 0 || excludedItems.size > 0) && (
								<button className='btn btn-outline btn-sm' onClick={resetAll}>
									{t('shopping.resetAll')}
								</button>
							)}
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
