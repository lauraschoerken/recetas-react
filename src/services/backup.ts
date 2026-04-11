import { api } from '@/services/api'

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

		// Download each entity as a separate CSV file
		for (const [name, csvContent] of Object.entries(csvData.files)) {
			if (csvContent) {
				this.downloadAsFile(csvContent, `recetas-${name}-${date}.csv`, 'text/csv')
			}
		}
	}

	async importCsv(file: File): Promise<{
		mode: string
		results: Record<string, { created: number; skipped: number; updated: number }>
	}> {
		const text = await file.text()

		// Check if it's a JSON file (legacy) or CSV
		if (text.trim().startsWith('{')) {
			const json = JSON.parse(text)
			return this.importData(json.data || json, 'keep')
		}

		// Parse CSV - detect entity type from file name
		const rows = this.parseCsv(text)
		if (rows.length === 0) throw new Error('CSV vacío')

		// Detect entity type from columns
		const headers = Object.keys(rows[0])
		let entityType = 'unknown'
		if (headers.includes('title') && headers.includes('instructions')) entityType = 'recipes'
		else if (headers.includes('name') && headers.includes('unit')) entityType = 'ingredients'
		else if (headers.includes('plannedDate')) entityType = 'weekPlans'
		else if (headers.includes('location') && headers.includes('quantity')) entityType = 'homeItems'
		else if (headers.includes('purchased')) entityType = 'shoppingItems'

		const data: Record<string, unknown[]> = { [entityType]: rows }
		return this.importData({ data }, 'keep')
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
