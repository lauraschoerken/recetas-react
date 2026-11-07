import { afterEach, describe, expect, it, vi } from 'vitest'

import { copyTextToClipboard } from '@/utils/clipboard'

describe('copyTextToClipboard', () => {
	afterEach(() => {
		vi.restoreAllMocks()
		document.querySelectorAll('textarea[readonly]').forEach((element) => element.remove())
	})

	it('uses the Clipboard API when it is available', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined)
		Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })

		await copyTextToClipboard('{"ok":true}')

		expect(writeText).toHaveBeenCalledWith('{"ok":true}')
	})

	it('falls back to execCommand when the Clipboard API is rejected', async () => {
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: { writeText: vi.fn().mockRejectedValue(new Error('Not allowed')) },
		})
		const execCommand = vi.fn().mockReturnValue(true)
		Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand })

		await copyTextToClipboard('texto de prueba')

		expect(execCommand).toHaveBeenCalledWith('copy')
		expect(document.querySelector('textarea[readonly]')).toBeNull()
	})
})
