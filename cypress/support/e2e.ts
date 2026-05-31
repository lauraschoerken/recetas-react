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
	// Limpiar el usuario de test creado en este test.
	// Solo aplica cuando el test usó registerAndLogin (tests con API real).
	// En tests mock (stubSession), currentTestUserEmail no se establece → no hace nada.
	cy.cleanupCurrentUser()
})

// Limpiar datos de test antes de ejecutar la suite.
// Si el backend no está disponible, la task devuelve { success: false } sin fallar.
before(() => {
	cy.task<TaskResult>('cleanupAllTestData').then((result) => {
		if (result?.success) {
			cy.log(`Pre-test cleanup: ${result.message}`)
		} else {
			cy.log(`Cleanup omitido: ${result?.message ?? 'backend no disponible'}`)
		}
	})
})

// Limpiar ingredientes de test después de toda la suite.
after(() => {
	cy.task<TaskResult>('cleanupTestIngredients').then((result) => {
		if (result?.success) {
			cy.log(`Post-test cleanup: ${result.message}`)
		} else {
			cy.log(`Cleanup omitido: ${result?.message ?? 'backend no disponible'}`)
		}
	})
})

Cypress.on('uncaught:exception', (_err, _runnable) => {
	// Evitar que Cypress falle los tests por excepciones no capturadas de la app
	return false
})
