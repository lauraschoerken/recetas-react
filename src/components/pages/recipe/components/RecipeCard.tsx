import { ItemCard, ItemCardData } from '@/components/shared/item-card'
import { Recipe } from '@/services/recipe'
import { pdfService } from '@/services/pdf'

interface RecipeCardProps {
	recipe: Recipe
	currentUserId: number
	onDelete: (id: number) => void
	onAddToWeek: (recipe: Recipe) => void
}

export function RecipeCard({ recipe, currentUserId, onDelete, onAddToWeek }: RecipeCardProps) {
	const hasVariants = (recipe.components || []).some((c) => c.options.length > 1)

	const itemData: ItemCardData = {
		id: recipe.id,
		title: recipe.title,
		description: recipe.description,
		imageUrl: recipe.imageUrl,
		isPublic: recipe.isPublic,
		userId: recipe.userId,
		authorName: recipe.authorName,
		caloriesPerServing: recipe.caloriesPerServing,
		hasVariants,
		type: 'recipe',
	}

	const handleDownloadPdf = async () => {
		try {
			const { html } = await pdfService.exportRecipeHtml(recipe.id)
			pdfService.downloadHtml(html, `${recipe.title}.html`)
		} catch {
			console.error('Error downloading PDF')
		}
	}

	return (
		<ItemCard
			item={itemData}
			currentUserId={currentUserId}
			onDelete={onDelete}
			onAddToWeek={() => onAddToWeek(recipe)}
			onDownloadPdf={handleDownloadPdf}
			editPath={`/recipes/${recipe.id}/edit`}
			detailPath={`/recipes/${recipe.id}`}
		/>
	)
}
