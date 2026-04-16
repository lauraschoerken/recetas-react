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

export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
	const start = (page - 1) * pageSize
	return items.slice(start, start + pageSize)
}

export function totalPages(itemCount: number, pageSize: number): number {
	return Math.max(1, Math.ceil(itemCount / pageSize))
}
