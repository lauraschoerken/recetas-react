import '@/assets/styles/index.scss'
import '@/assets/styles/front-global.css'

import { RouterProvider } from 'react-router-dom'

import { I18nProvider } from './i18n/I18nProvider'
import { router } from './navigation/routes'
import { DialogProvider } from './utils/dialog/DialogContext'
import { ThemeProvider } from './utils/Theme/themeProvider'

export default function App() {
	return (
		<ThemeProvider>
			<I18nProvider>
				<DialogProvider>
					<RouterProvider router={router} />
				</DialogProvider>
			</I18nProvider>
		</ThemeProvider>
	)
}
