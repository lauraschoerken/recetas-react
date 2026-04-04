import './IngredientStatesPanel.scss'

import { useState } from 'react'

import { DeleteIcon, EditIcon, StarIcon } from '@/components/shared/icons'
import { api } from '@/services/api'

export interface IngredientVariant {
	id: number
	name: string
	isDefault: boolean
	calories?: number | null
	protein?: number | null
	carbs?: number | null
	fat?: number | null
	fiber?: number | null
	weightFactor: number
}

export interface IngredientStatesData {
	databaseId: number
	name: string
	baseUnit?: string
	variants: IngredientVariant[]
	selectedVariantId?: number | null
}

interface IngredientStatesPanelProps {
	data: IngredientStatesData
	onVariantsChange: (variants: IngredientVariant[], selectedVariantId?: number) => void
	onClose?: () => void
}

function capitalizeFirst(str: string): string {
	if (!str) return str
	return str.charAt(0).toUpperCase() + str.slice(1)
}

export function IngredientStatesPanel({
	data,
	onVariantsChange,
	onClose,
}: IngredientStatesPanelProps) {
	const [showNewVariant, setShowNewVariant] = useState(false)
	const [editingVariantId, setEditingVariantId] = useState<number | null>(null)
	const [editVariantData, setEditVariantData] = useState({
		name: '',
		calories: '',
		protein: '',
		carbs: '',
		fat: '',
		fiber: '',
		weightFactor: '',
	})
	const [newVariantName, setNewVariantName] = useState('')
	const [newVariantMacros, setNewVariantMacros] = useState({
		calories: '',
		protein: '',
		carbs: '',
		fat: '',
		fiber: '',
		weightFactor: '1',
	})

	const startEditVariant = (variant: IngredientVariant) => {
		setEditingVariantId(variant.id)
		setEditVariantData({
			name: variant.name,
			calories: variant.calories?.toString() || '',
			protein: variant.protein?.toString() || '',
			carbs: variant.carbs?.toString() || '',
			fat: variant.fat?.toString() || '',
			fiber: variant.fiber?.toString() || '',
			weightFactor: variant.weightFactor?.toString() || '1',
		})
	}

	const handleUpdateVariant = async (variantId: number) => {
		try {
			const updated = await api.put<IngredientVariant>(`/ingredients/variants/${variantId}`, {
				name: editVariantData.name,
				calories: editVariantData.calories ? parseFloat(editVariantData.calories) : null,
				protein: editVariantData.protein ? parseFloat(editVariantData.protein) : null,
				carbs: editVariantData.carbs ? parseFloat(editVariantData.carbs) : null,
				fat: editVariantData.fat ? parseFloat(editVariantData.fat) : null,
				fiber: editVariantData.fiber ? parseFloat(editVariantData.fiber) : null,
				weightFactor: editVariantData.weightFactor ? parseFloat(editVariantData.weightFactor) : 1,
			})

			const updatedVariants = data.variants.map((v) => (v.id === variantId ? updated : v))
			onVariantsChange(
				updatedVariants,
				data.selectedVariantId === variantId ? updated.id : data.selectedVariantId || undefined
			)

			setEditingVariantId(null)
			setEditVariantData({
				name: '',
				calories: '',
				protein: '',
				carbs: '',
				fat: '',
				fiber: '',
				weightFactor: '',
			})
		} catch (error) {
			console.error('Error updating variant:', error)
		}
	}

	const handleAddNewVariant = async () => {
		if (!newVariantName.trim()) return

		try {
			const newVariant = await api.post<IngredientVariant>(
				`/ingredients/${data.databaseId}/variants`,
				{
					name: newVariantName,
					isDefault: false,
					calories: newVariantMacros.calories ? parseFloat(newVariantMacros.calories) : null,
					protein: newVariantMacros.protein ? parseFloat(newVariantMacros.protein) : null,
					carbs: newVariantMacros.carbs ? parseFloat(newVariantMacros.carbs) : null,
					fat: newVariantMacros.fat ? parseFloat(newVariantMacros.fat) : null,
					fiber: newVariantMacros.fiber ? parseFloat(newVariantMacros.fiber) : null,
					weightFactor: newVariantMacros.weightFactor
						? parseFloat(newVariantMacros.weightFactor)
						: 1,
				}
			)

			onVariantsChange([...data.variants, newVariant], newVariant.id)

			setShowNewVariant(false)
			setNewVariantName('')
			setNewVariantMacros({
				calories: '',
				protein: '',
				carbs: '',
				fat: '',
				fiber: '',
				weightFactor: '1',
			})
		} catch (error) {
			console.error('Error adding variant:', error)
		}
	}

	const handleDeleteVariant = async (variantId: number) => {
		if (data.variants.length <= 1) return

		try {
			await api.delete(`/ingredients/variants/${variantId}`)

			const updatedVariants = data.variants.filter((v) => v.id !== variantId)
			const newSelected = updatedVariants.find((v) => v.isDefault) || updatedVariants[0]

			onVariantsChange(updatedVariants, newSelected?.id)
		} catch (error) {
			console.error('Error deleting variant:', error)
		}
	}

	const handleSetDefaultVariant = async (variantId: number) => {
		try {
			await api.put<IngredientVariant>(`/ingredients/variants/${variantId}`, { isDefault: true })

			const updatedVariants = data.variants.map((v) => ({
				...v,
				isDefault: v.id === variantId,
			}))

			onVariantsChange(updatedVariants, data.selectedVariantId || undefined)
		} catch (error) {
			console.error('Error setting default variant:', error)
		}
	}

	return (
		<div className='ingredient-states-panel'>
			<div className='states-panel-header'>
				<span>Estados de {capitalizeFirst(data.name)}</span>
				<button
					type='button'
					className='add-state-btn'
					onClick={() => setShowNewVariant(!showNewVariant)}>
					+ Estado
				</button>
			</div>

			<div className='states-list'>
				{data.variants.length > 0 ? (
					data.variants.map((variant) => (
						<div
							key={variant.id}
							className={`state-row ${variant.id === data.selectedVariantId ? 'is-selected' : ''}`}>
							{editingVariantId === variant.id ? (
								<div className='state-edit-form'>
									<input
										type='text'
										className='form-input state-name-edit'
										value={editVariantData.name}
										onChange={(e) =>
											setEditVariantData((prev) => ({
												...prev,
												name: capitalizeFirst(e.target.value),
											}))
										}
										placeholder='Nombre'
									/>
									<div className='state-macros-edit'>
										<div className='macro-input'>
											<input
												type='number'
												value={editVariantData.calories}
												onChange={(e) =>
													setEditVariantData((prev) => ({ ...prev, calories: e.target.value }))
												}
												placeholder='0'
												min={0}
												step={0.1}
											/>
											<span>kcal</span>
										</div>
										<div className='macro-input'>
											<input
												type='number'
												value={editVariantData.protein}
												onChange={(e) =>
													setEditVariantData((prev) => ({ ...prev, protein: e.target.value }))
												}
												placeholder='0'
												min={0}
												step={0.1}
											/>
											<span>prot</span>
										</div>
										<div className='macro-input'>
											<input
												type='number'
												value={editVariantData.carbs}
												onChange={(e) =>
													setEditVariantData((prev) => ({ ...prev, carbs: e.target.value }))
												}
												placeholder='0'
												min={0}
												step={0.1}
											/>
											<span>carbs</span>
										</div>
										<div className='macro-input'>
											<input
												type='number'
												value={editVariantData.fat}
												onChange={(e) =>
													setEditVariantData((prev) => ({ ...prev, fat: e.target.value }))
												}
												placeholder='0'
												min={0}
												step={0.1}
											/>
											<span>grasa</span>
										</div>
										<div className='macro-input'>
											<input
												type='number'
												value={editVariantData.fiber}
												onChange={(e) =>
													setEditVariantData((prev) => ({ ...prev, fiber: e.target.value }))
												}
												placeholder='0'
												min={0}
												step={0.1}
											/>
											<span>fibra</span>
										</div>
										<div className='macro-input weight-factor'>
											<input
												type='number'
												value={editVariantData.weightFactor}
												onChange={(e) =>
													setEditVariantData((prev) => ({ ...prev, weightFactor: e.target.value }))
												}
												placeholder='1'
												min={0.1}
												step={0.1}
											/>
											<span>×peso</span>
										</div>
									</div>
									<div className='state-edit-actions'>
										<button
											type='button'
											className='btn btn-primary btn-sm'
											onClick={() => handleUpdateVariant(variant.id)}>
											Guardar
										</button>
										<button
											type='button'
											className='btn btn-outline btn-sm'
											onClick={() => setEditingVariantId(null)}>
											Cancelar
										</button>
									</div>
								</div>
							) : (
								<>
									<div className='state-info'>
										<span className='state-name'>
											{variant.name}
											{variant.isDefault && <span className='default-badge'>Por defecto</span>}
											{variant.id === data.selectedVariantId && (
												<span className='selected-badge'>Seleccionado</span>
											)}
										</span>
										<span className='state-macros-summary'>
											{variant.calories || 0} kcal | {variant.protein || 0}g prot |{' '}
											{variant.carbs || 0}g carbs | {variant.fat || 0}g grasa
											{variant.weightFactor && variant.weightFactor !== 1 && (
												<span className='weight-factor-badge'> | ×{variant.weightFactor} peso</span>
											)}
										</span>
									</div>
									<div className='state-actions'>
										<button
											type='button'
											className='state-action-btn'
											onClick={() => startEditVariant(variant)}
											title='Editar'>
											<EditIcon size={14} aria-hidden='true' />
										</button>
										{!variant.isDefault && (
											<button
												type='button'
												className='state-action-btn'
												onClick={() => handleSetDefaultVariant(variant.id)}
												title='Marcar como por defecto'>
												<StarIcon size={14} aria-hidden='true' />
											</button>
										)}
										{data.variants.length > 1 && (
											<button
												type='button'
												className='state-action-btn delete'
												onClick={() => handleDeleteVariant(variant.id)}
												title='Eliminar'>
												<DeleteIcon size={14} aria-hidden='true' />
											</button>
										)}
									</div>
								</>
							)}
						</div>
					))
				) : (
					<p className='no-data'>Sin estados configurados</p>
				)}
			</div>

			{showNewVariant && (
				<div className='new-state-form'>
					<input
						type='text'
						className='form-input'
						value={newVariantName}
						onChange={(e) => setNewVariantName(capitalizeFirst(e.target.value))}
						placeholder='Nombre del estado (ej: Frito, Hervido...)'
					/>
					<div className='new-state-macros'>
						<div className='macro-input'>
							<input
								type='number'
								value={newVariantMacros.calories}
								onChange={(e) =>
									setNewVariantMacros((prev) => ({ ...prev, calories: e.target.value }))
								}
								placeholder='0'
								min={0}
								step={0.1}
							/>
							<span>kcal</span>
						</div>
						<div className='macro-input'>
							<input
								type='number'
								value={newVariantMacros.protein}
								onChange={(e) =>
									setNewVariantMacros((prev) => ({ ...prev, protein: e.target.value }))
								}
								placeholder='0'
								min={0}
								step={0.1}
							/>
							<span>prot</span>
						</div>
						<div className='macro-input'>
							<input
								type='number'
								value={newVariantMacros.carbs}
								onChange={(e) =>
									setNewVariantMacros((prev) => ({ ...prev, carbs: e.target.value }))
								}
								placeholder='0'
								min={0}
								step={0.1}
							/>
							<span>carbs</span>
						</div>
						<div className='macro-input'>
							<input
								type='number'
								value={newVariantMacros.fat}
								onChange={(e) => setNewVariantMacros((prev) => ({ ...prev, fat: e.target.value }))}
								placeholder='0'
								min={0}
								step={0.1}
							/>
							<span>grasa</span>
						</div>
						<div className='macro-input'>
							<input
								type='number'
								value={newVariantMacros.fiber}
								onChange={(e) =>
									setNewVariantMacros((prev) => ({ ...prev, fiber: e.target.value }))
								}
								placeholder='0'
								min={0}
								step={0.1}
							/>
							<span>fibra</span>
						</div>
						<div className='macro-input weight-factor'>
							<input
								type='number'
								value={newVariantMacros.weightFactor}
								onChange={(e) =>
									setNewVariantMacros((prev) => ({ ...prev, weightFactor: e.target.value }))
								}
								placeholder='1'
								min={0.1}
								step={0.1}
							/>
							<span>×peso</span>
						</div>
					</div>
					<button
						type='button'
						className='btn btn-primary btn-sm'
						onClick={handleAddNewVariant}
						disabled={!newVariantName.trim()}>
						Crear estado
					</button>
				</div>
			)}
		</div>
	)
}
