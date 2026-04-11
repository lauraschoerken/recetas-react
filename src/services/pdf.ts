import type { Recipe } from '@/models'
import { api } from '@/services/api'

const API_MODE = (import.meta.env.VITE_API_MODE as 'mock' | 'api' | 'real' | undefined) ?? 'api'
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? ''
const API_PREFIX = (import.meta.env.VITE_API_PREFIX as string | undefined) ?? '/api'
const API_URL = API_MODE === 'mock' ? '' : `${API_BASE}${API_PREFIX}`

class PdfService {
	async exportRecipeHtml(
		recipeId: number
	): Promise<{ html: string; recipe: { id: number; title: string } }> {
		return api.get(`/pdf/recipe/${recipeId}`)
	}

	async getRecipeData(recipeId: number): Promise<any> {
		return api.get(`/pdf/recipe/${recipeId}/data`)
	}

	async downloadRecipePdf(
		recipeId: number,
		options: {
			selectedOptions?: Record<number, number>
			showAuthor?: boolean
			showVisibility?: boolean
		} = {}
	): Promise<void> {
		const token = localStorage.getItem('token')
		const response = await fetch(`${API_URL}/pdf/recipe/${recipeId}/pdf`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			body: JSON.stringify(options),
		})

		if (!response.ok) {
			const errText = await response.text().catch(() => '')
			throw new Error(errText || 'Error generating PDF')
		}
		const contentType = response.headers.get('Content-Type') || ''
		if (!contentType.includes('application/pdf')) {
			throw new Error('El servidor no devolvió un PDF válido')
		}

		const blob = await response.blob()
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		const disposition = response.headers.get('Content-Disposition')
		const filenameMatch = disposition?.match(/filename="?([^"]+)"?/)
		a.download = filenameMatch?.[1] || 'receta.pdf'
		a.style.display = 'none'
		document.body.appendChild(a)
		a.click()
		a.remove()
		URL.revokeObjectURL(url)
	}

	async importRecipeFromHtml(html: string): Promise<Recipe> {
		return api.post<Recipe>('/pdf/recipe/import', { html })
	}

	printHtml(html: string, title: string) {
		const printWindow = window.open('', '_blank')
		if (!printWindow) return
		printWindow.document.write(html)
		printWindow.document.title = title
		printWindow.document.close()
		printWindow.focus()
		setTimeout(() => printWindow.print(), 500)
	}

	downloadHtml(html: string, filename: string) {
		const blob = new Blob([html], { type: 'text/html' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = filename
		a.click()
		URL.revokeObjectURL(url)
	}
}

export const pdfService = new PdfService()
