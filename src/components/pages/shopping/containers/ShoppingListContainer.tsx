import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { api } from '@/services/api'
import { Ingredient, ingredientService } from '@/services/ingredient'
import { ingredientTagService } from '@/services/ingredientExtras'
import { ShoppingItem, shoppingService } from '@/services/shopping'
import { storeService, UserStore } from '@/services/store'
import { useDialog } from '@/utils/dialog/DialogContext'
import { normalizeText } from '@/utils/normalize'

import { ShoppingList } from '../components/ShoppingList'

const STORAGE_KEY_CHECKED = 'shopping_checked'
const STORAGE_KEY_EXCLUDED = 'shopping_excluded'
const STORAGE_KEY_QTY_OVERRIDES = 'shopping_qty_overrides'
const STORAGE_KEY_UNIT_OVERRIDES = 'shopping_unit_overrides'

type SortOption = 'nameAsc' | 'nameDesc' | 'qtyDesc' | 'qtyAsc' | 'tagAsc' | 'storeAsc'

function applyFiltersAndSort(
	items: ShoppingItem[],
	tagMap: Record<string, { id: number; name: string; color?: string | null }[]>,
	storeIngredientSets: Record<number, Set<number>>,
	stores: UserStore[],
	opts: {
		search?: string
		tagId?: number | null
		storeId?: number | null
		sort: SortOption
	}
): ShoppingItem[] {
	let result = items
	if (opts.search?.trim()) {
		const q = normalizeText(opts.search.trim())
		result = result.filter((i) => normalizeText(i.name).includes(q))
	}
	if (opts.tagId != null) {
		result = result.filter((i) =>
			(tagMap[String(i.ingredientId)] ?? []).some((tag) => tag.id === opts.tagId)
		)
	}
	if (opts.storeId != null) {
		const storeSet = storeIngredientSets[opts.storeId] ?? new Set()
		// Incluir: los de esa tienda + los que no están en ninguna tienda
		const allStoreIngredientIds = new Set(Object.values(storeIngredientSets).flatMap((s) => [...s]))
		result = result.filter(
			(i) => storeSet.has(i.ingredientId) || !allStoreIngredientIds.has(i.ingredientId)
		)
	}
	return [...result].sort((a, b) => {
		switch (opts.sort) {
			case 'nameDesc':
				return b.name.localeCompare(a.name, 'es')
			case 'qtyAsc':
				return a.quantityToBuy - b.quantityToBuy
			case 'qtyDesc':
				return b.quantityToBuy - a.quantityToBuy
			case 'tagAsc': {
				const tagA = (tagMap[String(a.ingredientId)] ?? [])[0]?.name ?? '\uFFFF'
				const tagB = (tagMap[String(b.ingredientId)] ?? [])[0]?.name ?? '\uFFFF'
				const cmp = tagA.localeCompare(tagB, 'es')
				return cmp !== 0 ? cmp : a.name.localeCompare(b.name, 'es')
			}
			case 'storeAsc': {
				const getStore = (ingId: number) => {
					for (const s of stores) {
						if (storeIngredientSets[s.id]?.has(ingId)) return s.name
					}
					return '\uFFFF'
				}
				const cmp = getStore(a.ingredientId).localeCompare(getStore(b.ingredientId), 'es')
				return cmp !== 0 ? cmp : a.name.localeCompare(b.name, 'es')
			}
			default:
				return a.name.localeCompare(b.name, 'es')
		}
	})
}

