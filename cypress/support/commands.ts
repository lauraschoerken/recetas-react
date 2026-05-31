/// <reference types="cypress" />
/* eslint-disable @typescript-eslint/no-namespace */

interface TaskResult {
	success?: boolean
	message?: string
	error?: string
}

const MOCK_TOKEN =
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjk5OTk5OTk5OTl9.mock-signature'

const MOCK_USER = {
	id: 1,
	email: 'test@test.com',
	name: 'Test User',
	role: 'USER',
}

declare global {
	namespace Cypress {
		interface Chainable {
			// Comandos originales (requieren backend real)
			login(email?: string, password?: string): Chainable<void>
			logout(): Chainable<void>
			registerAndLogin(name?: string): Chainable<{ email: string; password: string }>
			cleanupUser(email: string): Chainable<void>
			cleanupCurrentUser(): Chainable<void>
			cleanupAllTestData(): Chainable<void>

			// Comandos de mock (no requieren backend)
			/** Simula una sesión autenticada escribiendo directamente en localStorage */
			stubSession(role?: 'USER' | 'ADMIN'): Chainable<void>
			/** Intercepta las llamadas de autenticación más comunes con fixtures */
			stubAuthInterceptors(): Chainable<void>
			/** Intercepta las llamadas de recetas con fixtures */
			stubRecipeInterceptors(fixture?: string): Chainable<void>
			/** Intercepta las llamadas de ingredientes con fixtures */
			stubIngredientInterceptors(fixture?: string): Chainable<void>
			/** Intercepta las llamadas de la lista de compra con fixtures */
			stubShoppingInterceptors(fixture?: string): Chainable<void>
			/** Intercepta las llamadas de almacenamiento con fixtures */
			stubHomeInterceptors(fixture?: string): Chainable<void>
			/** Intercepta las llamadas del plan semanal con fixtures */
			stubWeekPlanInterceptors(fixture?: string): Chainable<void>
			/** Intercepta invitaciones de household (pendientes vacías) */
			stubHouseholdInterceptors(): Chainable<void>
		}
	}
}

// Almacenar el email del usuario actual para limpieza
let currentTestUserEmail: string | null = null

Cypress.Commands.add('login', (email = 'test@test.com', password = 'password123') => {
	cy.visit('/login')
	cy.get('input[type="email"]').type(email)
	cy.get('input[type="password"]').type(password)
	cy.get('button[type="submit"]').click()
	cy.url().should('not.include', '/login')
})

Cypress.Commands.add('logout', () => {
	cy.window().then((win) => {
		win.localStorage.removeItem('token')
		win.localStorage.removeItem('user')
	})
	cy.visit('/login')
})

Cypress.Commands.add('registerAndLogin', (name = 'Test User') => {
	const timestamp = Date.now()
	const random = Math.random().toString(36).substring(7)
	const email = `cypress_${timestamp}_${random}@test.com`
	const password = 'password123'

	// Guardar email para limpieza posterior
	currentTestUserEmail = email

	cy.visit('/register')
	cy.get('input[placeholder="Tu nombre"]').type(name)
	cy.get('input[type="email"]').type(email)
	cy.get('input[type="password"]').first().type(password)
	cy.get('input[type="password"]').last().type(password)
	cy.get('button[type="submit"]').click()
	cy.url().should('not.include', '/register')

	return cy.wrap({ email, password })
})

Cypress.Commands.add('cleanupUser', (email: string) => {
	cy.task<TaskResult>('cleanupUser', email).then((result) => {
		if (result.error) {
			cy.log(`Cleanup warning: ${result.error}`)
		} else {
			cy.log(`Cleanup: ${result.message}`)
		}
	})
})

Cypress.Commands.add('cleanupCurrentUser', () => {
	if (currentTestUserEmail) {
		cy.task<TaskResult>('cleanupUser', currentTestUserEmail).then((result) => {
			if (result.success) {
				cy.log(`Cleaned up: ${currentTestUserEmail}`)
			}
			currentTestUserEmail = null
		})
	}
})

Cypress.Commands.add('cleanupAllTestData', () => {
	cy.task<TaskResult>('cleanupAllTestData').then((result) => {
		if (result.error) {
			cy.log(`Cleanup warning: ${result.error}`)
		} else {
			cy.log(`Cleanup: ${result.message}`)
		}
	})
})

