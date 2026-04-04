import './IngredientListContainer.scss'

import { useEffect, useState } from 'react'

import { CloseIcon } from '@/components/shared/icons'
import { Ingredient, ingredientService, UpdateIngredientData } from '@/services/ingredient'
import { useDialog } from '@/utils/dialog/DialogContext'

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
	const { confirm, toast } = useDialog()
	const [ingredients, setIngredients] = useState<Ingredient[]>([])
	const [loading, setLoading] = useState(true)
	const [showAddForm, setShowAddForm] = useState(false)
	const [searchTerm, setSearchTerm] = useState('')
	const [addMode, setAddMode] = useState<'single' | 'multiple'>('single')

	// Estado para modo simple (un ingrediente)
	const [newName, setNewName] = useState('')
	const [newUnit, setNewUnit] = useState<'g' | 'ml'>('g')
	const [newImageUrl, setNewImageUrl] = useState('')
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

	// Estado para modo múltiple
	const [bulkIngredients, setBulkIngredients] = useState<BulkIngredient[]>([
		{ id: `bulk-${Date.now()}`, name: '', unit: 'g' },
	])
	const [bulkCreating, setBulkCreating] = useState(false)

	useEffect(() => {
		loadIngredients()
	}, [])

	const loadIngredients = async () => {
		try {
			const data = await ingredientService.getAll()
			setIngredients(data)
		} catch (error) {
			console.error('Error loading ingredients:', error)
		} finally {
			setLoading(false)
		}
	}

	const getDefaultConversions = (unit: 'g' | 'ml'): NewConversion[] => {
		if (unit === 'g') {
			return [{ unitName: 'kg', gramsPerUnit: '1000' }]
		} else {
			return [{ unitName: 'L', gramsPerUnit: '1000' }]
		}
	}

	const handleUnitChange = (unit: 'g' | 'ml') => {
		setNewUnit(unit)
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

			await loadIngredients()
			resetForm()
			toast.success('Ingrediente creado correctamente')
		} catch (error) {
			toast.error('Error al crear ingrediente')
		}
	}

	const handleUpdate = async (id: number, data: UpdateIngredientData) => {
		try {
			await ingredientService.update(id, data)
			await loadIngredients()
		} catch (error) {
			toast.error('Error al actualizar ingrediente')
		}
	}

	const handleDelete = async (id: number) => {
		const confirmed = await confirm({
			title: 'Eliminar ingrediente',
			message: '¿Estás seguro de que quieres eliminar este ingrediente?',
			confirmText: 'Eliminar',
			type: 'danger',
		})
		if (!confirmed) return

		try {
			await ingredientService.delete(id)
			setIngredients(ingredients.filter((ing) => ing.id !== id))
			toast.success('Ingrediente eliminado')
		} catch (error) {
			toast.error('Error al eliminar ingrediente. Puede estar siendo usado en recetas.')
		}
	}

	const resetForm = () => {
		setNewName('')
		setNewUnit('g')
		setNewImageUrl('')
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
			toast.success(`${validIngredients.length} ingrediente(s) creado(s)`)
		} catch (error) {
			toast.error('Error al crear ingredientes')
		} finally {
			setBulkCreating(false)
		}
	}

	const filteredIngredients = ingredients.filter((ing) =>
		ing.name.toLowerCase().includes(searchTerm.toLowerCase())
	)

	if (loading) {
		return <div className='loading'>Cargando ingredientes...</div>
	}

	return (
		<div className='ingredient-list-container'>
			<div className='page-header'>
				<h1 className='page-title'>Ingredientes</h1>
				<button className='btn btn-primary' onClick={() => setShowAddForm(!showAddForm)}>
					{showAddForm ? 'Cancelar' : '+ Nuevo Ingrediente'}
				</button>
			</div>

			{showAddForm && (
				<div className='add-ingredient-form'>
					<div className='add-mode-toggle'>
						<button
							type='button'
							className={`mode-btn ${addMode === 'single' ? 'active' : ''}`}
							onClick={() => setAddMode('single')}>
							Un ingrediente
						</button>
						<button
							type='button'
							className={`mode-btn ${addMode === 'multiple' ? 'active' : ''}`}
							onClick={() => setAddMode('multiple')}>
							Varios ingredientes
						</button>
					</div>

					{addMode === 'single' ? (
						<form onSubmit={handleCreate}>
							<div className='form-row'>
								<input
									type='text'
									className='form-input'
									placeholder='Nombre del ingrediente'
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
									placeholder='URL de imagen (opcional)'
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

							<div className='variants-section'>
								<p className='form-hint'>Estados (valores nutricionales por 100{newUnit}):</p>

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
													title='Predeterminado'
												/>
												<input
													type='text'
													className='form-input variant-name-input'
													placeholder='Crudo, Cocinado, Frito...'
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
													placeholder='kcal'
													value={variant.calories}
													onChange={(e) => updateVariantRow(variant.id, 'calories', e.target.value)}
													min={0}
												/>
												<input
													type='number'
													className='form-input'
													placeholder='prot'
													value={variant.protein}
													onChange={(e) => updateVariantRow(variant.id, 'protein', e.target.value)}
													min={0}
													step={0.1}
												/>
												<input
													type='number'
													className='form-input'
													placeholder='carbs'
													value={variant.carbs}
													onChange={(e) => updateVariantRow(variant.id, 'carbs', e.target.value)}
													min={0}
													step={0.1}
												/>
												<input
													type='number'
													className='form-input'
													placeholder='grasa'
													value={variant.fat}
													onChange={(e) => updateVariantRow(variant.id, 'fat', e.target.value)}
													min={0}
													step={0.1}
												/>
												<input
													type='number'
													className='form-input'
													placeholder='fibra'
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
									+ Añadir otro estado
								</button>
							</div>

							<button type='button' className='conversions-toggle-btn' onClick={toggleConversions}>
								{showConversions ? '▼' : '▶'} Conversiones de unidades
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
										+ Añadir conversión
									</button>
								</div>
							)}

							<div className='form-actions'>
								<button type='button' className='btn btn-outline' onClick={resetForm}>
									Cancelar
								</button>
								<button type='submit' className='btn btn-primary'>
									Crear Ingrediente
								</button>
							</div>
						</form>
					) : (
						<form onSubmit={handleBulkCreate}>
							<p className='form-hint bulk-hint'>
								Añade varios ingredientes rápidamente. Los valores nutricionales se pueden editar
								después.
							</p>

							<div className='bulk-ingredients-list'>
								{bulkIngredients.map((ing, index) => (
									<div key={ing.id} className='bulk-ingredient-row'>
										<span className='bulk-row-number'>{index + 1}</span>
										<input
											type='text'
											className='form-input'
											placeholder='Nombre del ingrediente'
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
								+ Añadir otro ingrediente
							</button>

							<div className='form-actions'>
								<button type='button' className='btn btn-outline' onClick={resetForm}>
									Cancelar
								</button>
								<button
									type='submit'
									className='btn btn-primary'
									disabled={bulkCreating || !bulkIngredients.some((ing) => ing.name.trim())}>
									{bulkCreating
										? 'Creando...'
										: `Crear ${bulkIngredients.filter((ing) => ing.name.trim()).length} ingrediente(s)`}
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
					placeholder='Buscar ingrediente...'
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
				/>
			</div>

			<div className='ingredient-stats'>
				<span>{filteredIngredients.length} ingredientes</span>
				<span className='ingredient-stats-separator'>|</span>
				<span>
					{filteredIngredients.filter((i) => i.calories != null).length} con info nutricional
				</span>
			</div>

			{filteredIngredients.length === 0 ? (
				<div className='empty-state'>
					<p>No se encontraron ingredientes</p>
				</div>
			) : (
				<div className='ingredients-grid'>
					{filteredIngredients.map((ingredient) => (
						<IngredientCard
							key={ingredient.id}
							ingredient={ingredient}
							onUpdate={handleUpdate}
							onDelete={handleDelete}
							onConversionChange={loadIngredients}
						/>
					))}
				</div>
			)}
		</div>
	)
}
