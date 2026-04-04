import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ToastContainer } from '@/components/shared/toast'

describe('ToastContainer', () => {
	const mockOnRemove = vi.fn()

	it('renders success toast correctly', () => {
		const toasts = [{ id: '1', message: 'Success message', type: 'success' as const }]

		render(<ToastContainer toasts={toasts} onRemove={mockOnRemove} />)

		expect(screen.getByText('Success message')).toBeInTheDocument()
		expect(document.querySelector('.toast-success .toast-icon svg')).toBeInTheDocument()
	})

	it('renders error toast correctly', () => {
		const toasts = [{ id: '1', message: 'Error message', type: 'error' as const }]

		render(<ToastContainer toasts={toasts} onRemove={mockOnRemove} />)

		expect(screen.getByText('Error message')).toBeInTheDocument()
		expect(document.querySelector('.toast-error .toast-icon svg')).toBeInTheDocument()
	})

	it('renders multiple toasts', () => {
		const toasts = [
			{ id: '1', message: 'First', type: 'success' as const },
			{ id: '2', message: 'Second', type: 'error' as const },
		]

		render(<ToastContainer toasts={toasts} onRemove={mockOnRemove} />)

		expect(screen.getByText('First')).toBeInTheDocument()
		expect(screen.getByText('Second')).toBeInTheDocument()
	})

	it('calls onRemove when close button is clicked', async () => {
		const user = userEvent.setup()
		const toasts = [{ id: '1', message: 'Test', type: 'info' as const }]

		render(<ToastContainer toasts={toasts} onRemove={mockOnRemove} />)

		const closeButton = screen.getByRole('button')
		await user.click(closeButton)

		expect(mockOnRemove).toHaveBeenCalledWith('1')
	})

	it('auto-removes toast after timeout', async () => {
		vi.useFakeTimers()
		const onRemove = vi.fn()
		const toasts = [{ id: '1', message: 'Auto remove', type: 'warning' as const }]

		render(<ToastContainer toasts={toasts} onRemove={onRemove} />)

		expect(screen.getByText('Auto remove')).toBeInTheDocument()

		vi.advanceTimersByTime(4000)

		expect(onRemove).toHaveBeenCalledWith('1')

		vi.useRealTimers()
	})
})
