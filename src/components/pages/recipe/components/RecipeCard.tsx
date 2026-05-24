import './RecipeCard.scss'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ItemCard, ItemCardData } from '@/components/shared/item-card'
import {
	PdfVariantsModal,
	PdfVariantsModalQuestion,
} from '@/components/shared/pdf-variants-modal/PdfVariantsModal'
import { pdfService } from '@/services/pdf'
import { Recipe } from '@/services/recipe'
import { useDialog } from '@/utils/dialog/DialogContext'

interface RecipeCardProps {
	recipe: Recipe
	currentUserId: number
	onDelete: (id: number) => void
	onAddToWeek: (recipe: Recipe) => void
	isSelected?: boolean
	onSelect?: (id: number) => void
}

export function RecipeCard({
	recipe,
	currentUserId,
	onDelete,
	onAddToWeek,
	isSelected,
	onSelect,
}: RecipeCardProps) {
	const { t } = useTranslation()
	const { toast } = useDialog()
	const [showPdfOptions, setShowPdfOptions] = useState(false)
	const [pdfComponentSelections, setPdfComponentSelections] = useState<Record<string, number>>({})
	const [pdfQuestions, setPdfQuestions] = useState<PdfVariantsModalQuestion[]>([])
	const [pdfRecipeCache, setPdfRecipeCache] = useState<Record<number, any>>({})
	const [loadingPdfOptions, setLoadingPdfOptions] = useState(false)
	const [pdfMerge, setPdfMerge] = useState(false)

	const hasVariants = (recipe.components || []).some((c) => c.options.length > 1)

	const itemData: ItemCardData = {
		id: recipe.id,
		title: recipe.title,
		description: recipe.description,
		imageUrl: recipe.imageUrl,
		userId: recipe.userId,
		caloriesPerServing: recipe.caloriesPerServing,
		cookTimeMinutes: recipe.cookTimeMinutes,
		difficulty: recipe.difficulty,
		servings: recipe.servings,
		tags: recipe.tags,
		type: 'recipe',
		isPublic: recipe.isPublic,
	}

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
		selections: Record<string, number>
	) => {
		const selected: Record<number, number> = {}
		const data = cache[recipeId]
		for (const comp of data?.components || []) {
			const key = selectionKey(recipeId, comp.id)
			const defaultOptId = getDefaultOptionId(comp)
			const value = key in selections ? selections[key] : comp.isOptional ? 0 : defaultOptId
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
		selections: Record<string, number>,
		visited: Set<number>
	) => {
		if (visited.has(recipeId)) return
		visited.add(recipeId)

		const selectedOptions = getSelectedOptionsForRecipe(recipeId, cache, selections)
		await pdfService.downloadRecipePdf(recipeId, {
			selectedOptions,
			showAuthor: localStorage.getItem('pdfShowAuthor') === 'true',
			showVisibility: localStorage.getItem('pdfShowVisibility') === 'true',
		})

		const data = cache[recipeId]
		for (const comp of data?.components || []) {
			const selectedOpt = comp.options.find((o: any) => o.id === selectedOptions[comp.id])
			const childRecipeId = selectedOpt?.recipe?.id
			if (childRecipeId && cache[childRecipeId]) {
				await downloadRecipeTree(childRecipeId, cache, selections, visited)
			}
		}
	}

	const handleDownloadPdf = async () => {
		try {
			setLoadingPdfOptions(true)
			const rootData = await pdfService.getRecipeData(recipe.id)
			const initialCache: Record<number, any> = { [recipe.id]: rootData }

			if (rootData.components && rootData.components.length > 0) {
				const built = await buildPdfQuestions(recipe.id, {}, initialCache)
				setPdfRecipeCache(built.cache)
				setPdfComponentSelections(built.selections)
				setPdfQuestions(built.questions)
				setShowPdfOptions(true)
				return
			}

			await pdfService.downloadRecipePdf(recipe.id, {
				showAuthor: localStorage.getItem('pdfShowAuthor') === 'true',
				showVisibility: localStorage.getItem('pdfShowVisibility') === 'true',
			})
			toast.success(t('recipes.pdfDownloaded'))
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

	const confirmPdfDownload = async () => {
		try {
			const pdfOptions = {
				showAuthor: localStorage.getItem('pdfShowAuthor') === 'true',
				showVisibility: localStorage.getItem('pdfShowVisibility') === 'true',
			}
			if (pdfMerge) {
				const entries = collectAllEntries(recipe.id, pdfRecipeCache, pdfComponentSelections)
				await pdfService.downloadCombinedPdf(entries, pdfOptions)
			} else {
				await downloadRecipeTree(
					recipe.id,
					pdfRecipeCache,
					pdfComponentSelections,
					new Set<number>()
				)
			}
			setShowPdfOptions(false)
			toast.success(t('recipes.pdfDownloaded'))
		} catch {
			toast.error(t('recipes.pdfError'))
		}
	}

	return (
		<>
			<ItemCard
				item={itemData}
				currentUserId={currentUserId}
				onDelete={onDelete}
				onAddToWeek={() => onAddToWeek(recipe)}
				onDownloadPdf={handleDownloadPdf}
				editPath={`/recipes/${recipe.id}/edit`}
				detailPath={`/recipes/${recipe.id}`}
				isSelected={isSelected}
				onSelect={onSelect ? () => onSelect(recipe.id) : undefined}
			/>

			<PdfVariantsModal
				isOpen={showPdfOptions && pdfQuestions.length > 0}
				onClose={() => setShowPdfOptions(false)}
				questions={pdfQuestions}
				selections={pdfComponentSelections}
				loading={loadingPdfOptions}
				merge={pdfMerge}
				modalId={String(recipe.id)}
				onSelectionChange={handlePdfSelectionChange}
				onMergeChange={setPdfMerge}
				onConfirm={confirmPdfDownload}
			/>
		</>
	)
}
