import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

describe('ConfirmDialog', () => {
	const defaultProps = {
		isOpen: true,
		title: 'Test Title',
		message: 'Test Message',
		onConfirm: vi.fn(),
		onCancel: vi.fn(),
	}

	it('renders when isOpen is true', () => {
		render(<ConfirmDialog {...defaultProps} />)

		expect(screen.getByText('Test Title')).toBeInTheDocument()
		expect(screen.getByText('Test Message')).toBeInTheDocument()
	})

	it('does not render when isOpen is false', () => {
		render(<ConfirmDialog {...defaultProps} isOpen={false} />)

		expect(screen.queryByText('Test Title')).not.toBeInTheDocument()
	})

	it('shows custom button text', () => {
		render(<ConfirmDialog {...defaultProps} confirmText='Delete' cancelText='Keep' />)

		expect(screen.getByText('Delete')).toBeInTheDocument()
		expect(screen.getByText('Keep')).toBeInTheDocument()
	})

	it('calls onConfirm when confirm button is clicked', async () => {
		const user = userEvent.setup()
		const onConfirm = vi.fn()

		render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />)

		await user.click(screen.getByText('Confirmar'))

		expect(onConfirm).toHaveBeenCalledTimes(1)
	})

	it('calls onCancel when cancel button is clicked', async () => {
		const user = userEvent.setup()
		const onCancel = vi.fn()

		render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />)

		await user.click(screen.getByText('Cancelar'))

		expect(onCancel).toHaveBeenCalledTimes(1)
	})

	it('calls onCancel when overlay is clicked', async () => {
		const user = userEvent.setup()
		const onCancel = vi.fn()

		render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />)

		const overlay = document.querySelector('.confirm-dialog-overlay')
		if (overlay) {
			await user.click(overlay)
		}

		expect(onCancel).toHaveBeenCalled()
	})

	it('shows danger icon for danger type', () => {
		render(<ConfirmDialog {...defaultProps} type='danger' />)

		expect(screen.getByText('⚠️')).toBeInTheDocument()
	})

	it('shows info icon for info type', () => {
		render(<ConfirmDialog {...defaultProps} type='info' />)

		expect(screen.getByText('ℹ️')).toBeInTheDocument()
	})
})
