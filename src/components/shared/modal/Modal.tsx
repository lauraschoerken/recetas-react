import './Modal.scss'

import { ReactNode, useEffect } from 'react'

interface ModalProps {
	isOpen: boolean
	onClose: () => void
	title: string
	children: ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
	useEffect(() => {
		if (!isOpen) return

		const html = document.documentElement
		const scrollbarWidth = window.innerWidth - html.clientWidth

		html.style.overflow = 'hidden'
		if (scrollbarWidth > 0) {
			html.style.paddingRight = `${scrollbarWidth}px`
		}

		return () => {
			html.style.overflow = ''
			html.style.paddingRight = ''
		}
	}, [isOpen])

	if (!isOpen) return null

	return (
		<div
			className='modal-overlay'
			onClick={onClose}
			onFocus={(e) =>
				e.target instanceof HTMLElement &&
				e.target.scrollIntoView?.({ block: 'nearest', behavior: 'instant' })
			}>
			<div className='modal-content' onClick={(e) => e.stopPropagation()}>
				<div className='modal-header'>
					<h2 className='modal-title'>{title}</h2>
					<button className='modal-close' onClick={onClose}>
						&times;
					</button>
				</div>
				<div className='modal-body'>{children}</div>
			</div>
		</div>
	)
}
