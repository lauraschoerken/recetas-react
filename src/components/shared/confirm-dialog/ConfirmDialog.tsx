import './ConfirmDialog.scss'

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { InfoIcon, WarningIcon } from '@/components/shared/icons'

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
	confirmText,
	cancelText,
	type = 'danger',
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	const { t } = useTranslation()
	const resolvedConfirmText = confirmText ?? t('confirm')
	const resolvedCancelText = cancelText ?? t('cancel')
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
				return <WarningIcon size={28} aria-hidden='true' />
			case 'warning':
				return <WarningIcon size={28} aria-hidden='true' />
			case 'info':
				return <InfoIcon size={28} aria-hidden='true' />
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
						{resolvedCancelText}
					</button>
					<button
						className={`btn btn-${type === 'danger' ? 'danger' : 'primary'}`}
						onClick={onConfirm}>
						{resolvedConfirmText}
					</button>
				</div>
			</div>
		</div>
	)
}
