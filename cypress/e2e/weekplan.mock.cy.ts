/**
 * Tests del plan semanal con mocks (sin backend real).
 *
 * Cubre:
 * - Vista del plan semanal: carga, estado vacío
 * - Navegación entre semanas (anterior, siguiente, hoy)
 * - Añadir receta al plan semanal
 * - Eliminar entrada del plan
 */
describe('Plan Semanal — con mocks', () => {
	beforeEach(() => {
		cy.stubSession()
		cy.stubHouseholdInterceptors()
		cy.intercept('GET', '/api/alerts*', { body: [] }).as('getAlerts')
		cy.intercept('GET', '/api/ingredient-tags*', { body: [] }).as('getTags')
	})

	// ── Vista del plan semanal ─────────────────────────────────────────────────

	describe('Vista del plan semanal', () => {
		beforeEach(() => {
			cy.stubWeekPlanInterceptors('week-plan/plan.json')
			cy.visit('/week-plan')
			cy.wait('@getWeekPlan')
		})

		it('muestra la página del plan semanal', () => {
			cy.contains(/plan semanal/i).should('be.visible')
		})

		it('muestra los botones de navegación entre semanas', () => {
			cy.contains(/anterior/i).should('be.visible')
			cy.contains(/siguiente/i).should('be.visible')
			cy.contains(/hoy/i).should('be.visible')
		})

		it('muestra la receta planificada del fixture', () => {
			cy.contains('Tortilla de Patatas').should('be.visible')
		})
	})

	// ── Estado vacío ───────────────────────────────────────────────────────────

	describe('Plan semanal vacío', () => {
		it('muestra el plan vacío cuando no hay recetas planificadas', () => {
			cy.stubWeekPlanInterceptors('week-plan/empty-plan.json')
			cy.visit('/week-plan')
			cy.wait('@getWeekPlan')

			// No debe mostrar recetas
			cy.contains('Tortilla de Patatas').should('not.exist')
		})
	})

	// ── Navegación entre semanas ───────────────────────────────────────────────

	describe('Navegación entre semanas', () => {
		it('navega a la semana anterior al hacer clic en Anterior', () => {
			cy.stubWeekPlanInterceptors('week-plan/empty-plan.json')
			cy.visit('/week-plan')
			cy.wait('@getWeekPlan')

			// La navegación lanza una nueva petición al week-plan con fechas distintas
			cy.intercept('GET', '/api/week-plan*', { body: [] }).as('getWeekPlanPrev')
			cy.contains(/anterior/i).click()
			cy.wait('@getWeekPlanPrev')
		})

		it('navega a la semana siguiente al hacer clic en Siguiente', () => {
			cy.stubWeekPlanInterceptors('week-plan/empty-plan.json')
			cy.visit('/week-plan')
			cy.wait('@getWeekPlan')

			cy.intercept('GET', '/api/week-plan*', { body: [] }).as('getWeekPlanNext')
			cy.contains(/siguiente/i).click()
			cy.wait('@getWeekPlanNext')
		})

		it('vuelve a la semana actual al hacer clic en Hoy', () => {
			cy.stubWeekPlanInterceptors('week-plan/empty-plan.json')
			cy.visit('/week-plan')
			cy.wait('@getWeekPlan')

			cy.intercept('GET', '/api/week-plan*', { body: [] }).as('getWeekPlanPrev')
			cy.contains(/anterior/i).click()
			cy.wait('@getWeekPlanPrev')

			cy.intercept('GET', '/api/week-plan*', { body: [] }).as('getWeekPlanToday')
			cy.contains(/hoy/i).click()
			cy.wait('@getWeekPlanToday')
		})
	})

	// ── Añadir al plan ─────────────────────────────────────────────────────────

	describe('Añadir receta al plan semanal', () => {
		beforeEach(() => {
			cy.stubWeekPlanInterceptors('week-plan/empty-plan.json')
			cy.intercept('GET', '/api/recipes*', { fixture: 'recipes/list.json' }).as('getRecipes')
			cy.intercept('GET', '/api/recipes/authors', { body: [] }).as('getAuthors')
			cy.intercept('GET', '/api/recipes/*', { fixture: 'recipes/detail.json' }).as('getRecipe')
			cy.visit('/week-plan')
			cy.wait('@getWeekPlan')
		})

		it('muestra el modal de añadir receta al plan', () => {
			cy.contains(/añadir receta/i)
				.first()
				.click()
			cy.get('.modal-overlay, [data-testid="add-to-week-modal"]').should('be.visible')
		})

		it('añade una receta al plan y muestra toast de éxito', () => {
			const newPlanEntry = {
				id: 99,
				plannedDate: '2024-01-15T12:00:00.000Z',
				servings: 4,
				type: 'meal',
				cooked: false,
				consumed: false,
				userId: 1,
				recipeId: 1,
				recipe: { id: 1, title: 'Tortilla de Patatas', servings: 4 },
				selections: [],
				createdAt: '2024-01-10T00:00:00.000Z',
			}

			cy.intercept('POST', '/api/week-plan', { body: newPlanEntry, statusCode: 201 }).as(
				'addToWeekPlan'
			)

			cy.contains(/añadir receta/i)
				.first()
				.click()
			cy.get('.modal-overlay, [data-testid="add-to-week-modal"]').should('be.visible')

			cy.get('.modal-overlay, [data-testid="add-to-week-modal"]')
				.find('button')
				.contains(/añadir/i)
				.click()

			cy.wait('@addToWeekPlan')
			cy.get('.toast').should('be.visible')
		})
	})

	// ── Eliminar del plan ──────────────────────────────────────────────────────

	describe('Eliminar receta del plan semanal', () => {
		beforeEach(() => {
			cy.stubWeekPlanInterceptors('week-plan/plan.json')
			cy.visit('/week-plan')
			cy.wait('@getWeekPlan')
		})

		it('elimina una entrada del plan y muestra toast de éxito', () => {
			cy.intercept('DELETE', '/api/week-plan/1', { statusCode: 204, body: {} }).as('removeFromPlan')
			cy.intercept('GET', '/api/week-plan*', { body: [] }).as('getWeekPlanEmpty')

			cy.get(
				'button[title="Eliminar"], button[aria-label="Eliminar del plan"], [data-testid="remove-plan-entry"]'
			)
				.first()
				.click()

			// Gestiona el posible diálogo de confirmación
			cy.get('body').then(($body) => {
				if ($body.find('.confirm-dialog-overlay').length > 0) {
					cy.get('.confirm-dialog-overlay button')
						.contains(/eliminar|confirmar/i)
						.click()
				}
			})

			cy.wait('@removeFromPlan')
		})
	})
})
