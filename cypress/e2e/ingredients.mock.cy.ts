/**
 * Tests de ingredientes con mocks (sin backend real).
 *
 * Cubre:
 * - Lista de ingredientes: carga, estado vacío
 * - Búsqueda de ingredientes
 * - Crear ingrediente (formulario + envío)
 * - Eliminar ingrediente con confirm dialog
 */
describe('Ingredientes — con mocks', () => {
	beforeEach(() => {
		cy.stubSession()
		cy.stubHouseholdInterceptors()
		cy.intercept('GET', '/api/alerts*', { body: [] }).as('getAlerts')
	})

	// ── Lista de ingredientes ──────────────────────────────────────────────────

	describe('Lista de ingredientes', () => {
		beforeEach(() => {
			cy.stubIngredientInterceptors('ingredients/list.json')
			cy.visit('/ingredients')
			cy.wait('@getIngredients')
		})

		it('muestra la página de ingredientes', () => {
			cy.contains(/ingredientes/i).should('be.visible')
		})

		it('muestra los ingredientes del fixture', () => {
			cy.contains('Patata').should('be.visible')
			cy.contains('Huevo').should('be.visible')
			cy.contains('Lechuga').should('be.visible')
		})

		it('muestra el botón de nuevo ingrediente', () => {
			cy.contains(/nuevo ingrediente/i).should('be.visible')
		})
	})

	describe('Lista de ingredientes vacía', () => {
		it('muestra el estado vacío cuando no hay ingredientes', () => {
			cy.stubIngredientInterceptors('ingredients/empty-list.json')
			cy.visit('/ingredients')
			cy.wait('@getIngredients')

			cy.contains(/sin ingredientes|no hay ingredientes|no se encontraron/i).should('be.visible')
		})
	})

	// ── Búsqueda ───────────────────────────────────────────────────────────────

	describe('Búsqueda de ingredientes', () => {
		it('filtra ingredientes localmente al escribir en el buscador', () => {
			cy.stubIngredientInterceptors('ingredients/list.json')
			cy.visit('/ingredients')
			cy.wait('@getIngredients')

			cy.get('input[type="search"], input[placeholder*="buscar" i], input[placeholder*="search" i]')
				.first()
				.type('patata')

			// Los resultados visibles deben contener "Patata"
			cy.contains('Patata').should('be.visible')
		})
	})

	// ── Crear ingrediente ──────────────────────────────────────────────────────

	describe('Crear ingrediente', () => {
		beforeEach(() => {
			cy.stubIngredientInterceptors('ingredients/list.json')
			cy.visit('/ingredients')
			cy.wait('@getIngredients')
		})

		it('abre el formulario al hacer clic en nuevo ingrediente', () => {
			cy.contains(/nuevo ingrediente/i).click()
			cy.get('form, [role="dialog"]').should('be.visible')
		})

		it('crea un ingrediente y muestra toast de éxito', () => {
			const newIngredient = {
				id: 10,
				name: 'Tomate',
				unit: 'g',
				status: 'PRIVATE',
				calories: 18,
				protein: 0.9,
				carbs: 3.9,
				fat: 0.2,
				fiber: 1.2,
				variants: [],
				conversions: [],
			}

			cy.intercept('POST', '/api/ingredients', { body: newIngredient, statusCode: 201 }).as(
				'createIngredient'
			)
			// La lista se recarga tras crear
			cy.intercept('GET', '/api/ingredients*', {
				body: [newIngredient],
			}).as('getIngredientsRefresh')

			cy.contains(/nuevo ingrediente/i).click()

			cy.get('input[placeholder*="Nombre del ingrediente" i], input[placeholder*="nombre" i]').type(
				'Tomate'
			)

			cy.contains(/crear ingrediente/i).click()

			cy.wait('@createIngredient')
			cy.get('.toast').should('be.visible')
		})

		it('no envía el formulario si el nombre está vacío', () => {
			cy.intercept('POST', '/api/ingredients', cy.spy().as('createSpy'))

			cy.contains(/nuevo ingrediente/i).click()
			cy.contains(/crear ingrediente/i).click()

			cy.get('@createSpy').should('not.have.been.called')
		})
	})

	// ── Eliminar ingrediente ───────────────────────────────────────────────────

	describe('Eliminar ingrediente', () => {
		beforeEach(() => {
			cy.stubIngredientInterceptors('ingredients/list.json')
			cy.visit('/ingredients')
			cy.wait('@getIngredients')
		})

		it('muestra diálogo de confirmación al eliminar', () => {
			cy.intercept('DELETE', '/api/ingredients/1', { statusCode: 204, body: {} }).as(
				'deleteIngredient'
			)

			// Buscar el botón de eliminar del primer ingrediente
			cy.get(
				'button[title="Eliminar"], button[aria-label="Eliminar"], [data-testid="delete-ingredient"]'
			)
				.first()
				.click()

			cy.get('.confirm-dialog-overlay, [data-testid="confirm-dialog"]').should('be.visible')
		})

		it('elimina el ingrediente tras confirmar', () => {
			cy.intercept('DELETE', '/api/ingredients/1', { statusCode: 204, body: {} }).as(
				'deleteIngredient'
			)
			cy.intercept('GET', '/api/ingredients*', { body: [] }).as('getIngredientsEmpty')

			cy.get(
				'button[title="Eliminar"], button[aria-label="Eliminar"], [data-testid="delete-ingredient"]'
			)
				.first()
				.click()

			cy.get('.confirm-dialog-overlay, [data-testid="confirm-dialog"]')
				.find('button')
				.contains(/eliminar|confirmar/i)
				.click()

			cy.wait('@deleteIngredient')
			cy.get('.toast').should('be.visible')
		})
	})
})
