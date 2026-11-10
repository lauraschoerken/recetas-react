import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'

import { AddToWeekModal } from '@/components/shared/modals/AddToWeekModal'
import { authService } from '@/services/auth'
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
		const deletingAsAdmin =
			authService.isAdmin() && recipe.userId !== authService.getUser()?.id
		const confirmed = await confirm({
			title: t('recipes.deleteTitle'),
			message: deletingAsAdmin
				? t('recipes.adminDeleteConfirm', {
						title: recipe.title,
						owner: recipe.authorName || `#${recipe.userId}`,
					})
				: t('recipes.deleteConfirm'),
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

	const handleHide = async () => {
		if (!recipe) return
		const confirmed = await confirm({
			title: t('recipes.hideTitle'),
			message: t('recipes.hideConfirm', { title: recipe.title }),
			confirmText: t('recipes.hide'),
		})
		if (!confirmed) return

		try {
			await recipeService.hide(recipe.id)
			setRecipe({ ...recipe, isHiddenForCurrentUser: true })
			toast.success(t('recipes.hidden'))
		} catch {
			toast.error(t('recipes.hideError'))
		}
	}

	const handleUnhide = async () => {
		if (!recipe) return
		try {
			await recipeService.unhide(recipe.id)
			setRecipe({ ...recipe, isHiddenForCurrentUser: false })
			toast.success(t('recipes.unhidden'))
		} catch {
			toast.error(t('recipes.unhideError'))
		}
	}

	if (loading) return <div className='loading'>{t('recipes.loading')}</div>
	if (error || !recipe) return <div className='error-message'>{error || t('error')}</div>
	const isOwner = recipe.userId === authService.getUser()?.id
	const isAdmin = authService.isAdmin()

	return (
		<>
			<RecipeDetail
				recipe={recipe}
				onDelete={handleDelete}
				onAddToWeek={handleAddToWeek}
				onHide={
					!isOwner && recipe.isPublic && !recipe.isHiddenForCurrentUser ? handleHide : undefined
				}
				onUnhide={
					!isOwner && recipe.isPublic && recipe.isHiddenForCurrentUser
						? handleUnhide
						: undefined
				}
				isOwner={isOwner}
				canEdit={isOwner || isAdmin}
				canDelete={isAdmin}
				showAdminOwnership={isAdmin}
			/>

			<AddToWeekModal recipe={recipe} isOpen={modalOpen} onClose={() => setModalOpen(false)} />
		</>
	)
}
