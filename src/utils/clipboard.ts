export async function copyTextToClipboard(text: string): Promise<void> {
	if (navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(text)
			return
		} catch {
			// Some mobile browsers expose the API but reject it outside a secure context.
		}
	}

	const textarea = document.createElement('textarea')
	textarea.value = text
	textarea.setAttribute('readonly', '')
	textarea.style.position = 'fixed'
	textarea.style.inset = '0 auto auto -9999px'
	textarea.style.opacity = '0'
	document.body.appendChild(textarea)

	try {
		textarea.focus()
		textarea.select()
		textarea.setSelectionRange(0, textarea.value.length)
		if (!document.execCommand?.('copy')) throw new Error('Clipboard copy failed')
	} finally {
		textarea.remove()
	}
}
