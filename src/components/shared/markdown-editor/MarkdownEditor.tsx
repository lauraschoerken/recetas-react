import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-markdown-preview/markdown.css'
import './MarkdownEditor.scss'

import { useEffect, useState } from 'react'
import MDEditor, { commands } from '@uiw/react-md-editor'

interface Props {
	value: string
	onChange: (value: string) => void
	placeholder?: string
	height?: number
}

function useColorMode(): 'light' | 'dark' {
	const [mode, setMode] = useState<'light' | 'dark'>(() => {
		const root = document.documentElement
		if (root.classList.contains('theme-dark')) return 'dark'
		if (root.classList.contains('theme-light')) return 'light'
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
	})

	useEffect(() => {
		const mq = window.matchMedia('(prefers-color-scheme: dark)')
		const observer = new MutationObserver(() => {
			const root = document.documentElement
			if (root.classList.contains('theme-dark')) setMode('dark')
			else if (root.classList.contains('theme-light')) setMode('light')
			else setMode(mq.matches ? 'dark' : 'light')
		})
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
		return () => observer.disconnect()
	}, [])

	return mode
}

const TOOLBAR_COMMANDS = [
	commands.bold,
	commands.italic,
	commands.strikethrough,
	commands.divider,
	commands.title1,
	commands.title2,
	commands.title3,
	commands.divider,
	commands.unorderedListCommand,
	commands.orderedListCommand,
	commands.checkedListCommand,
	commands.divider,
	commands.quote,
	commands.code,
	commands.codeBlock,
	commands.divider,
	commands.link,
]

export function MarkdownEditor({ value, onChange, placeholder, height = 220 }: Props) {
	const colorMode = useColorMode()

	return (
		<div data-color-mode={colorMode} className='md-editor-wrapper'>
			<MDEditor
				value={value}
				onChange={(val) => onChange(val ?? '')}
				preview='live'
				height={height}
				commands={TOOLBAR_COMMANDS}
				extraCommands={[]}
				textareaProps={{ placeholder }}
			/>
		</div>
	)
}
