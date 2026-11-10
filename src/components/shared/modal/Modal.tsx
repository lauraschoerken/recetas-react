import './Modal.scss'

import { ReactNode, useEffect, useId, useRef } from 'react'

interface ModalProps {
	isOpen: boolean
	onClose: () => void
	title: string
	children: ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
	const titleId = useId()
	const contentRef = useRef<HTMLDivElement>(null)
	const previousFocusRef = useRef<HTMLElement | null>(null)

	useEffect(() => {
		if (!isOpen) return

		const html = document.documentElement
		const scrollbarWidth = window.innerWidth - html.clientWidth
		previousFocusRef.current = document.activeElement as HTMLElement | null
		const focusableSelector =
			'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
		const focusable = () =>
			Array.from(contentRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault()
				onClose()
				return
			}
			if (event.key !== 'Tab') return
			const elements = focusable()
			if (elements.length === 0) {
				event.preventDefault()
				contentRef.current?.focus()
				return
			}
			const first = elements[0]
			const last = elements[elements.length - 1]
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault()
				last.focus()
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault()
				first.focus()
			}
		}

		html.style.overflow = 'hidden'
		if (scrollbarWidth > 0) {
			html.style.paddingRight = `${scrollbarWidth}px`
		}
		document.addEventListener('keydown', handleKeyDown)
		requestAnimationFrame(() => (focusable()[0] ?? contentRef.current)?.focus())

		return () => {
			document.removeEventListener('keydown', handleKeyDown)
			html.style.overflow = ''
			html.style.paddingRight = ''
			previousFocusRef.current?.focus()
		}
	}, [isOpen, onClose])

	if (!isOpen) return null

	return (
		<div
			className='modal-overlay'
			onClick={(event) => {
				if (event.target === event.currentTarget) onClose()
			}}
			onFocus={(e) =>
				e.target instanceof HTMLElement &&
				e.target.scrollIntoView?.({ block: 'nearest', behavior: 'instant' })
			}>
			<div
				ref={contentRef}
				className='modal-content'
				role='dialog'
				aria-modal='true'
				aria-labelledby={titleId}
				tabIndex={-1}>
				<div className='modal-header'>
					<h2 id={titleId} className='modal-title'>{title}</h2>
					<button type='button' className='modal-close' aria-label='Close' onClick={onClose}>
						&times;
					</button>
				</div>
				<div className='modal-body'>{children}</div>
			</div>
		</div>
	)
}