export function ShoppingListContainer() {
	const { t } = useTranslation()
	const { toast } = useDialog()
	const [allItems, setAllItems] = useState<ShoppingItem[]>([])
	const [excludedItems, setExcludedItems] = useState<Set<number>>(new Set())
	const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())
	const [loading, setLoading] = useState(true)
	const [showReview, setShowReview] = useState(false)

	// Tags y tiendas
	const [tagMap, setTagMap] = useState<
		Record<string, { id: number; name: string; color?: string | null }[]>
	>({})
	const [allTags, setAllTags] = useState<{ id: number; name: string; color?: string | null }[]>([])
	const [stores, setStores] = useState<UserStore[]>([])

	// Añadir producto manual
	const [showAddItem, setShowAddItem] = useState(false)
	const [allIngredients, setAllIngredients] = useState<Ingredient[]>([])
	const [addSearch, setAddSearch] = useState('')
	const [addSelectedIngredient, setAddSelectedIngredient] = useState<Ingredient | null>(null)
	const [addQty, setAddQty] = useState<number>(1)
	const [addUnit, setAddUnit] = useState<string>('g')

	// Overrides de cantidad manual
	const [quantityOverrides, setQuantityOverrides] = useState<Record<number, number>>({})
	// Overrides de unidad manual
	const [unitOverrides, setUnitOverrides] = useState<Record<number, string>>({})

	// Filtros del panel
	const [filterSearch, setFilterSearch] = useState('')
	const [filterTagId, setFilterTagId] = useState<number | null>(null)
	const [filterStoreId, setFilterStoreId] = useState<number | null>(null)
	const [sortBy, setSortBy] = useState<SortOption>('nameAsc')

	// Modal de exportar (con su propia config independiente)
	const [showExportModal, setShowExportModal] = useState(false)
	const [exportSort, setExportSort] = useState<SortOption>('nameAsc')
	const [exportTagId, setExportTagId] = useState<number | null>(null)
	const [exportStoreId, setExportStoreId] = useState<number | null>(null)
	const [exporting, setExporting] = useState(false)

	useEffect(() => {
		const savedExcluded = localStorage.getItem(STORAGE_KEY_EXCLUDED)
		const savedChecked = localStorage.getItem(STORAGE_KEY_CHECKED)
		const savedOverrides = localStorage.getItem(STORAGE_KEY_QTY_OVERRIDES)
		const savedUnitOverrides = localStorage.getItem(STORAGE_KEY_UNIT_OVERRIDES)
		if (savedExcluded) setExcludedItems(new Set(JSON.parse(savedExcluded)))
		if (savedChecked) setCheckedItems(new Set(JSON.parse(savedChecked)))
		if (savedOverrides) setQuantityOverrides(JSON.parse(savedOverrides))
		if (savedUnitOverrides) setUnitOverrides(JSON.parse(savedUnitOverrides))
		storeService
			.getAll()
			.then(setStores)
			.catch(() => {})
		ingredientTagService
			.getAll()
			.then((tags) => setAllTags(tags.sort((a, b) => a.name.localeCompare(b.name, 'es'))))
			.catch(() => {})
		loadShoppingList()
	}, [])

	const visibleItems = allItems.filter((item) => !excludedItems.has(item.ingredientId))

	// Sets de ingredientes por tienda (precalculados)
	const storeIngredientSets: Record<number, Set<number>> = {}
	for (const store of stores) {
		storeIngredientSets[store.id] = new Set((store.ingredients ?? []).map((si) => si.ingredientId))
	}

	// Items mostrados en el panel (con filtros del panel)
	const displayedItems = applyFiltersAndSort(visibleItems, tagMap, storeIngredientSets, stores, {
		search: filterSearch,
		tagId: filterTagId,
		storeId: filterStoreId,
		sort: sortBy,
	})

	// Items que se exportarán (con filtros del modal de exportar)
	const exportItems = applyFiltersAndSort(visibleItems, tagMap, storeIngredientSets, stores, {
		tagId: exportTagId,
		storeId: exportStoreId,
		sort: exportSort,
	})

	const loadShoppingList = async () => {
		setLoading(true)
		try {
			const data = await shoppingService.getShoppingList()
			setAllItems(data)
			if (data.length > 0) {
				ingredientTagService
					.getBulkTagAssignments(data.map((i) => i.ingredientId))
					.then(setTagMap)
					.catch(() => {})
			}
		} catch {
			console.error('Error al cargar la lista de la compra')
		} finally {
			setLoading(false)
		}
	}

	const handleToggle = (id: number) => {
		const newChecked = new Set(checkedItems)
		if (newChecked.has(id)) newChecked.delete(id)
		else newChecked.add(id)
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

	const handleQuantityOverride = (id: number, qty: number) => {
		const newOverrides = { ...quantityOverrides, [id]: qty }
		setQuantityOverrides(newOverrides)
		localStorage.setItem(STORAGE_KEY_QTY_OVERRIDES, JSON.stringify(newOverrides))
	}

	const handleUnitOverride = (id: number, unit: string, qty: number) => {
		const newUnitOverrides = { ...unitOverrides, [id]: unit }
		setUnitOverrides(newUnitOverrides)
		localStorage.setItem(STORAGE_KEY_UNIT_OVERRIDES, JSON.stringify(newUnitOverrides))
		const newQtyOverrides = { ...quantityOverrides, [id]: qty }
		setQuantityOverrides(newQtyOverrides)
		localStorage.setItem(STORAGE_KEY_QTY_OVERRIDES, JSON.stringify(newQtyOverrides))
	}

	const clearChecked = () => {
		setCheckedItems(new Set())
		localStorage.removeItem(STORAGE_KEY_CHECKED)
	}

	const resetAll = () => {
		setCheckedItems(new Set())
		setQuantityOverrides({})
		setUnitOverrides({})
		localStorage.removeItem(STORAGE_KEY_CHECKED)
		localStorage.removeItem(STORAGE_KEY_QTY_OVERRIDES)
		localStorage.removeItem(STORAGE_KEY_UNIT_OVERRIDES)
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
				{ ingredientId: addSelectedIngredient.id, quantity: addQty, unit: addUnit },
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

	// ── Export handlers ─────────────────────────────────────────────
	const handleExportClipboard = async () => {
		setExporting(true)
		try {
			const items = exportItems
			const noLabel = exportSort === 'storeAsc' ? t('shopping.noStore') : t('shopping.noCategory')

			// Agrupamos si el sort es por etiqueta o tienda, sino lista plana
			const shouldGroup = exportSort === 'tagAsc' || exportSort === 'storeAsc'
			if (!shouldGroup) {
				// Lista plana
				const lines = items.map((i) => {
					const qty =
						i.quantityToBuy % 1 === 0 ? String(i.quantityToBuy) : i.quantityToBuy.toFixed(1)
					return `- ${i.name}: ${qty} ${i.unit}`
				})
				await navigator.clipboard.writeText(
					`${t('shopping.title')} (${weekLabel})\n\n${lines.join('\n')}`
				)
			} else {
				// Agrupado por etiqueta o tienda
				const groups: Record<string, typeof items> = {}
				for (const item of items) {
					let groupName: string
					if (exportSort === 'storeAsc') {
						groupName =
							stores.find((s) => storeIngredientSets[s.id]?.has(item.ingredientId))?.name ?? noLabel
					} else {
						const tags = tagMap[String(item.ingredientId)] || []
						groupName = tags.length > 0 ? tags[0].name : noLabel
					}
					if (!groups[groupName]) groups[groupName] = []
					groups[groupName].push(item)
				}
				const lines: string[] = [`${t('shopping.title')} (${weekLabel})`, '']
				// Los sin etiqueta/tienda van al final
				const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
					if (a === noLabel) return 1
					if (b === noLabel) return -1
					return a.localeCompare(b, 'es')
				})
				for (const [group, groupItems] of sortedGroups) {
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
			setShowExportModal(false)
		} catch {
			toast.error(t('shopping.exportError'))
		} finally {
			setExporting(false)
		}
	}

	const handleExportPdf = async () => {
		setExporting(true)
		try {
			await shoppingService.downloadShoppingPdf(
				exportItems.map((i) => ({ name: i.name, quantityToBuy: i.quantityToBuy, unit: i.unit })),
				weekLabel
			)
			setShowExportModal(false)
		} catch {
			toast.error(t('shopping.exportError'))
		} finally {
			setExporting(false)
		}
	}

	const excludedItemsList = allItems.filter((item) => excludedItems.has(item.ingredientId))

	return (
		<>
			{/* ── Header ─────────────────────────────────────────── */}
			<div className='page-header'>
				<h1 className='page-title'>{t('shopping.title')}</h1>
				<div className='page-header-actions'>
					<button
						className='btn btn-outline'
						onClick={() => setShowExportModal(true)}
						disabled={visibleItems.length === 0}>
						{t('shopping.exportTitle')}
					</button>
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

			{/* ── Barra de filtros del panel ──────────────────────── */}
			<div className='shopping-filter-bar'>
				<input
					type='text'
					className='form-input'
					placeholder={t('shopping.filterPlaceholder')}
					value={filterSearch}
					onChange={(e) => setFilterSearch(e.target.value)}
				/>
				{allTags.length > 0 && (
					<select
						className='form-select'
						value={filterTagId ?? ''}
						onChange={(e) => setFilterTagId(e.target.value ? Number(e.target.value) : null)}>
						<option value=''>{t('shopping.filterAllTags')}</option>
						{allTags.map((tag) => (
							<option key={tag.id} value={tag.id}>
								{tag.name}
							</option>
						))}
					</select>
				)}
				{stores.length > 0 && (
					<select
						className='form-select'
						value={filterStoreId ?? ''}
						onChange={(e) => setFilterStoreId(e.target.value ? Number(e.target.value) : null)}>
						<option value=''>{t('shopping.filterAllStores')}</option>
						{stores.map((store) => (
							<option key={store.id} value={store.id}>
								{store.name}
							</option>
						))}
					</select>
				)}
				<select
					className='form-select'
					value={sortBy}
					onChange={(e) => setSortBy(e.target.value as SortOption)}>
					<option value='nameAsc'>{t('shopping.sortNameAsc')}</option>
					<option value='nameDesc'>{t('shopping.sortNameDesc')}</option>
					<option value='qtyDesc'>{t('shopping.sortQtyDesc')}</option>
					<option value='qtyAsc'>{t('shopping.sortQtyAsc')}</option>
					{allTags.length > 0 && <option value='tagAsc'>{t('shopping.sortTagAsc')}</option>}
					{stores.length > 0 && <option value='storeAsc'>{t('shopping.sortStoreAsc')}</option>}
				</select>
			</div>

			{/* ── Excluidos ──────────────────────────────────────── */}
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

			{/* ── Lista ──────────────────────────────────────────── */}
			{loading ? (
				<div className='loading'>{t('shopping.loading')}</div>
			) : (
				<>
					{(() => {
						// Cuando se ordena por tag o tienda, agrupamos visualmente
						if (sortBy === 'tagAsc' || sortBy === 'storeAsc') {
							const groups: { label: string; items: ShoppingItem[] }[] = []
							const seen = new Map<string, ShoppingItem[]>()
							const noLabel = sortBy === 'tagAsc' ? t('shopping.noCategory') : t('shopping.noStore')

							for (const item of displayedItems) {
								let label: string
								if (sortBy === 'tagAsc') {
									label = (tagMap[String(item.ingredientId)] ?? [])[0]?.name ?? noLabel
								} else {
									label =
										stores.find((s) => storeIngredientSets[s.id]?.has(item.ingredientId))?.name ??
										noLabel
								}
								if (!seen.has(label)) seen.set(label, [])
								seen.get(label)!.push(item)
							}
							// Ordenamos grupos: primero los nombrados, luego el "sin X"
							const sortedEntries = [...seen.entries()].sort(([a], [b]) => {
								if (a === noLabel) return 1
								if (b === noLabel) return -1
								return a.localeCompare(b, 'es')
							})
							for (const [label, items] of sortedEntries) {
								groups.push({ label, items })
							}

							return groups.map(({ label, items: groupItems }) => (
								<ShoppingList
									key={label}
									items={groupItems}
									checkedItems={checkedItems}
									onToggle={handleToggle}
									onExclude={handleExclude}
									sectionTitle={label}
									quantityOverrides={quantityOverrides}
									onQuantityOverride={handleQuantityOverride}
									unitOverrides={unitOverrides}
									onUnitOverride={handleUnitOverride}
								/>
							))
						}

						// Sin agrupación: lista normal
						return (
							<ShoppingList
								items={displayedItems}
								checkedItems={checkedItems}
								onToggle={handleToggle}
								onExclude={handleExclude}
								quantityOverrides={quantityOverrides}
								onQuantityOverride={handleQuantityOverride}
								unitOverrides={unitOverrides}
								onUnitOverride={handleUnitOverride}
							/>
						)
					})()}
					{checkedItems.size > 0 && (
						<div className='shopping-actions mt-2'>
							<button
								className='btn btn-primary btn-sm'
								onClick={async () => {
									const itemsToMark = displayedItems.filter((i) => checkedItems.has(i.ingredientId))
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
							<button className='btn btn-outline btn-sm' onClick={clearChecked}>
								{t('shopping.unmarkPurchased')}
							</button>
							<button className='btn btn-outline btn-sm' onClick={resetAll}>
								{t('shopping.resetAll')}
							</button>
						</div>
					)}
				</>
			)}

			{/* ── Modal Exportar ─────────────────────────────────── */}
			{showExportModal && (
				<div className='modal-overlay' onClick={() => setShowExportModal(false)}>
					<div className='modal-card shopping-export-modal' onClick={(e) => e.stopPropagation()}>
						<h3>{t('shopping.exportTitle')}</h3>

						<div className='export-modal-section'>
							<label className='form-label'>{t('shopping.exportSortLabel')}</label>
							<select
								className='form-select'
								value={exportSort}
								onChange={(e) => setExportSort(e.target.value as SortOption)}>
								<option value='nameAsc'>{t('shopping.sortNameAsc')}</option>
								<option value='nameDesc'>{t('shopping.sortNameDesc')}</option>
								<option value='qtyDesc'>{t('shopping.sortQtyDesc')}</option>
								<option value='qtyAsc'>{t('shopping.sortQtyAsc')}</option>
								{allTags.length > 0 && <option value='tagAsc'>{t('shopping.sortTagAsc')}</option>}
								{stores.length > 0 && (
									<option value='storeAsc'>{t('shopping.sortStoreAsc')}</option>
								)}
							</select>
						</div>

						{allTags.length > 0 && (
							<div className='export-modal-section'>
								<label className='form-label'>{t('shopping.exportFilterTagLabel')}</label>
								<select
									className='form-select'
									value={exportTagId ?? ''}
									onChange={(e) => setExportTagId(e.target.value ? Number(e.target.value) : null)}>
									<option value=''>{t('shopping.filterAllTags')}</option>
									{allTags.map((tag) => (
										<option key={tag.id} value={tag.id}>
											{tag.name}
										</option>
									))}
								</select>
							</div>
						)}

						{stores.length > 0 && (
							<div className='export-modal-section'>
								<label className='form-label'>{t('shopping.exportFilterStoreLabel')}</label>
								<select
									className='form-select'
									value={exportStoreId ?? ''}
									onChange={(e) =>
										setExportStoreId(e.target.value ? Number(e.target.value) : null)
									}>
									<option value=''>{t('shopping.filterAllStores')}</option>
									{stores.map((store) => (
										<option key={store.id} value={store.id}>
											{store.name}
										</option>
									))}
								</select>
							</div>
						)}

						<p className='text-secondary text-sm export-modal-count'>
							{t('shopping.exportItemCount', { count: exportItems.length })}
						</p>

						<div className='export-modal-actions'>
							<button className='btn btn-outline' onClick={() => setShowExportModal(false)}>
								{t('cancel')}
							</button>
							<button
								className='btn btn-outline'
								disabled={exporting || exportItems.length === 0}
								onClick={handleExportClipboard}>
								📋 {t('shopping.exportClipboard')}
							</button>
							<button
								className='btn btn-primary'
								disabled={exporting || exportItems.length === 0}
								onClick={handleExportPdf}>
								📄 {t('shopping.exportPdf')}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ── Modal Añadir ítem ──────────────────────────────── */}
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
