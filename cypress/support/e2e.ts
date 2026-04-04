/// <reference types="cypress" />

import './commands'

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
	cy.task('cleanupAllTestData').then((result: any) => {
		if (result.success) {
			cy.log(`Pre-test cleanup: ${result.message}`)
		}
	})
})

// Limpiar ingredientes de test después de toda la suite
after(() => {
	cy.task('cleanupTestIngredients').then((result: any) => {
		if (result.success) {
			cy.log(`Post-test cleanup: ${result.message}`)
		}
	})
})

Cypress.on('uncaught:exception', (err, runnable) => {
	// Prevent Cypress from failing tests on uncaught exceptions
	return false
})
