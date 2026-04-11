import { api } from '@/services/api'
import JSZip from 'jszip'

interface BackupData {
	exportDate: string
	version: string
	data: Record<string, unknown>
	files?: Record<string, string>
}

class BackupService {
	async exportJson(): Promise<BackupData> {
		return api.get<BackupData>('/backup/export')
	}

	async exportCsv(): Promise<{
		exportDate: string
		version: string
		files: Record<string, string>
	}> {
		return api.get('/backup/export/csv')
	}

	async importData(
		data: unknown,
		mode: 'overwrite' | 'keep' | 'review'
	): Promise<{
		mode: string
		results: Record<string, { created: number; skipped: number; updated: number }>
	}> {
		return api.post('/backup/import', { data, mode })
	}

	downloadAsFile(content: string, filename: string, type = 'text/csv') {
		const blob = new Blob([content], { type })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = filename
		a.click()
		URL.revokeObjectURL(url)
	}

	async downloadBackupJson() {
		const data = await this.exportJson()
		const date = new Date().toISOString().split('T')[0]
		const content = JSON.stringify(data, null, 2)
		this.downloadAsFile(content, `recetas-backup-${date}.json`, 'application/json')
	}

	async downloadBackupCsv() {
		const csvData = await this.exportCsv()
		const date = new Date().toISOString().split('T')[0]
		const zip = new JSZip()
		for (const [name, csvContent] of Object.entries(csvData.files)) {
			if (csvContent) {
				zip.file(`${name}.csv`, csvContent)
			}
		}
		const blob = await zip.generateAsync({ type: 'blob' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `recetas-backup-csv-${date}.zip`
		a.click()
		URL.revokeObjectURL(url)
	}

	async importBackupFile(
		file: File,
		mode: 'overwrite' | 'keep' | 'review'
	): Promise<{
		mode: string
		results: Record<string, { created: number; skipped: number; updated: number }>
	}> {
		const lowerName = file.name.toLowerCase()
		if (lowerName.endsWith('.zip')) {
			return this.importZip(file, mode)
		}
		if (lowerName.endsWith('.csv')) {
			return this.importSingleCsv(file, mode)
		}

		const text = await file.text()
		if (text.trim().startsWith('{')) {
			const json = JSON.parse(text)
			return this.importData(json.data || json, mode)
		}
		throw new Error('Formato no soportado. Usa .json, .csv o .zip')
	}

	private async importSingleCsv(
		file: File,
		mode: 'overwrite' | 'keep' | 'review'
	): Promise<{
		mode: string
		results: Record<string, { created: number; skipped: number; updated: number }>
	}> {
		const text = await file.text()
		const rows = this.parseCsv(text)
		if (rows.length === 0) throw new Error('CSV vacío')

		const key = this.detectEntityFromHeaders(Object.keys(rows[0]))
		if (!key) throw new Error('No se pudo detectar la entidad del CSV')
		const payload = this.buildImportPayload({ [key]: rows })
		return this.importData(payload, mode)
	}

	private async importZip(
		file: File,
		mode: 'overwrite' | 'keep' | 'review'
	): Promise<{
		mode: string
		results: Record<string, { created: number; skipped: number; updated: number }>
	}> {
		const zip = await JSZip.loadAsync(file)
		const csvByKey: Record<string, Record<string, string>[]> = {}

		const entries = Object.values(zip.files)
		for (const entry of entries) {
			if (entry.dir || !entry.name.toLowerCase().endsWith('.csv')) continue
			const baseName = entry.name.split('/').pop() || entry.name
			const key = baseName.replace(/\.csv$/i, '')
			const content = await entry.async('string')
			const rows = this.parseCsv(content)
			if (rows.length > 0) {
				csvByKey[key] = rows
			}
		}

		if (Object.keys(csvByKey).length === 0) {
			throw new Error('El ZIP no contiene CSV válidos')
		}

		const payload = this.buildImportPayload(csvByKey)
		return this.importData(payload, mode)
	}

	private detectEntityFromHeaders(headers: string[]): string | null {
		if (headers.includes('title') && headers.includes('instructions')) return 'recipes'
		if (headers.includes('name') && headers.includes('unit')) return 'ingredients'
		if (headers.includes('plannedDate')) return 'weekPlans'
		if (headers.includes('location') && headers.includes('quantity')) return 'homeItems'
		if (headers.includes('purchased')) return 'shoppingItems'
		if (headers.includes('minQuantity') && headers.includes('ingredientName')) {
			return 'thresholds_ingredients'
		}
		if (headers.includes('minServings') && headers.includes('recipeTitle')) {
			return 'thresholds_recipes'
		}
		if (headers.includes('planningAlertScope') || headers.includes('customCalories')) {
			return 'userProfile'
		}
		return null
	}

	private parseMaybeJson(value: string): unknown {
		const trimmed = value.trim()
		if (!trimmed) return []
		try {
			return JSON.parse(trimmed)
		} catch {
			return []
		}
	}

	private parseNumber(value: string): number | null {
		if (value === '' || value == null) return null
		const n = Number(value)
		return Number.isFinite(n) ? n : null
	}

	private parseBoolean(value: string): boolean {
		return String(value).toLowerCase() === 'true'
	}

	private buildImportPayload(csvByKey: Record<string, Record<string, string>[]>) {
		const data: Record<string, unknown> = {}

		if (csvByKey.ingredients) {
			data.ingredients = csvByKey.ingredients.map((row) => ({
				name: row.name,
				unit: row.unit,
				preferredUnit: row.preferredUnit || null,
				defaultLocation: row.defaultLocation || null,
				imageUrl: row.imageUrl || null,
				variants: this.parseMaybeJson(row.variants) as unknown[],
				conversions: this.parseMaybeJson(row.conversions) as unknown[],
			}))
		}

		if (csvByKey.recipes) {
			data.recipes = csvByKey.recipes.map((row) => ({
				title: row.title,
				description: row.description || null,
				instructions: row.instructions || null,
				imageUrl: row.imageUrl || null,
				servings: this.parseNumber(row.servings) ?? 4,
				isPublic: this.parseBoolean(row.isPublic),
				customCalories: this.parseNumber(row.customCalories),
				customProtein: this.parseNumber(row.customProtein),
				customCarbs: this.parseNumber(row.customCarbs),
				customFat: this.parseNumber(row.customFat),
				customFiber: this.parseNumber(row.customFiber),
				ingredients: this.parseMaybeJson(row.ingredients) as unknown[],
				components: this.parseMaybeJson(row.components) as unknown[],
			}))
		}

		if (csvByKey.weekPlans) {
			data.weekPlans = csvByKey.weekPlans.map((row) => ({
				plannedDate: row.plannedDate,
				servings: this.parseNumber(row.servings),
				type: row.type,
				cooked: this.parseBoolean(row.cooked),
				consumed: this.parseBoolean(row.consumed),
				recipeId: this.parseNumber(row.recipeId),
				selections: this.parseMaybeJson(row.selections) as unknown[],
			}))
		}

		if (csvByKey.homeItems) {
			data.homeItems = csvByKey.homeItems.map((row) => ({
				location: row.location,
				quantity: this.parseNumber(row.quantity) ?? 0,
				unit: row.unit,
				addedAt: row.addedAt,
				expiresAt: row.expiresAt || null,
				ingredientName: row.ingredientName || null,
				recipeTitle: row.recipeTitle || null,
			}))
		}

		if (csvByKey.shoppingItems) {
			data.shoppingItems = csvByKey.shoppingItems.map((row) => ({
				quantity: this.parseNumber(row.quantity) ?? 0,
				unit: row.unit,
				purchased: this.parseBoolean(row.purchased),
				ingredientName: row.ingredientName,
			}))
		}

		if (csvByKey.thresholds_ingredients || csvByKey.thresholds_recipes) {
			data.thresholds = {
				ingredients: (csvByKey.thresholds_ingredients || []).map((row) => ({
					ingredientName: row.ingredientName,
					minQuantity: this.parseNumber(row.minQuantity) ?? 0,
					unit: row.unit,
				})),
				recipes: (csvByKey.thresholds_recipes || []).map((row) => ({
					recipeTitle: row.recipeTitle,
					minServings: this.parseNumber(row.minServings) ?? 0,
				})),
			}
		}

		if (csvByKey.userProfile && csvByKey.userProfile[0]) {
			const row = csvByKey.userProfile[0]
			data.userProfile = {
				imageUrl: row.imageUrl || null,
				weight: this.parseNumber(row.weight),
				height: this.parseNumber(row.height),
				age: this.parseNumber(row.age),
				gender: row.gender || null,
				activityLevel: row.activityLevel || null,
				goal: row.goal || null,
				customCalories: this.parseNumber(row.customCalories),
				customProtein: this.parseNumber(row.customProtein),
				customCarbs: this.parseNumber(row.customCarbs),
				customFat: this.parseNumber(row.customFat),
				planningAlertScope: row.planningAlertScope || null,
			}
		}

		return { data }
	}

	async importCsv(file: File): Promise<{
		mode: string
		results: Record<string, { created: number; skipped: number; updated: number }>
	}> {
		return this.importSingleCsv(file, 'keep')
	}

	parseCsv(text: string): Record<string, string>[] {
		const lines = text.split('\n').filter((l) => l.trim())
		if (lines.length < 2) return []
		const headers = lines[0].split(',').map((h) => h.trim())
		const rows: Record<string, string>[] = []
		for (let i = 1; i < lines.length; i++) {
			const values = this.splitCsvLine(lines[i])
			const row: Record<string, string> = {}
			headers.forEach((h, idx) => {
				row[h] = values[idx] || ''
			})
			rows.push(row)
		}
		return rows
	}

	private splitCsvLine(line: string): string[] {
		const result: string[] = []
		let current = ''
		let inQuotes = false
		for (let i = 0; i < line.length; i++) {
			const ch = line[i]
			if (ch === '"') {
				if (inQuotes && line[i + 1] === '"') {
					current += '"'
					i++
				} else {
					inQuotes = !inQuotes
				}
			} else if (ch === ',' && !inQuotes) {
				result.push(current)
				current = ''
			} else {
				current += ch
			}
		}
		result.push(current)
		return result
	}
}

export const backupService = new BackupService()
