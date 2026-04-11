import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { AddToWeekModal } from '@/components/shared/modals/AddToWeekModal'
import { authService } from '@/services/auth'
import { Recipe, recipeService } from '@/services/recipe'
import { pdfService } from '@/services/pdf'
import { useDialog } from '@/utils/dialog/DialogContext'

import { RecipeList } from '../components/RecipeList'

export function RecipeListContainer() {
	const { t } = useTranslation()
	const { confirm, toast } = useDialog()
	const [recipes, setRecipes] = useState<Recipe[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
	const [modalOpen, setModalOpen] = useState(false)
	const currentUser = authService.getUser()

	useEffect(() => {
		loadRecipes()
	}, [])

	const loadRecipes = async () => {
		try {
			const data = await recipeService.getAll()
			setRecipes(data)
		} catch (err) {
			setError(t('recipes.loadError'))
		} finally {
			setLoading(false)
		}
	}

	const handleDelete = async (id: number) => {
		const confirmed = await confirm({
			title: t('recipes.deleteTitle'),
			message: t('recipes.deleteConfirm'),
			confirmText: t('delete'),
			type: 'danger',
		})
		if (!confirmed) return

		try {
			await recipeService.delete(id)
			setRecipes(recipes.filter((r) => r.id !== id))
			toast.success(t('recipes.deleted'))
		} catch {
			toast.error(t('recipes.deleteError'))
		}
	}

	const handleAddToWeek = (recipe: Recipe) => {
		setSelectedRecipe(recipe)
		setModalOpen(true)
	}

	const importFileRef = useRef<HTMLInputElement>(null)

	const handleImportPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return
		try {
			const html = await file.text()
			await pdfService.importRecipeFromHtml(html)
			toast.success(t('recipes.imported'))
			loadRecipes()
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : t('recipes.importError'))
		}
		e.target.value = ''
	}

	if (loading) return <div className='loading'>{t('recipes.loading')}</div>
	if (error) return <div className='error-message'>{error}</div>

	return (
		<>
			<div className='page-header'>
				<h1 className='page-title'>{t('recipes.title')}</h1>
				<div className='page-header-actions'>
					<label className='btn btn-outline' style={{ cursor: 'pointer' }}>
						{t('recipes.import')}
						<input
							type='file'
							accept='.html'
							ref={importFileRef}
							onChange={handleImportPdf}
							style={{ display: 'none' }}
						/>
					</label>
					<Link to='/recipes/new' className='btn btn-primary'>
						{t('recipes.new')}
					</Link>
				</div>
			</div>

			<RecipeList
				recipes={recipes}
				currentUserId={currentUser?.id || 0}
				onDelete={handleDelete}
				onAddToWeek={handleAddToWeek}
			/>

			<AddToWeekModal
				recipe={selectedRecipe}
				isOpen={modalOpen}
				onClose={() => setModalOpen(false)}
			/>
		</>
	)
}
