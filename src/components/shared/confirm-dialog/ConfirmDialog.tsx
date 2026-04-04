import './ConfirmDialog.css'

import { useEffect } from 'react'

export interface ConfirmDialogProps {
	isOpen: boolean
	title: string
	message: string
	confirmText?: string
	cancelText?: string
	type?: 'danger' | 'warning' | 'info'
	onConfirm: () => void
	onCancel: () => void
}

export function ConfirmDialog({
	isOpen,
	title,
	message,
	confirmText = 'Confirmar',
	cancelText = 'Cancelar',
	type = 'danger',
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = ''
		}
		return () => {
			document.body.style.overflow = ''
		}
	}, [isOpen])

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!isOpen) return
			if (e.key === 'Escape') onCancel()
			if (e.key === 'Enter') onConfirm()
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [isOpen, onConfirm, onCancel])

	if (!isOpen) return null

	const getIcon = () => {
		switch (type) {
			case 'danger':
				return '⚠️'
			case 'warning':
				return '⚡'
			case 'info':
				return 'ℹ️'
		}
	}

	return (
		<div className='confirm-dialog-overlay' onClick={onCancel}>
			<div className='confirm-dialog' onClick={(e) => e.stopPropagation()}>
				<div className={`confirm-dialog-icon ${type}`}>{getIcon()}</div>
				<h3 className='confirm-dialog-title'>{title}</h3>
				<p className='confirm-dialog-message'>{message}</p>
				<div className='confirm-dialog-actions'>
					<button className='btn btn-outline' onClick={onCancel}>
						{cancelText}
					</button>
					<button
						className={`btn btn-${type === 'danger' ? 'danger' : 'primary'}`}
						onClick={onConfirm}>
						{confirmText}
					</button>
				</div>
			</div>
		</div>
	)
}
