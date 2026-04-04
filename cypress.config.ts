import { defineConfig } from 'cypress'

const API_URL = 'http://localhost:3001'
const TEST_SECRET = 'cypress-test-secret'

export default defineConfig({
	e2e: {
		baseUrl: 'http://localhost:3000',
		viewportWidth: 1280,
		viewportHeight: 720,
		video: false,
		screenshotOnRunFailure: true,
		defaultCommandTimeout: 10000,

		setupNodeEvents(on, config) {
			// Task para limpiar usuario por email
			on('task', {
				async cleanupUser(email: string) {
					const response = await fetch(`${API_URL}/api/test/cleanup`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ email, secret: TEST_SECRET }),
					})
					return response.json()
				},

				async cleanupAllTestData() {
					const response = await fetch(`${API_URL}/api/test/cleanup-all-test-data`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ secret: TEST_SECRET }),
					})
					return response.json()
				},

				async cleanupTestIngredients() {
					const response = await fetch(`${API_URL}/api/test/cleanup-test-ingredients`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ secret: TEST_SECRET }),
					})
					return response.json()
				},

				log(message: string) {
					console.log(message)
					return null
				},
			})
		},
	},

	env: {
		apiUrl: API_URL,
		testSecret: TEST_SECRET,
	},
})
