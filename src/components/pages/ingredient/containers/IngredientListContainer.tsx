import './IngredientListContainer.scss'

import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

import { CloseIcon } from '@/components/shared/icons'
import { Pagination } from '@/components/shared/pagination/Pagination'
import { alertService } from '@/services/alert'
import { Ingredient, ingredientService, UpdateIngredientData } from '@/services/ingredient'
import { shoppingService } from '@/services/shopping'
import { useDialog } from '@/utils/dialog/DialogContext'
import { getStoredPageSize } from '@/utils/pagination/usePagination'

import { IngredientCard } from '../components/IngredientCard'

const BASE_UNITS: ('g' | 'ml')[] = ['g', 'ml']

interface NewConversion {
	unitName: string
	gramsPerUnit: string
}

interface NewVariant {
	id: string
	name: string
	isDefault: boolean
	calories: string
	protein: string
	carbs: string
	fat: string
	fiber: string
}

interface BulkIngredient {
	id: string
	name: string
	unit: 'g' | 'ml'
}

export function IngredientListContainer() {
	const { t } = useTranslation()
	const { confirm, toast } = useDialog()
	const [ingredients, setIngredients] = useState<Ingredient[]>([])
	const [loading, setLoading] = useState(true)
	const [total, setTotal] = useState(0)
	const [searchParams, setSearchParams] = useSearchParams()
	const [pageSize] = useState(getStoredPageSize)
	const [showAddForm, setShowAddForm] = useState(false)
	const [addMode, setAddMode] = useState<'single' | 'multiple'>('single')

	const search = searchParams.get('q') || ''
	const currentPage = parseInt(searchParams.get('page') || '1', 10)

	// Estado para modo simple (un ingrediente)
	const [newName, setNewName] = useState('')
	const [newUnit, setNewUnit] = useState<'g' | 'ml'>('g')
	const [newImageUrl, setNewImageUrl] = useState('')
	const [newDefaultLocation, setNewDefaultLocation] = useState('')
	const [newVariants, setNewVariants] = useState<NewVariant[]>([
		{
			id: `var-${Date.now()}`,
			name: 'Crudo',
			isDefault: true,
			calories: '',
			protein: '',
			carbs: '',
			fat: '',
			fiber: '',
		},
	])
	const [newConversions, setNewConversions] = useState<NewConversion[]>([])
	const [showConversions, setShowConversions] = useState(false)
	const [newMinQuantity, setNewMinQuantity] = useState<string>('')
	const [newMinUnit, setNewMinUnit] = useState<string>('g')

	// Estado para modo múltiple
	const [bulkIngredients, setBulkIngredients] = useState<BulkIngredient[]>([
		{ id: `bulk-${Date.now()}`, name: '', unit: 'g' },
	])
	const [bulkCreating, setBulkCreating] = useState(false)

	// Estado para añadir al plan semanal
	const [weekPlanIngredient, setWeekPlanIngredient] = useState<Ingredient | null>(null)
	const [weekPlanQty, setWeekPlanQty] = useState<number>(100)
	const [weekPlanUnit, setWeekPlanUnit] = useState<string>('g')
	const [weekPlanDate, setWeekPlanDate] = useState<string>(
		() => new Date().toISOString().split('T')[0]
	)
	const [addingToWeekPlan, setAddingToWeekPlan] = useState(false)

	const loadIngredients = useCallback(async () => {
		setLoading(true)
		try {
			const result = await ingredientService.getAllPaginated({
				page: currentPage,
				pageSize,
				search,
			})
			setIngredients(result.data)
			setTotal(result.total)
		} catch (error) {
			console.error('Error loading ingredients:', error)
		} finally {
			setLoading(false)
		}
	}, [currentPage, pageSize, search])

	useEffect(() => {
		loadIngredients()
	}, [loadIngredients])

	const getDefaultConversions = (unit: 'g' | 'ml'): NewConversion[] => {
		if (unit === 'g') {
			return [{ unitName: 'kg', gramsPerUnit: '1000' }]
		} else {
			return [{ unitName: 'L', gramsPerUnit: '1000' }]
		}
	}

	const handleUnitChange = (unit: 'g' | 'ml') => {
		setNewUnit(unit)
		setNewMinUnit(unit)
		if (showConversions) {
			setNewConversions(getDefaultConversions(unit))
		}
	}

	const toggleConversions = () => {
		if (!showConversions) {
			setNewConversions(getDefaultConversions(newUnit))
		}
		setShowConversions(!showConversions)
	}

	const addConversionRow = () => {
		setNewConversions([...newConversions, { unitName: '', gramsPerUnit: '' }])
	}

	const removeConversionRow = (index: number) => {
		setNewConversions(newConversions.filter((_, i) => i !== index))
	}

	const updateConversionRow = (index: number, field: keyof NewConversion, value: string) => {
		const updated = [...newConversions]
		updated[index][field] = value
		setNewConversions(updated)
	}

	const addVariantRow = () => {
		setNewVariants([
			...newVariants,
			{
				id: `var-${Date.now()}`,
				name: '',
				isDefault: false,
				calories: '',
				protein: '',
				carbs: '',
				fat: '',
				fiber: '',
			},
		])
	}

	const removeVariantRow = (id: string) => {
		if (newVariants.length <= 1) return
		const remaining = newVariants.filter((v) => v.id !== id)
		// Si eliminamos el default, hacer default al primero
		if (!remaining.some((v) => v.isDefault) && remaining.length > 0) {
			remaining[0].isDefault = true
		}
		setNewVariants(remaining)
	}

	const updateVariantRow = (id: string, field: keyof NewVariant, value: string | boolean) => {
		setNewVariants(
			newVariants.map((v) => {
				if (v.id === id) {
					if (field === 'isDefault' && value === true) {
						return { ...v, isDefault: true }
					}
					return { ...v, [field]: value }
				}
				// Si cambiamos a default, quitar default de los demás
				if (field === 'isDefault' && value === true) {
					return { ...v, isDefault: false }
				}
				return v
			})
		)
	}

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!newName.trim()) return

		// Filtrar variantes válidas (con nombre)
		const validVariants = newVariants
			.filter((v) => v.name.trim())
			.map((v) => ({
				name: v.name.trim(),
				isDefault: v.isDefault,
				calories: v.calories ? Number(v.calories) : undefined,
				protein: v.protein ? Number(v.protein) : undefined,
				carbs: v.carbs ? Number(v.carbs) : undefined,
				fat: v.fat ? Number(v.fat) : undefined,
				fiber: v.fiber ? Number(v.fiber) : undefined,
			}))

		// Si no hay variantes válidas, crear una por defecto
		if (validVariants.length === 0) {
			validVariants.push({
				name: 'Crudo',
				isDefault: true,
				calories: undefined,
				protein: undefined,
				carbs: undefined,
				fat: undefined,
				fiber: undefined,
			})
		}

		// Asegurar que al menos una es default
		if (!validVariants.some((v) => v.isDefault)) {
			validVariants[0].isDefault = true
		}

		try {
			const created = await ingredientService.create({
				name: newName.charAt(0).toUpperCase() + newName.slice(1),
				unit: newUnit,
				imageUrl: newImageUrl || undefined,
				defaultLocation: newDefaultLocation || undefined,
				variants: validVariants,
			})

			// Crear conversión por defecto (kg o L)
			const defaultConversion =
				newUnit === 'g'
					? { unitName: 'kg', gramsPerUnit: 1000 }
					: { unitName: 'L', gramsPerUnit: 1000 }

			await ingredientService.addConversion(created.id, defaultConversion)

			// Crear las conversiones adicionales del usuario
			const validConversions = newConversions.filter(
				(c) =>
					c.unitName.trim() &&
					c.gramsPerUnit &&
					c.unitName.trim().toLowerCase() !== defaultConversion.unitName.toLowerCase()
			)
			for (const conv of validConversions) {
				await ingredientService.addConversion(created.id, {
					unitName: conv.unitName.trim(),
					gramsPerUnit: Number(conv.gramsPerUnit),
				})
			}

			// Crear umbral mínimo si se proporcionó
			if (newMinQuantity && Number(newMinQuantity) > 0) {
				await alertService.setIngredientThreshold({
					ingredientId: created.id,
					minQuantity: Number(newMinQuantity),
					unit: newMinUnit,
				})
			}

			await loadIngredients()
			resetForm()
			toast.success(t('ingredients.created'))
		} catch (error) {
			toast.error(t('ingredients.createError'))
		}
	}

	const handleUpdate = async (id: number, data: UpdateIngredientData) => {
		try {
			await ingredientService.update(id, data)
			await loadIngredients()
			toast.success(t('ingredients.updated'))
		} catch (error) {
			toast.error(t('ingredients.updateError'))
		}
	}

	const handleDelete = async (id: number) => {
		const confirmed = await confirm({
			title: t('ingredients.deleteTitle'),
			message: t('ingredients.deleteConfirm'),
			confirmText: t('delete'),
			type: 'danger',
		})
		if (!confirmed) return

		try {
			await ingredientService.delete(id)
			setIngredients((prev) => prev.filter((ing) => ing.id !== id))
			setTotal((prev) => prev - 1)
			toast.success(t('ingredients.deleted'))
		} catch (error) {
			toast.error(t('ingredients.deleteError'))
		}
	}

	const handleAddToShopping = async (ingredient: Ingredient) => {
		try {
			await shoppingService.addManualItems([
				{
					ingredientId: ingredient.id,
					quantity: 1,
					unit: ingredient.unit,
				},
			])
			toast.success(t('ingredients.addedToShopping'))
		} catch {
			toast.error(t('ingredients.addToShoppingError'))
		}
	}

	const handleOpenAddToWeekPlan = (ingredient: Ingredient) => {
		setWeekPlanIngredient(ingredient)
		setWeekPlanQty(100)
		setWeekPlanUnit(ingredient.unit)
		setWeekPlanDate(new Date().toISOString().split('T')[0])
	}

	const handleAddToWeekPlan = async () => {
		if (!weekPlanIngredient || weekPlanQty <= 0) return
		setAddingToWeekPlan(true)
		try {
			await shoppingService.addToWeekPlan({
				ingredientId: weekPlanIngredient.id,
				ingredientQty: weekPlanQty,
				ingredientUnit: weekPlanUnit,
				plannedDate: weekPlanDate,
			})
			toast.success(t('ingredients.addedToWeekPlan'))
			setWeekPlanIngredient(null)
		} catch {
			toast.error(t('ingredients.addToWeekPlanError'))
		} finally {
			setAddingToWeekPlan(false)
		}
	}

	const resetForm = () => {
		setNewName('')
		setNewUnit('g')
		setNewImageUrl('')
		setNewDefaultLocation('')
		setNewVariants([
			{
				id: `var-${Date.now()}`,
				name: 'Crudo',
				isDefault: true,
				calories: '',
				protein: '',
				carbs: '',
				fat: '',
				fiber: '',
			},
		])
		setNewConversions([])
		setShowConversions(false)
		setNewMinQuantity('')
		setNewMinUnit('g')
		setShowAddForm(false)
		setAddMode('single')
		setBulkIngredients([{ id: `bulk-${Date.now()}`, name: '', unit: 'g' }])
	}

	// Funciones para modo múltiple
	const addBulkRow = () => {
		setBulkIngredients([...bulkIngredients, { id: `bulk-${Date.now()}`, name: '', unit: 'g' }])
	}

	const removeBulkRow = (id: string) => {
		if (bulkIngredients.length > 1) {
			setBulkIngredients(bulkIngredients.filter((ing) => ing.id !== id))
		}
	}

	const updateBulkName = (id: string, value: string) => {
		setBulkIngredients(
			bulkIngredients.map((ing) => (ing.id === id ? { ...ing, name: value } : ing))
		)
	}

	const updateBulkUnit = (id: string, value: 'g' | 'ml') => {
		setBulkIngredients(
			bulkIngredients.map((ing) => (ing.id === id ? { ...ing, unit: value } : ing))
		)
	}

	const handleBulkKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
		if (e.key === 'Enter') {
			e.preventDefault()
			if (index === bulkIngredients.length - 1) {
				addBulkRow()
			} else {
				const nextInput = document.querySelector<HTMLInputElement>(
					`.bulk-ingredient-row:nth-child(${index + 2}) input[type="text"]`
				)
				nextInput?.focus()
			}
		}
	}

	const handleBulkCreate = async (e: React.FormEvent) => {
		e.preventDefault()

		const validIngredients = bulkIngredients
			.filter((ing) => ing.name.trim())
			.map((ing) => ({
				name: ing.name.charAt(0).toUpperCase() + ing.name.slice(1),
				unit: ing.unit,
			}))

		if (validIngredients.length === 0) return

		setBulkCreating(true)

		try {
			await ingredientService.createBulk(validIngredients)
			await loadIngredients()
			resetForm()
			toast.success(`${validIngredients.length} ${t('ingredients.bulkCreated')}`)
		} catch (error) {
			toast.error(t('ingredients.bulkCreateError'))
		} finally {
			setBulkCreating(false)
		}
	}

	const visibleIngredients = ingredients

	const handleSearchChange = (value: string) => {
		setSearchParams(
			(prev) => {
				const p = new URLSearchParams(prev)
				p.set('q', value)
				p.set('page', '1')
				return p
			},
			{ replace: true }
		)
	}

	if (loading) {
		return <div className='loading'>{t('ingredients.loading')}</div>
	}

	return (
		<div className='ingredient-list-container'>
			<div className='page-header'>
				<h1 className='page-title'>{t('ingredients.title')}</h1>
				<button className='btn btn-primary' onClick={() => setShowAddForm(!showAddForm)}>
					{showAddForm ? t('ingredients.cancelBtn') : t('ingredients.new')}
				</button>
			</div>

			{showAddForm && (
				<div className='add-ingredient-form'>
					<div className='add-mode-toggle'>
						<button
							type='button'
							className={`mode-btn ${addMode === 'single' ? 'active' : ''}`}
							onClick={() => setAddMode('single')}>
							{t('ingredients.single')}
						</button>
						<button
							type='button'
							className={`mode-btn ${addMode === 'multiple' ? 'active' : ''}`}
							onClick={() => setAddMode('multiple')}>
							{t('ingredients.multiple')}
						</button>
					</div>

					{addMode === 'single' ? (
						<form onSubmit={handleCreate}>
							<div className='form-row'>
								<input
									type='text'
									className='form-input'
									placeholder={t('ingredients.namePlaceholder')}
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
									required
								/>
								<select
									className='form-input unit-select'
									value={newUnit}
									onChange={(e) => handleUnitChange(e.target.value as 'g' | 'ml')}>
									{BASE_UNITS.map((u) => (
										<option key={u} value={u}>
											{u}
										</option>
									))}
								</select>
							</div>

							<div className='form-row image-row'>
								<input
									type='url'
									className='form-input'
									placeholder={t('ingredients.imageUrlPlaceholder')}
									value={newImageUrl}
									onChange={(e) => setNewImageUrl(e.target.value)}
								/>
								{newImageUrl && (
									<div className='image-preview-small'>
										<img
											src={newImageUrl}
											alt='Preview'
											onError={(e) => (e.currentTarget.style.display = 'none')}
										/>
									</div>
								)}
							</div>
							<div className='form-row'>
								<select
									className='form-input'
									value={newDefaultLocation}
									onChange={(e) => setNewDefaultLocation(e.target.value)}>
									<option value=''>{t('ingredients.defaultLocationOption')}</option>
									<option value='nevera'>{t('homePage.fridge')}</option>
									<option value='congelador'>{t('homePage.freezer')}</option>
									<option value='despensa'>{t('homePage.pantry')}</option>
								</select>
							</div>
							<div className='form-row threshold-row'>
								<label className='form-label'>{t('ingredients.minQuantity')}</label>
								<div className='form-row-inline'>
									<input
										type='number'
										className='form-input'
										placeholder={t('ingredients.quantityPlaceholder')}
										value={newMinQuantity}
										onChange={(e) => setNewMinQuantity(e.target.value)}
										min={0}
										step={1}
									/>
									<span className='form-unit'>{newUnit}</span>
								</div>
								<p className='form-hint'>{t('ingredients.minQuantityHint')}</p>
							</div>
							<div className='variants-section'>
								<p className='form-hint'>{t('ingredients.statesHint', { unit: newUnit })}</p>

								<div className='variants-list-create'>
									{newVariants.map((variant) => (
										<div
											key={variant.id}
											className={`variant-create-row ${variant.isDefault ? 'is-default' : ''}`}>
											<div className='variant-create-header'>
												<input
													type='radio'
													name='defaultVariant'
													checked={variant.isDefault}
													onChange={() => updateVariantRow(variant.id, 'isDefault', true)}
													title={t('default')}
												/>
												<input
													type='text'
													className='form-input variant-name-input'
													placeholder={t('ingredients.variantsPlaceholder')}
													value={variant.name}
													onChange={(e) => updateVariantRow(variant.id, 'name', e.target.value)}
												/>
												{newVariants.length > 1 && (
													<button
														type='button'
														className='btn-icon-small'
														onClick={() => removeVariantRow(variant.id)}>
														<CloseIcon size={14} aria-hidden='true' />
													</button>
												)}
											</div>
											<div className='variant-create-macros'>
												<input
													type='number'
													className='form-input'
													placeholder={t('weekPlan.kcal')}
													value={variant.calories}
													onChange={(e) => updateVariantRow(variant.id, 'calories', e.target.value)}
													min={0}
												/>
												<input
													type='number'
													className='form-input'
													placeholder={t('weekPlan.prot')}
													value={variant.protein}
													onChange={(e) => updateVariantRow(variant.id, 'protein', e.target.value)}
													min={0}
													step={0.1}
												/>
												<input
													type='number'
													className='form-input'
													placeholder={t('weekPlan.carbsShort')}
													value={variant.carbs}
													onChange={(e) => updateVariantRow(variant.id, 'carbs', e.target.value)}
													min={0}
													step={0.1}
												/>
												<input
													type='number'
													className='form-input'
													placeholder={t('weekPlan.fatShort')}
													value={variant.fat}
													onChange={(e) => updateVariantRow(variant.id, 'fat', e.target.value)}
													min={0}
													step={0.1}
												/>
												<input
													type='number'
													className='form-input'
													placeholder={t('fiber')}
													value={variant.fiber}
													onChange={(e) => updateVariantRow(variant.id, 'fiber', e.target.value)}
													min={0}
													step={0.1}
												/>
											</div>
										</div>
									))}
								</div>

								<button
									type='button'
									className='btn btn-outline btn-sm add-variant-create-btn'
									onClick={addVariantRow}>
									{t('ingredients.addAnother')}
								</button>
							</div>

							<button type='button' className='conversions-toggle-btn' onClick={toggleConversions}>
								{showConversions ? '▼' : '▶'} {t('recipes.unitConversions')}
							</button>

							{showConversions && (
								<div className='conversions-section'>
									<p className='form-hint'>
										Define equivalencias (ej: 1 {newUnit === 'g' ? 'kg' : 'L'} ={' '}
										{newUnit === 'g' ? '1000g' : '1000ml'})
									</p>

									{newConversions.map((conv, index) => (
										<div key={index} className='conversion-row'>
											<span className='conversion-prefix'>1</span>
											<input
												type='text'
												className='form-input conversion-name-input'
												placeholder={
													newUnit === 'g' ? 'kg, unidad, cucharada...' : 'L, vaso, taza...'
												}
												value={conv.unitName}
												onChange={(e) => updateConversionRow(index, 'unitName', e.target.value)}
											/>
											<span className='conversion-equals'>=</span>
											<input
												type='number'
												className='form-input conversion-value-input'
												placeholder='1000'
												value={conv.gramsPerUnit}
												onChange={(e) => updateConversionRow(index, 'gramsPerUnit', e.target.value)}
												min={0}
												step={0.1}
											/>
											<span className='conversion-suffix'>{newUnit}</span>
											<button
												type='button'
												className='btn-icon-small'
												onClick={() => removeConversionRow(index)}>
												<CloseIcon size={14} aria-hidden='true' />
											</button>
										</div>
									))}

									<button
										type='button'
										className='btn btn-outline btn-sm add-conversion-btn'
										onClick={addConversionRow}>
										{t('ingredients.addConversion')}
									</button>
								</div>
							)}

							<div className='form-actions'>
								<button type='button' className='btn btn-outline' onClick={resetForm}>
									{t('cancel')}
								</button>
								<button type='submit' className='btn btn-primary'>
									{t('ingredients.createBtn')}
								</button>
							</div>
						</form>
					) : (
						<form onSubmit={handleBulkCreate}>
							<p className='form-hint bulk-hint'>{t('ingredients.bulkHint')}</p>

							<div className='bulk-ingredients-list'>
								{bulkIngredients.map((ing, index) => (
									<div key={ing.id} className='bulk-ingredient-row'>
										<span className='bulk-row-number'>{index + 1}</span>
										<input
											type='text'
											className='form-input'
											placeholder={t('ingredients.namePlaceholder')}
											value={ing.name}
											onChange={(e) => updateBulkName(ing.id, e.target.value)}
											onKeyDown={(e) => handleBulkKeyDown(e, index)}
											autoFocus={index === bulkIngredients.length - 1}
										/>
										<select
											className='form-input unit-select'
											value={ing.unit}
											onChange={(e) => updateBulkUnit(ing.id, e.target.value as 'g' | 'ml')}>
											{BASE_UNITS.map((u) => (
												<option key={u} value={u}>
													{u}
												</option>
											))}
										</select>
										<button
											type='button'
											className='btn-icon-small'
											onClick={() => removeBulkRow(ing.id)}
											disabled={bulkIngredients.length === 1}>
											<CloseIcon size={14} aria-hidden='true' />
										</button>
									</div>
								))}
							</div>

							<button
								type='button'
								className='btn btn-outline btn-sm add-bulk-row-btn'
								onClick={addBulkRow}>
								{t('ingredients.addAnother')}
							</button>

							<div className='form-actions'>
								<button type='button' className='btn btn-outline' onClick={resetForm}>
									{t('cancel')}
								</button>
								<button
									type='submit'
									className='btn btn-primary'
									disabled={bulkCreating || !bulkIngredients.some((ing) => ing.name.trim())}>
									{bulkCreating
										? t('loading')
										: t('ingredients.createCount', {
												count: bulkIngredients.filter((ing) => ing.name.trim()).length,
											})}
								</button>
							</div>
						</form>
					)}
				</div>
			)}

			<div className='search-bar'>
				<input
					type='text'
					className='form-input search-input'
					placeholder={t('ingredients.searchPlaceholder')}
					value={search}
					onChange={(e) => handleSearchChange(e.target.value)}
				/>
			</div>

			<div className='ingredient-stats'>
				<span>{t('ingredients.count', { count: total })}</span>
				<span className='ingredient-stats-separator'>|</span>
				<span>
					{t('ingredients.withNutrition', {
						count: ingredients.filter((i) => i.calories != null).length,
					})}
				</span>
			</div>

			{total === 0 ? (
				<div className='empty-state'>
					<p>{t('ingredients.noResults')}</p>
				</div>
			) : (
				<>
					<div className='ingredients-grid'>
						{visibleIngredients.map((ingredient) => (
							<IngredientCard
								key={ingredient.id}
								ingredient={ingredient}
								onUpdate={handleUpdate}
								onDelete={handleDelete}
								onConversionChange={loadIngredients}
								onAddToShopping={handleAddToShopping}
								onAddToWeekPlan={handleOpenAddToWeekPlan}
							/>
						))}
					</div>
					<Pagination
						currentPage={currentPage}
						total={total}
						pageSize={pageSize}
						onPageChange={(p) =>
							setSearchParams(
								(prev) => {
									const n = new URLSearchParams(prev)
									n.set('page', String(p))
									return n
								},
								{ replace: true }
							)
						}
					/>
				</>
			)}

			{weekPlanIngredient && (
				<div className='modal-overlay' onClick={() => setWeekPlanIngredient(null)}>
					<div className='modal-card' onClick={(e) => e.stopPropagation()}>
						<h3>{t('ingredients.addToWeekPlanTitle', { name: weekPlanIngredient.name })}</h3>

						<div className='form-group'>
							<label>{t('weekPlan.dateLabel')}</label>
							<input
								type='date'
								value={weekPlanDate}
								onChange={(e) => setWeekPlanDate(e.target.value)}
							/>
						</div>

						<div className='form-row'>
							<div className='form-group'>
								<label>{t('ingredients.quantityPlaceholder')}</label>
								<input
									type='number'
									min='0'
									step='any'
									value={weekPlanQty}
									onChange={(e) => setWeekPlanQty(parseFloat(e.target.value) || 0)}
								/>
							</div>
							<div className='form-group'>
								<label>{t('ingredients.unitHeader')}</label>
								<select value={weekPlanUnit} onChange={(e) => setWeekPlanUnit(e.target.value)}>
									<option value={weekPlanIngredient.unit}>{weekPlanIngredient.unit}</option>
									{weekPlanIngredient.unit === 'g' && <option value='kg'>kg</option>}
									{weekPlanIngredient.unit === 'ml' && <option value='l'>l</option>}
									{(weekPlanIngredient.conversions || []).map((c) => (
										<option key={c.id} value={c.unitName}>
											{c.unitName}
										</option>
									))}
								</select>
							</div>
						</div>

						<div className='modal-actions'>
							<button className='btn btn-outline' onClick={() => setWeekPlanIngredient(null)}>
								{t('cancel')}
							</button>
							<button
								className='btn btn-primary'
								disabled={weekPlanQty <= 0 || addingToWeekPlan}
								onClick={handleAddToWeekPlan}>
								{addingToWeekPlan ? t('weekPlan.adding') : t('weekPlan.addBtn')}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
