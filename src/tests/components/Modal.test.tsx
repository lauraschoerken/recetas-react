import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Modal } from '@/components/shared/Modal'

describe('Modal', () => {
	const defaultProps = {
		isOpen: true,
		onClose: vi.fn(),
		title: 'Test Modal',
	}

	it('renders when isOpen is true', () => {
		render(
			<Modal {...defaultProps}>
				<p>Modal content</p>
			</Modal>
		)

		expect(screen.getByText('Test Modal')).toBeInTheDocument()
		expect(screen.getByText('Modal content')).toBeInTheDocument()
	})

	it('does not render when isOpen is false', () => {
		render(
			<Modal {...defaultProps} isOpen={false}>
				<p>Modal content</p>
			</Modal>
		)

		expect(screen.queryByText('Test Modal')).not.toBeInTheDocument()
	})

	it('calls onClose when close button is clicked', async () => {
		const user = userEvent.setup()
		const onClose = vi.fn()

		render(
			<Modal {...defaultProps} onClose={onClose}>
				<p>Content</p>
			</Modal>
		)

		const closeButton = screen.getByRole('button')
		await user.click(closeButton)

		expect(onClose).toHaveBeenCalledTimes(1)
	})

	it('calls onClose when overlay is clicked', async () => {
		const user = userEvent.setup()
		const onClose = vi.fn()

		render(
			<Modal {...defaultProps} onClose={onClose}>
				<p>Content</p>
			</Modal>
		)

		const overlay = document.querySelector('.modal-overlay')
		if (overlay) {
			await user.click(overlay)
		}

		expect(onClose).toHaveBeenCalled()
	})

	it('does not close when content is clicked', async () => {
		const user = userEvent.setup()
		const onClose = vi.fn()

		render(
			<Modal {...defaultProps} onClose={onClose}>
				<p>Content</p>
			</Modal>
		)

		await user.click(screen.getByText('Content'))

		expect(onClose).not.toHaveBeenCalled()
	})

	it('renders children correctly', () => {
		render(
			<Modal {...defaultProps}>
				<form>
					<input type='text' placeholder='Test input' />
					<button type='submit'>Submit</button>
				</form>
			</Modal>
		)

		expect(screen.getByPlaceholderText('Test input')).toBeInTheDocument()
		expect(screen.getByText('Submit')).toBeInTheDocument()
	})
})
