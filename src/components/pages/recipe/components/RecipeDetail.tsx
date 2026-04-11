import './RecipeDetail.scss'

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Recipe } from '@/services/recipe'
import { pdfService } from '@/services/pdf'
import { alertService } from '@/services/alert'
import { shoppingService } from '@/services/shopping'
import { useDialog } from '@/utils/dialog/DialogContext'

interface RecipeDetailProps {
	recipe: Recipe
	onDelete: () => void
	onAddToWeek: () => void
}

export function RecipeDetail({ recipe, onDelete, onAddToWeek }: RecipeDetailProps) {
	const { t } = useTranslation()
	const { toast } = useDialog()
	const [minServings, setMinServings] = useState('')
	const [hasThreshold, setHasThreshold] = useState(false)
	const [showPdfOptions, setShowPdfOptions] = useState(false)
	const [pdfComponentSelections, setPdfComponentSelections] = useState<Record<number, number>>({})

	useEffect(() => {
		alertService
			.getRecipeThresholds()
			.then((thresholds) => {
				const match = thresholds.find((t) => t.recipeId === recipe.id)
				if (match) {
					setMinServings(match.minServings.toString())
					setHasThreshold(true)
				} else {
					setMinServings('')
					setHasThreshold(false)
				}
			})
			.catch(() => {})

		// Initialize PDF component selections with defaults
		if (recipe.components) {
			const defaults: Record<number, number> = {}
			for (const comp of recipe.components) {
				const defaultOpt = comp.options.find((o) => o.isDefault) || comp.options[0]
				if (defaultOpt) defaults[comp.id] = defaultOpt.id
			}
			setPdfComponentSelections(defaults)
		}
	}, [recipe.id])

	const handleSaveThreshold = async () => {
		const min = Number(minServings)
		if (!min || min <= 0) return
		try {
			await alertService.setRecipeThreshold({ recipeId: recipe.id, minServings: min })
			setHasThreshold(true)
		} catch (error) {
			console.error('Error saving threshold:', error)
		}
	}

	const handleDeleteThreshold = async () => {
		try {
			await alertService.deleteRecipeThreshold(recipe.id)
			setMinServings('')
			setHasThreshold(false)
		} catch (error) {
			console.error('Error deleting threshold:', error)
		}
	}

	const hasComponents = recipe.components && recipe.components.length > 0
	const hasIngredients = recipe.ingredients && recipe.ingredients.length > 0
	const hasNutrition =
		recipe.nutritionPerServing &&
		(recipe.nutritionPerServing.calories > 0 ||
			recipe.nutritionPerServing.protein > 0 ||
			recipe.nutritionPerServing.carbs > 0 ||
			recipe.nutritionPerServing.fat > 0)

	const handleExportPdf = async () => {
		if (hasComponents) {
			setShowPdfOptions(true)
			return
		}
		try {
			await pdfService.downloadRecipePdf(recipe.id, {
				showAuthor: localStorage.getItem('pdfShowAuthor') === 'true',
				showVisibility: localStorage.getItem('pdfShowVisibility') === 'true',
			})
			toast.success(t('recipes.pdfDownloaded'))
		} catch {
			toast.error(t('recipes.pdfError'))
		}
	}

	const handleDownloadPdf = async () => {
		try {
			const pdfOptions = {
				selectedOptions: pdfComponentSelections,
				showAuthor: localStorage.getItem('pdfShowAuthor') === 'true',
				showVisibility: localStorage.getItem('pdfShowVisibility') === 'true',
			}
			await pdfService.downloadRecipePdf(recipe.id, pdfOptions)

			// Descargar PDFs de sub-recetas referenciadas
			if (recipe.components) {
				const subRecipeIds = new Set<number>()
				for (const comp of recipe.components) {
					const selectedOptId = pdfComponentSelections[comp.id]
					const opt = selectedOptId
						? comp.options.find((o) => o.id === selectedOptId)
						: comp.options.find((o) => o.isDefault) || comp.options[0]
					if (opt?.recipe?.id) {
						subRecipeIds.add(opt.recipe.id)
					}
				}
				for (const subId of subRecipeIds) {
					await pdfService.downloadRecipePdf(subId, {
						showAuthor: pdfOptions.showAuthor,
						showVisibility: pdfOptions.showVisibility,
					})
				}
			}

			setShowPdfOptions(false)
			toast.success(t('recipes.pdfDownloaded'))
		} catch {
			toast.error(t('recipes.pdfError'))
		}
	}

	const handleAddToShopping = async () => {
		const ingredients = recipe.ingredients || []
		if (ingredients.length === 0) {
			toast.error(t('recipes.noIngredients'))
			return
		}
		try {
			await shoppingService.addManualItems(
				ingredients.map((i) => ({
					ingredientId: i.id,
					quantity: i.quantity || 0,
					unit: i.unit || 'g',
				}))
			)
			toast.success(t('recipes.addedToShopping'))
		} catch {
			toast.error(t('recipes.addToShoppingError'))
		}
	}

	return (
		<div className='recipe-detail'>
			<div className='recipe-detail-header'>
				<div>
					<h1 className='recipe-detail-title'>{recipe.title}</h1>
					<p className='recipe-detail-servings'>
						{recipe.servings} {t('recipes.portionsUnit')}
					</p>
				</div>
				<div className='recipe-detail-actions'>
					<button className='btn btn-primary' onClick={onAddToWeek}>
						{t('recipes.addToWeek')}
					</button>
					<button className='btn btn-outline' onClick={handleAddToShopping}>
						{t('recipes.addToShopping')}
					</button>
					<button className='btn btn-outline' onClick={handleExportPdf}>
						{t('recipes.downloadPdf')}
					</button>
					<Link to={`/recipes/${recipe.id}/edit`} className='btn btn-outline'>
						{t('edit')}
					</Link>
					<button className='btn btn-danger' onClick={onDelete}>
						{t('delete')}
					</button>
				</div>
			</div>

			<div className='recipe-threshold-section'>
				<h3>
					{t('recipes.minStock')} {hasThreshold && <span className='threshold-active'>✓</span>}
				</h3>
				<p className='form-hint'>{t('recipes.minStockHint')}</p>
				<div className='threshold-form'>
					<input
						type='number'
						className='form-input form-input-sm'
						placeholder={t('recipes.minServings')}
						value={minServings}
						onChange={(e) => setMinServings(e.target.value)}
						min={0}
						step={1}
					/>
					<span className='threshold-unit'>{t('recipes.portionsUnit')}</span>
					<button
						className='btn btn-sm btn-primary'
						onClick={handleSaveThreshold}
						disabled={!minServings || Number(minServings) <= 0}>
						{t('recipes.saveThreshold')}
					</button>
					{hasThreshold && (
						<button className='btn btn-sm btn-outline btn-danger' onClick={handleDeleteThreshold}>
							{t('recipes.removeThreshold')}
						</button>
					)}
				</div>
			</div>

			{recipe.imageUrl && (
				<div className='recipe-detail-image'>
					<img src={recipe.imageUrl} alt={recipe.title} />
				</div>
			)}

			{recipe.description && <p className='recipe-detail-description'>{recipe.description}</p>}

			{hasNutrition && recipe.nutritionPerServing && (
				<div className='recipe-nutrition-card'>
					<h3>
						{t('recipes.nutritionInfo')}{' '}
						<span className='nutrition-subtitle'>{t('recipes.perServing')}</span>
					</h3>
					<div className='nutrition-grid'>
						<div className='nutrition-item'>
							<span className='nutrition-value'>{recipe.nutritionPerServing.calories}</span>
							<span className='nutrition-label'>{t('weekPlan.kcal')}</span>
						</div>
						<div className='nutrition-item protein'>
							<span className='nutrition-value'>{recipe.nutritionPerServing.protein}g</span>
							<span className='nutrition-label'>{t('weekPlan.protein')}</span>
						</div>
						<div className='nutrition-item carbs'>
							<span className='nutrition-value'>{recipe.nutritionPerServing.carbs}g</span>
							<span className='nutrition-label'>{t('weekPlan.carbs')}</span>
						</div>
						<div className='nutrition-item fat'>
							<span className='nutrition-value'>{recipe.nutritionPerServing.fat}g</span>
							<span className='nutrition-label'>{t('weekPlan.fat')}</span>
						</div>
						<div className='nutrition-item fiber'>
							<span className='nutrition-value'>{recipe.nutritionPerServing.fiber}g</span>
							<span className='nutrition-label'>{t('fiber')}</span>
						</div>
					</div>
					{recipe.nutrition && (
						<p className='nutrition-total'>
							{t('recipes.totalRecipeNutrition', {
								calories: recipe.nutrition.calories,
								protein: recipe.nutrition.protein,
								carbs: recipe.nutrition.carbs,
								fat: recipe.nutrition.fat,
								fiber: recipe.nutrition.fiber,
							})}
						</p>
					)}
				</div>
			)}

			{hasIngredients && (
				<div className='recipe-detail-section'>
					<h2>{t('recipes.ingredientsTab')}</h2>
					<ul className='recipe-ingredients-list'>
						{recipe.ingredients.map((ing) => (
							<li key={ing.id} className='recipe-ingredient-item'>
								<span className='ingredient-quantity'>
									{ing.quantity} {ing.unit}
								</span>
								<span className='ingredient-name'>{ing.name}</span>
							</li>
						))}
					</ul>
				</div>
			)}

			{hasComponents && (
				<div className='recipe-detail-section'>
					<h2>{t('recipes.componentsTitle')}</h2>
					<div className='recipe-components-list'>
						{recipe.components!.map((comp) => (
							<div key={comp.id} className='recipe-component'>
								<h3 className='component-name'>
									{comp.name}
									{comp.isOptional && (
										<span className='optional-badge'>{t('recipes.optionalBadge')}</span>
									)}
								</h3>
								<ul className='component-options'>
									{comp.options.map((opt) => (
										<li
											key={opt.id}
											className={`component-option ${opt.isDefault ? 'default' : ''}`}>
											<span className='option-icon'>
												{opt.recipeId || opt.recipe ? '📖' : '🥬'}
											</span>
											<span className='option-name'>
												{opt.name ||
													opt.recipe?.title ||
													opt.ingredient?.name ||
													t('recipes.option')}
											</span>
											{opt.recipe && (
												<Link to={`/recipes/${opt.recipe.id}`} className='option-link'>
													{t('recipes.viewRecipe')}
												</Link>
											)}
											{opt.ingredient && opt.quantity && (
												<span className='option-quantity'>
													({opt.quantity} {opt.unit})
												</span>
											)}
											{opt.isDefault && (
												<span className='default-badge'>{t('recipes.defaultBadge')}</span>
											)}
										</li>
									))}
								</ul>
							</div>
						))}
					</div>
				</div>
			)}

			{recipe.instructions && (
				<div className='recipe-detail-section'>
					<h2>{t('recipes.instructions')}</h2>
					<div className='recipe-instructions'>
						{recipe.instructions.split('\n').map((line, index) => (
							<p key={index}>{line}</p>
						))}
					</div>
				</div>
			)}

			{showPdfOptions && hasComponents && (
				<div className='pdf-options-overlay'>
					<div className='pdf-options-modal'>
						<h3>{t('recipes.pdfSelectVariants')}</h3>
						<p className='form-hint'>{t('recipes.pdfSelectVariantsHint')}</p>
						{recipe.components!.map((comp) => (
							<div key={comp.id} className='pdf-option-group'>
								<label className='form-label'>
									{comp.name}
									{comp.isOptional && (
										<span className='optional-badge'>{t('recipes.optionalBadge')}</span>
									)}
								</label>
								<select
									className='form-input'
									value={pdfComponentSelections[comp.id] || ''}
									onChange={(e) =>
										setPdfComponentSelections({
											...pdfComponentSelections,
											[comp.id]: parseInt(e.target.value),
										})
									}>
									{comp.options.map((opt) => (
										<option key={opt.id} value={opt.id}>
											{opt.recipeId || opt.recipe ? '📖' : '🥬'}{' '}
											{opt.name || opt.recipe?.title || opt.ingredient?.name}
											{opt.isDefault ? ` (${t('default')})` : ''}
										</option>
									))}
								</select>
							</div>
						))}
						<div className='flex gap-1 mt-2'>
							<button className='btn btn-outline' onClick={() => setShowPdfOptions(false)}>
								{t('cancel')}
							</button>
							<button className='btn btn-primary' onClick={handleDownloadPdf}>
								{t('recipes.downloadPdf')}
							</button>
						</div>
					</div>
				</div>
			)}

			<div className='recipe-detail-footer'>
				<Link to='/recipes' className='btn btn-outline'>
					{t('recipes.backToRecipes')}
				</Link>
			</div>
		</div>
	)
}
