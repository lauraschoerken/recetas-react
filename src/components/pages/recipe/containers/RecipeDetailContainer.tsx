import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { AddToWeekModal } from '@/components/shared/modals/AddToWeekModal'
import { Recipe, recipeService } from '@/services/recipe'
import { useDialog } from '@/utils/dialog/DialogContext'

import { RecipeDetail } from '../components/RecipeDetail'

export function RecipeDetailContainer() {
	const { t } = useTranslation()
	const { confirm, toast } = useDialog()
	const { id } = useParams<{ id: string }>()
	const navigate = useNavigate()
	const [recipe, setRecipe] = useState<Recipe | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [modalOpen, setModalOpen] = useState(false)

	useEffect(() => {
		loadRecipe()
	}, [id])

	const loadRecipe = async () => {
		if (!id) return

		try {
			const data = await recipeService.getById(parseInt(id))
			setRecipe(data)
		} catch {
			setError(t('recipes.notFound'))
		} finally {
			setLoading(false)
		}
	}

	const handleDelete = async () => {
		if (!recipe) return
		const confirmed = await confirm({
			title: t('recipes.deleteTitle'),
			message: t('recipes.deleteConfirm'),
			confirmText: t('delete'),
			type: 'danger',
		})
		if (!confirmed) return

		try {
			await recipeService.delete(recipe.id)
			toast.success(t('recipes.deleted'))
			navigate('/recipes')
		} catch {
			toast.error(t('recipes.deleteError'))
		}
	}

	const handleAddToWeek = () => {
		setModalOpen(true)
	}

	if (loading) return <div className='loading'>{t('recipes.loading')}</div>
	if (error || !recipe) return <div className='error-message'>{error || t('error')}</div>

	return (
		<>
			<RecipeDetail recipe={recipe} onDelete={handleDelete} onAddToWeek={handleAddToWeek} />

			<AddToWeekModal recipe={recipe} isOpen={modalOpen} onClose={() => setModalOpen(false)} />
		</>
	)
}
