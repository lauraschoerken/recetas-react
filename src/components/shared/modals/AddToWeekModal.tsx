import './AddToWeekModal.scss'

import { useCallback, useEffect, useState } from 'react'

import { Modal } from '@/components/shared/modal'
import { Recipe, recipeService } from '@/services/recipe'
import { shoppingService, WeekPlanType } from '@/services/shopping'
import { useDialog } from '@/utils/dialog/DialogContext'

interface ComponentOption {
	id: number
	name: string
	isDefault: boolean
	recipeId?: number | null
	isRecipe: boolean
}

interface ComponentSelection {
	componentId: number
	componentName: string
	isOptional: boolean
	defaultEnabled: boolean
	enabled: boolean
	selectedOptionId: number | null
	options: ComponentOption[]
	parentRecipeId?: number
	parentRecipeName?: string
}

interface AddToWeekModalProps {
	recipe: Recipe | null
	isOpen: boolean
	onClose: () => void
	onSuccess?: () => void
}

export function AddToWeekModal({ recipe, isOpen, onClose, onSuccess }: AddToWeekModalProps) {
	const { toast } = useDialog()
	const [, setFullRecipe] = useState<Recipe | null>(null)
	const [plannedDate, setPlannedDate] = useState('')
	const [servings, setServings] = useState(4)
	const [planType, setPlanType] = useState<WeekPlanType>('meal')
	const [componentSelections, setComponentSelections] = useState<ComponentSelection[]>([])
	const [loadingRecipe, setLoadingRecipe] = useState(false)
	const [submitting, setSubmitting] = useState(false)

	const extractComponentSelections = useCallback(
		(data: Recipe, parentRecipeId?: number, parentRecipeName?: string): ComponentSelection[] => {
			if (!data.components || data.components.length === 0) return []

			return data.components.map((comp) => {
				const defaultOption = comp.options.find((o) => o.isDefault) || comp.options[0]
				return {
					componentId: comp.id,
					componentName: comp.name,
					isOptional: comp.isOptional,
					defaultEnabled: comp.defaultEnabled,
					enabled: !comp.isOptional || comp.defaultEnabled,
					selectedOptionId: defaultOption?.id || null,
					options: comp.options.map((o) => ({
						id: o.id,
						name: o.name || o.recipe?.title || o.ingredient?.name || 'Opción',
						isDefault: o.isDefault,
						recipeId: o.recipeId || o.recipe?.id,
						isRecipe: !!(o.recipeId || o.recipe),
					})),
					parentRecipeId,
					parentRecipeName,
				}
			})
		},
		[]
	)

	const loadSubRecipeComponents = useCallback(
		async (
			recipeId: number,
			recipeName: string,
			existingSelections: ComponentSelection[]
		): Promise<ComponentSelection[]> => {
			try {
				const subRecipe = await recipeService.getById(recipeId)
				const subSelections = extractComponentSelections(subRecipe, recipeId, recipeName)

				// Recursively load sub-sub-recipes
				let allSelections = [...existingSelections, ...subSelections]

				for (const sel of subSelections) {
					const selectedOpt = sel.options.find((o) => o.id === sel.selectedOptionId)
					if (selectedOpt?.recipeId && sel.enabled) {
						allSelections = await loadSubRecipeComponents(
							selectedOpt.recipeId,
							selectedOpt.name,
							allSelections
						)
					}
				}

				return allSelections
			} catch (err) {
				console.error('Error loading sub-recipe:', err)
				return existingSelections
			}
		},
		[extractComponentSelections]
	)

	useEffect(() => {
		if (isOpen && recipe) {
			setPlannedDate(new Date().toISOString().split('T')[0])
			setServings(recipe.servings)
			setPlanType('meal')
			setComponentSelections([])
			loadFullRecipe(recipe.id)
		}
	}, [isOpen, recipe])

	const loadFullRecipe = async (recipeId: number) => {
		setLoadingRecipe(true)
		try {
			const data = await recipeService.getById(recipeId)
			setFullRecipe(data)

			let selections = extractComponentSelections(data)

			// Load sub-recipe components for selected recipe options
			const loadedIds = new Set<number>()
			for (const sel of selections) {
				const selectedOpt = sel.options.find((o) => o.id === sel.selectedOptionId)
				if (selectedOpt?.recipeId && sel.enabled && !loadedIds.has(selectedOpt.recipeId)) {
					loadedIds.add(selectedOpt.recipeId)
					selections = await loadSubRecipeComponents(
						selectedOpt.recipeId,
						selectedOpt.name,
						selections
					)
				}
			}

			setComponentSelections(selections)
		} catch (err) {
			console.error('Error loading recipe details:', err)
		} finally {
			setLoadingRecipe(false)
		}
	}

	const updateComponentSelection = async (
		componentId: number,
		field: 'enabled' | 'selectedOptionId',
		value: boolean | number | null
	) => {
		// Find the component being updated
		const comp = componentSelections.find((cs) => cs.componentId === componentId)
		if (!comp) return

		// Remove sub-components of this component's previously selected recipe option
		const oldSelectedOpt = comp.options.find((o) => o.id === comp.selectedOptionId)
		let newSelections = componentSelections.map((cs) =>
			cs.componentId === componentId ? { ...cs, [field]: value } : cs
		)

		// If changing the selected option or disabling, remove child selections
		if (oldSelectedOpt?.recipeId) {
			const removeSubSelectionsOf = (recipeId: number) => {
				const toRemove = newSelections.filter((s) => s.parentRecipeId === recipeId)
				newSelections = newSelections.filter((s) => s.parentRecipeId !== recipeId)
				toRemove.forEach((s) => {
					const opt = s.options.find((o) => o.id === s.selectedOptionId)
					if (opt?.recipeId) removeSubSelectionsOf(opt.recipeId)
				})
			}
			removeSubSelectionsOf(oldSelectedOpt.recipeId)
		}

		setComponentSelections(newSelections)

		// If enabling or selecting a new recipe option, load its components
		const updatedComp = newSelections.find((cs) => cs.componentId === componentId)
		if (updatedComp?.enabled) {
			const newSelectedOpt = updatedComp.options.find((o) => o.id === updatedComp.selectedOptionId)
			if (newSelectedOpt?.recipeId) {
				setLoadingRecipe(true)
				const finalSelections = await loadSubRecipeComponents(
					newSelectedOpt.recipeId,
					newSelectedOpt.name,
					newSelections
				)
				setComponentSelections(finalSelections)
				setLoadingRecipe(false)
			}
		}
	}

	const handleSubmit = async () => {
		if (!recipe || !plannedDate) return

		setSubmitting(true)
		try {
			const selections = componentSelections
				.filter((cs) => cs.enabled && cs.selectedOptionId)
				.map((cs) => cs.selectedOptionId!)

			const result = await shoppingService.addToWeekPlan({
				recipeId: recipe.id,
				plannedDate,
				servings,
				type: planType,
				selections: selections.length > 0 ? selections : undefined,
			})

			onClose()

			if (result.autoPrepsCreated && result.autoPrepsCreated.length > 0) {
				const prepNames = result.autoPrepsCreated.map((p) => p.title).join(', ')
				toast.info(`Receta añadida. También se ha añadido a preparar: ${prepNames}`)
			} else {
				const typeLabel = planType === 'meal' ? 'comida' : 'preparación'
				toast.success(`Receta añadida como ${typeLabel} al plan semanal`)
			}

			onSuccess?.()
		} catch (error) {
			console.error('Error:', error)
			toast.error('Error al añadir al plan semanal')
		} finally {
			setSubmitting(false)
		}
	}

	if (!recipe) return null

	return (
		<Modal isOpen={isOpen} onClose={onClose} title='Añadir al plan semanal'>
			<div className='awm-root'>
				<p className='mb-2'>
					<strong>{recipe.title}</strong>
				</p>

				<div className='form-group'>
					<label className='form-label'>Fecha</label>
					<input
						type='date'
						className='form-input'
						value={plannedDate}
						onChange={(e) => setPlannedDate(e.target.value)}
					/>
				</div>

				<div className='form-group'>
					<label className='form-label'>Porciones</label>
					<input
						type='number'
						className='form-input'
						value={servings}
						onChange={(e) => setServings(parseInt(e.target.value) || 1)}
						min={1}
						style={{ width: '100px' }}
					/>
				</div>

				<div className='form-group'>
					<label className='form-label'>Tipo</label>
					<div className='plan-type-selector'>
						<button
							type='button'
							className={`plan-type-btn ${planType === 'meal' ? 'active' : ''}`}
							onClick={() => setPlanType('meal')}>
							Comida
						</button>
						<button
							type='button'
							className={`plan-type-btn ${planType === 'prep' ? 'active' : ''}`}
							onClick={() => setPlanType('prep')}>
							A preparar
						</button>
					</div>
					<small className='form-help'>
						{planType === 'meal'
							? 'Se descontara de casa cuando la consumas'
							: 'Al cocinarla, se guardaran las raciones en casa'}
					</small>
				</div>

				{componentSelections.length > 0 && (
					<div className='form-group' style={{ marginTop: '1rem' }}>
						<label className='form-label'>Variantes</label>
						<div className='awm-variants-list'>
							{(() => {
								// Agrupar por receta padre
								const mainComponents = componentSelections.filter((cs) => !cs.parentRecipeId)
								const subComponentsByParent = componentSelections.reduce(
									(acc, cs) => {
										if (cs.parentRecipeId) {
											if (!acc[cs.parentRecipeId]) acc[cs.parentRecipeId] = []
											acc[cs.parentRecipeId].push(cs)
										}
										return acc
									},
									{} as Record<number, ComponentSelection[]>
								)

								const renderSubComponent = (sc: ComponentSelection) => {
									const selectedOpt = sc.options.find((o) => o.id === sc.selectedOptionId)
									const subSubComps = selectedOpt?.recipeId
										? subComponentsByParent[selectedOpt.recipeId]
										: []
									const hasSubVariants = subSubComps && subSubComps.length > 0

									return (
										<div key={sc.componentId} className='awm-subcomponent'>
											<div
												className={`awm-comp-header ${sc.enabled && sc.options.length > 1 ? 'with-gap' : ''}`}>
												{sc.isOptional && (
													<input
														type='checkbox'
														checked={sc.enabled}
														onChange={(e) =>
															updateComponentSelection(sc.componentId, 'enabled', e.target.checked)
														}
														className='awm-checkbox'
													/>
												)}
												<span className='awm-comp-name small'>
													{sc.options.length === 1 && (
														<span className='awm-icon'>{selectedOpt?.isRecipe ? '📖' : '🥬'}</span>
													)}
													{sc.componentName}
												</span>
												{sc.isOptional && <span className='awm-badge xs'>opcional</span>}
											</div>
											{sc.enabled && sc.options.length > 1 && (
												<select
													value={sc.selectedOptionId || ''}
													onChange={(e) =>
														updateComponentSelection(
															sc.componentId,
															'selectedOptionId',
															parseInt(e.target.value)
														)
													}
													className='awm-select alt'>
													{sc.options.map((opt) => (
														<option key={opt.id} value={opt.id}>
															{opt.isRecipe ? '📖' : '🥬'} {opt.name}
														</option>
													))}
												</select>
											)}
											{/* Sub-sub-componentes recursivos */}
											{hasSubVariants && sc.enabled && (
												<div className='awm-subvariants'>
													<div className='awm-subvariant-header'>📖 {selectedOpt?.name}</div>
													{subSubComps.map((ssc) => renderSubComponent(ssc))}
												</div>
											)}
										</div>
									)
								}

								const renderComponent = (cs: ComponentSelection) => {
									const selectedOpt = cs.options.find((o) => o.id === cs.selectedOptionId)
									const subComps = selectedOpt?.recipeId
										? subComponentsByParent[selectedOpt.recipeId]
										: []
									const hasSubVariants = subComps && subComps.length > 0

									return (
										<div
											key={cs.componentId}
											className={`awm-component ${cs.enabled ? 'awm-enabled' : 'awm-disabled'}`}>
											<div
												className={`awm-comp-header ${cs.enabled && cs.options.length > 1 ? 'with-gap' : ''}`}>
												{cs.isOptional && (
													<input
														type='checkbox'
														checked={cs.enabled}
														onChange={(e) =>
															updateComponentSelection(cs.componentId, 'enabled', e.target.checked)
														}
														className='awm-checkbox'
													/>
												)}
												<span className='awm-comp-name'>
													{cs.options.length === 1 && (
														<span className='awm-icon'>{selectedOpt?.isRecipe ? '📖' : '🥬'}</span>
													)}
													{cs.componentName}
												</span>
												{cs.isOptional && <span className='awm-badge'>opcional</span>}
												{hasSubVariants && cs.enabled && (
													<span className='awm-badge awm-has-variants'>tiene variantes</span>
												)}
											</div>
											{cs.enabled && cs.options.length > 1 && (
												<select
													value={cs.selectedOptionId || ''}
													onChange={(e) =>
														updateComponentSelection(
															cs.componentId,
															'selectedOptionId',
															parseInt(e.target.value)
														)
													}
													className='awm-select'>
													{cs.options.map((opt) => (
														<option key={opt.id} value={opt.id}>
															{opt.isRecipe ? '📖' : '🥬'} {opt.name}
														</option>
													))}
												</select>
											)}
											{/* Sub-componentes dentro del mismo bloque */}
											{hasSubVariants && cs.enabled && (
												<div className='awm-subcomponent-block'>
													<div className='awm-subvariant-header'>📖 {selectedOpt?.name}</div>
													{subComps.map((sc) => renderSubComponent(sc))}
												</div>
											)}
										</div>
									)
								}

								return mainComponents.map((cs) => renderComponent(cs))
							})()}
						</div>
					</div>
				)}

				{loadingRecipe && (
					<div
						style={{
							padding: '0.5rem',
							textAlign: 'center',
							color: '#64748b',
							fontSize: '0.85rem',
						}}>
						Cargando variantes...
					</div>
				)}

				<div className='flex gap-1 mt-2'>
					<button className='btn btn-outline' onClick={onClose}>
						Cancelar
					</button>
					<button
						className='btn btn-primary'
						onClick={handleSubmit}
						disabled={loadingRecipe || submitting}>
						{submitting ? 'Añadiendo...' : 'Añadir'}
					</button>
				</div>
			</div>
		</Modal>
	)
}
