const PAGE_SIZE_KEY = 'pagination_pageSize'
export const PAGE_SIZE_OPTIONS = [6, 12, 24, 48] as const
export const DEFAULT_PAGE_SIZE = 12

export function getStoredPageSize(): number {
	const stored = parseInt(localStorage.getItem(PAGE_SIZE_KEY) || '', 10)
	if (PAGE_SIZE_OPTIONS.includes(stored as (typeof PAGE_SIZE_OPTIONS)[number])) return stored
	return DEFAULT_PAGE_SIZE
}

export function setStoredPageSize(size: number): void {
	localStorage.setItem(PAGE_SIZE_KEY, String(size))
}

const SNOOZE_DURATION_KEY = 'alerts_snoozeDuration'
// Options in milliseconds
export const SNOOZE_OPTIONS = [
	{ value: 86400000, labelKey: 'settings.snooze1day' },
	{ value: 259200000, labelKey: 'settings.snooze3days' },
	{ value: 604800000, labelKey: 'settings.snooze1week' },
] as const
export const DEFAULT_SNOOZE_DURATION = 86400000

export function getStoredSnoozeDuration(): number {
	const stored = parseInt(localStorage.getItem(SNOOZE_DURATION_KEY) || '', 10)
	if (SNOOZE_OPTIONS.some((o) => o.value === stored)) return stored
	return DEFAULT_SNOOZE_DURATION
}

export function setStoredSnoozeDuration(ms: number): void {
	localStorage.setItem(SNOOZE_DURATION_KEY, String(ms))
}

export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
	const start = (page - 1) * pageSize
	return items.slice(start, start + pageSize)
}

export function totalPages(itemCount: number, pageSize: number): number {
	return Math.max(1, Math.ceil(itemCount / pageSize))
}
