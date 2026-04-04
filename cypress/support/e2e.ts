/// <reference types="cypress" />

import './commands'

interface TaskResult {
	success?: boolean
	message?: string
}

beforeEach(() => {
	// Clear localStorage before each test
	cy.window().then((win) => {
		win.localStorage.clear()
	})
})

afterEach(function () {
	// Limpiar el usuario de test creado en este test
	// Solo si el test usó registerAndLogin
	cy.cleanupCurrentUser()
})

// Limpiar todos los datos de test antes de ejecutar la suite
before(() => {
	cy.task<TaskResult>('cleanupAllTestData').then((result) => {
		if (result.success) {
			cy.log(`Pre-test cleanup: ${result.message}`)
		}
	})
})

// Limpiar ingredientes de test después de toda la suite
after(() => {
	cy.task<TaskResult>('cleanupTestIngredients').then((result) => {
		if (result.success) {
			cy.log(`Post-test cleanup: ${result.message}`)
		}
	})
})

Cypress.on('uncaught:exception', (_err, _runnable) => {
	// Prevent Cypress from failing tests on uncaught exceptions
	return false
})
