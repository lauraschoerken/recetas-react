import './RecipeDetail.scss'
import '@uiw/react-markdown-preview/markdown.css'

import MDPreview from '@uiw/react-markdown-preview'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HiOutlineLockClosed } from 'react-icons/hi2'
import { Link } from 'react-router-dom'

import {
	PdfVariantsModal,
	PdfVariantsModalQuestion,
} from '@/components/shared/pdf-variants-modal/PdfVariantsModal'
import { alertService } from '@/services/alert'
import { pdfService } from '@/services/pdf'
import { Recipe } from '@/services/recipe'
import { shoppingService } from '@/services/shopping'
import { useDialog } from '@/utils/dialog/DialogContext'

interface RecipeDetailProps {
	recipe: Recipe
	onDelete: () => void
	onAddToWeek: () => void
	isOwner?: boolean
}

export function RecipeDetail({
	recipe,
	onDelete,
	onAddToWeek,
	isOwner = false,
}: RecipeDetailProps) {
	const { t } = useTranslation()
	const { toast } = useDialog()
	const [minServings, setMinServings] = useState('')
	const [hasThreshold, setHasThreshold] = useState(false)
	const [showPdfOptions, setShowPdfOptions] = useState(false)
	const [pdfComponentSelections, setPdfComponentSelections] = useState<Record<string, number>>({})
	const [pdfQuestions, setPdfQuestions] = useState<PdfVariantsModalQuestion[]>([])
	const [pdfRecipeCache, setPdfRecipeCache] = useState<Record<number, any>>({})
	const [loadingPdfOptions, setLoadingPdfOptions] = useState(false)
	const [pdfMerge, setPdfMerge] = useState(false)

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
	}, [recipe.id])

	const selectionKey = (recipeId: number, componentId: number) => `${recipeId}:${componentId}`

	const getDefaultOptionId = (comp: any) =>
		(comp.options.find((o: any) => o.isDefault) || comp.options[0])?.id

	const ensureRecipeInCache = async (recipeId: number, cache: Record<number, any>) => {
		if (!cache[recipeId]) {
			cache[recipeId] = await pdfService.getRecipeData(recipeId)
		}
		return cache[recipeId]
	}

	const buildPdfQuestions = async (
		rootRecipeId: number,
		baseSelections: Record<string, number>,
		baseCache: Record<number, any>
	) => {
		const cache = { ...baseCache }
		const selections = { ...baseSelections }
		const questions: PdfVariantsModalQuestion[] = []

		const walk = async (currentRecipeId: number, depth: number, visited: Set<number>) => {
			if (visited.has(currentRecipeId)) return
			visited.add(currentRecipeId)

			const data = await ensureRecipeInCache(currentRecipeId, cache)
			for (const comp of data.components || []) {
				const key = selectionKey(currentRecipeId, comp.id)
				const defaultOptId = getDefaultOptionId(comp)
				if (!(key in selections)) {
					selections[key] = comp.isOptional && !comp.defaultEnabled ? 0 : (defaultOptId ?? 0)
				}

				questions.push({
					key,
					recipeId: currentRecipeId,
					recipeTitle: data.title,
					componentId: comp.id,
					componentName: comp.name,
					depth,
					isOptional: comp.isOptional ?? false,
					options: comp.options,
				})

				const selectedOptId = key in selections ? selections[key] : defaultOptId
				const selectedOpt =
					selectedOptId !== 0 ? comp.options.find((o: any) => o.id === selectedOptId) : null
				const childRecipeId = selectedOpt?.recipe?.id
				if (childRecipeId) {
					await walk(childRecipeId, depth + 1, visited)
				}
			}
		}

		await walk(rootRecipeId, 0, new Set<number>())
		return { questions, selections, cache }
	}

	const getSelectedOptionsForRecipe = (
		recipeId: number,
		cache: Record<number, any>,
		selections?: Record<string, number>
	) => {
		const sel = selections ?? pdfComponentSelections
		const selected: Record<number, number> = {}
		const data = cache[recipeId]
		for (const comp of data?.components || []) {
			const key = selectionKey(recipeId, comp.id)
			const defaultOptId = getDefaultOptionId(comp)
			const value = key in sel ? sel[key] : comp.isOptional ? 0 : defaultOptId
			if (value && value !== 0) selected[comp.id] = value
		}
		return selected
	}

	const collectAllEntries = (
		rootId: number,
		cache: Record<number, any>,
		selections: Record<string, number>
	): { recipeId: number; selectedOptions: Record<number, number> }[] => {
		const entries: { recipeId: number; selectedOptions: Record<number, number> }[] = []
		const visited = new Set<number>()
		const walk = (recipeId: number) => {
			if (visited.has(recipeId)) return
			visited.add(recipeId)
			const selectedOptions = getSelectedOptionsForRecipe(recipeId, cache, selections)
			entries.push({ recipeId, selectedOptions })
			const data = cache[recipeId]
			for (const comp of data?.components || []) {
				const selectedOpt = comp.options.find((o: any) => o.id === selectedOptions[comp.id])
				const childId = selectedOpt?.recipe?.id
				if (childId && cache[childId]) walk(childId)
			}
		}
		walk(rootId)
		return entries
	}

	const downloadRecipeTree = async (
		recipeId: number,
		cache: Record<number, any>,
		visited: Set<number>
	) => {
		if (visited.has(recipeId)) return
		visited.add(recipeId)

		const selectedOptions = getSelectedOptionsForRecipe(recipeId, cache)
		const pdfOptions = {
			selectedOptions,
			showAuthor: localStorage.getItem('pdfShowAuthor') === 'true',
			showVisibility: localStorage.getItem('pdfShowVisibility') === 'true',
		}
		await pdfService.downloadRecipePdf(recipeId, pdfOptions)

		const data = cache[recipeId]
		for (const comp of data?.components || []) {
			const selectedOpt = comp.options.find((o: any) => o.id === selectedOptions[comp.id])
			const childRecipeId = selectedOpt?.recipe?.id
			if (childRecipeId && cache[childRecipeId]) {
				await downloadRecipeTree(childRecipeId, cache, visited)
			}
		}
	}

	const handleSaveThreshold = async () => {
		const min = Number(minServings)
		if (!min || min <= 0) return
		try {
			await alertService.setRecipeThreshold({ recipeId: recipe.id, minServings: min })
			setHasThreshold(true)
			toast.success(t('recipes.thresholdSaved'))
		} catch (error) {
			console.error('Error saving threshold:', error)
			toast.error(t('recipes.thresholdSaveError'))
		}
	}

	const handleDeleteThreshold = async () => {
		try {
			await alertService.deleteRecipeThreshold(recipe.id)
			setMinServings('')
			setHasThreshold(false)
			toast.success(t('recipes.thresholdRemoved'))
		} catch (error) {
			console.error('Error deleting threshold:', error)
			toast.error(t('recipes.thresholdSaveError'))
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

	const formatCookTime = (minutes?: number | null) => {
		if (!minutes || minutes <= 0) return null
		if (minutes < 60) return `${minutes}${t('recipes.minuteShort')}`
		const hours = Math.round((minutes / 60) * 10) / 10
		return `${hours}${t('recipes.timeShort')}`
	}

	const difficultyText =
		recipe.difficulty === 'easy'
			? t('recipes.difficultyEasy')
			: recipe.difficulty === 'medium'
				? t('recipes.difficultyMedium')
				: recipe.difficulty === 'hard'
					? t('recipes.difficultyHard')
					: null

	const handleExportPdf = async () => {
		try {
			setLoadingPdfOptions(true)
			const rootData = await pdfService.getRecipeData(recipe.id)
			const initialCache: Record<number, any> = { [recipe.id]: rootData }
			if (!rootData.components || rootData.components.length === 0) {
				await pdfService.downloadRecipePdf(recipe.id, {
					showAuthor: localStorage.getItem('pdfShowAuthor') === 'true',
					showVisibility: localStorage.getItem('pdfShowVisibility') === 'true',
				})
				toast.success(t('recipes.pdfDownloaded'))
				return
			}

			const built = await buildPdfQuestions(recipe.id, {}, initialCache)
			setPdfRecipeCache(built.cache)
			setPdfComponentSelections(built.selections)
			setPdfQuestions(built.questions)
			setShowPdfOptions(true)
		} catch {
			toast.error(t('recipes.pdfError'))
		} finally {
			setLoadingPdfOptions(false)
		}
	}

	const handlePdfSelectionChange = async (question: PdfVariantsModalQuestion, value: number) => {
		try {
			setLoadingPdfOptions(true)
			const nextSelections = { ...pdfComponentSelections, [question.key]: value }
			const built = await buildPdfQuestions(recipe.id, nextSelections, pdfRecipeCache)
			setPdfRecipeCache(built.cache)
			setPdfComponentSelections(built.selections)
			setPdfQuestions(built.questions)
		} catch {
			toast.error(t('recipes.pdfError'))
		} finally {
			setLoadingPdfOptions(false)
		}
	}

	const handleDownloadPdf = async () => {
		try {
			const pdfOptions = {
				showAuthor: localStorage.getItem('pdfShowAuthor') === 'true',
				showVisibility: localStorage.getItem('pdfShowVisibility') === 'true',
			}
			if (pdfMerge) {
				const entries = collectAllEntries(recipe.id, pdfRecipeCache, pdfComponentSelections)
				await pdfService.downloadCombinedPdf(entries, pdfOptions)
			} else {
				await downloadRecipeTree(recipe.id, pdfRecipeCache, new Set<number>())
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
					<h1 className='recipe-detail-title'>
						{recipe.title}
						{recipe.isPublic === false && (
							<span className='recipe-detail-lock' title={t('private')} aria-hidden='true'>
								<HiOutlineLockClosed size={18} />
							</span>
						)}
					</h1>
					<div className='recipe-detail-meta'>
						<span className='recipe-detail-chip'>
							{recipe.servings} {t('recipes.portionsUnit')}
						</span>
						{formatCookTime(recipe.cookTimeMinutes) && (
							<span className='recipe-detail-chip'>{formatCookTime(recipe.cookTimeMinutes)}</span>
						)}
						{difficultyText && <span className='recipe-detail-chip'>{difficultyText}</span>}
					</div>
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
					{isOwner && (
						<>
							<Link to={`/recipes/${recipe.id}/edit`} className='btn btn-outline'>
								{t('edit')}
							</Link>
							<button className='btn btn-danger' onClick={onDelete}>
								{t('delete')}
							</button>
						</>
					)}
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

			{recipe.description && (
				<div className='recipe-detail-description'>
					<MDPreview source={recipe.description} />
				</div>
			)}

			{recipe.tags && recipe.tags.length > 0 && (
				<div className='recipe-detail-tags'>
					{recipe.tags.map((tag) => (
						<span
							key={tag.id}
							className='recipe-detail-tag'
							style={tag.color ? { borderColor: tag.color, color: tag.color } : {}}>
							{tag.name}
						</span>
					))}
				</div>
			)}

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
												{opt.recipeId || opt.recipe ? '📖' : '🥕'}
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
						{(recipe.instructions.includes('\n---\n')
							? recipe.instructions.split('\n---\n')
							: recipe.instructions.split('\n')
						).map((line, index) => (
							<p key={index}>{line}</p>
						))}
					</div>
				</div>
			)}

			<PdfVariantsModal
				isOpen={showPdfOptions && pdfQuestions.length > 0}
				onClose={() => setShowPdfOptions(false)}
				questions={pdfQuestions}
				selections={pdfComponentSelections}
				loading={loadingPdfOptions}
				merge={pdfMerge}
				modalId='detail'
				onSelectionChange={handlePdfSelectionChange}
				onMergeChange={setPdfMerge}
				onConfirm={handleDownloadPdf}
			/>

			<div className='recipe-detail-footer'>
				<Link to='/recipes' className='btn btn-outline'>
					{t('recipes.backToRecipes')}
				</Link>
			</div>
		</div>
	)
}