// Exportar función para obtener el email actual (uso interno)
export function getCurrentTestUserEmail(): string | null {
	return currentTestUserEmail
}

export function setCurrentTestUserEmail(email: string | null): void {
	currentTestUserEmail = email
}

// ── Comandos de mock (sin backend) ──────────────────────────────────────────

/**
 * Escribe directamente en localStorage para simular una sesión autenticada.
 * No hace ninguna petición HTTP.
 */
Cypress.Commands.add('stubSession', (role: 'USER' | 'ADMIN' = 'USER') => {
	const user = { ...MOCK_USER, role }
	cy.window().then((win) => {
		win.localStorage.setItem('token', MOCK_TOKEN)
		win.localStorage.setItem('user', JSON.stringify(user))
	})
})

/**
 * Intercepta las peticiones de autenticación más frecuentes:
 * - GET /api/auth/me → me-response.json
 * - GET /api/household/invites/pending → [] (sin invitaciones)
 */
Cypress.Commands.add('stubAuthInterceptors', () => {
	cy.intercept('GET', '/api/auth/me', { fixture: 'auth/me-response.json' }).as('getMe')
	cy.intercept('GET', '/api/household/invites/pending', { body: [] }).as('getPendingInvites')
	cy.intercept('GET', '/api/alerts*', { body: [] }).as('getAlerts')
})

/**
 * Intercepta las peticiones de recetas.
 * @param fixture - Nombre del fixture para GET /api/recipes (default: 'recipes/list.json')
 */
Cypress.Commands.add('stubRecipeInterceptors', (fixture = 'recipes/list.json') => {
	cy.intercept('GET', '/api/recipes?*', { fixture }).as('getRecipes')
	cy.intercept('GET', '/api/recipes/authors', { fixture: 'recipes/authors.json' }).as('getAuthors')
	cy.intercept('GET', '/api/recipes/*', { fixture: 'recipes/detail.json' }).as('getRecipe')
	cy.intercept('GET', '/api/ingredient-tags*', { fixture: 'ingredients/tags.json' }).as('getTags')
})

/**
 * Intercepta las peticiones de ingredientes.
 */
Cypress.Commands.add('stubIngredientInterceptors', (fixture = 'ingredients/list.json') => {
	cy.intercept('GET', '/api/ingredients*', { fixture }).as('getIngredients')
	cy.intercept('GET', '/api/ingredient-tags*', { fixture: 'ingredients/tags.json' }).as('getTags')
	cy.intercept('GET', '/api/user-stores*', { body: [] }).as('getStores')
})

/**
 * Intercepta las peticiones de lista de compra.
 */
Cypress.Commands.add('stubShoppingInterceptors', (fixture = 'shopping/list.json') => {
	cy.intercept('GET', '/api/shopping-list*', { fixture }).as('getShoppingList')
	cy.intercept('GET', '/api/ingredient-tags*', { fixture: 'ingredients/tags.json' }).as('getTags')
	cy.intercept('GET', '/api/user-stores*', { body: [] }).as('getStores')
})

/**
 * Intercepta las peticiones del almacenamiento (home).
 */
Cypress.Commands.add('stubHomeInterceptors', (fixture = 'home/items.json') => {
	cy.intercept('GET', '/api/home*', { fixture }).as('getHomeItems')
	cy.intercept('GET', '/api/ingredient-tags*', { fixture: 'ingredients/tags.json' }).as('getTags')
})

/**
 * Intercepta las peticiones del plan semanal.
 */
Cypress.Commands.add('stubWeekPlanInterceptors', (fixture = 'week-plan/plan.json') => {
	cy.intercept('GET', '/api/week-plan*', { fixture }).as('getWeekPlan')
	cy.intercept('GET', '/api/ingredient-tags*', { fixture: 'ingredients/tags.json' }).as('getTags')
})

/**
 * Intercepta las invitaciones de household (devuelve vacío por defecto).
 */
Cypress.Commands.add('stubHouseholdInterceptors', () => {
	cy.intercept('GET', '/api/household/invites/pending', { body: [] }).as('getPendingInvites')
})

export {}
