import './Pagination.scss'

import { useTranslation } from 'react-i18next'

interface PaginationProps {
	currentPage: number
	total: number
	pageSize: number
	onPageChange: (page: number) => void
}

export function Pagination({ currentPage, total, pageSize, onPageChange }: PaginationProps) {
	const { t } = useTranslation()
	const pages = Math.max(1, Math.ceil(total / pageSize))

	if (pages <= 1) return null

	// Rango de páginas a mostrar (máx 5 botones)
	const range = (start: number, end: number) =>
		Array.from({ length: end - start + 1 }, (_, i) => start + i)

	let pageNumbers: (number | '...')[] = []
	if (pages <= 7) {
		pageNumbers = range(1, pages)
	} else if (currentPage <= 4) {
		pageNumbers = [...range(1, 5), '...', pages]
	} else if (currentPage >= pages - 3) {
		pageNumbers = [1, '...', ...range(pages - 4, pages)]
	} else {
		pageNumbers = [1, '...', ...range(currentPage - 1, currentPage + 1), '...', pages]
	}

	return (
		<nav className='pagination' aria-label={t('pagination.label')}>
			<button
				className='pagination-btn'
				onClick={() => onPageChange(currentPage - 1)}
				disabled={currentPage === 1}
				aria-label={t('pagination.prev')}>
				‹
			</button>

			{pageNumbers.map((p, i) =>
				p === '...' ? (
					<span key={`ellipsis-${i}`} className='pagination-ellipsis'>
						…
					</span>
				) : (
					<button
						key={p}
						className={`pagination-btn ${currentPage === p ? 'active' : ''}`}
						onClick={() => onPageChange(p as number)}
						aria-current={currentPage === p ? 'page' : undefined}>
						{p}
					</button>
				)
			)}

			<button
				className='pagination-btn'
				onClick={() => onPageChange(currentPage + 1)}
				disabled={currentPage === pages}
				aria-label={t('pagination.next')}>
				›
			</button>

			<span className='pagination-info'>
				{t('pagination.info', { current: currentPage, total: pages })}
			</span>
		</nav>
	)
}
