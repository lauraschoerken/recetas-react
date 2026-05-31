/**
 * Tests de recetas con mocks (sin backend real).
 *
 * Cubre:
 * - Lista de recetas: carga, estado vacío, estado de carga
 * - Filtros: búsqueda, visibilidad, dificultad
 * - Paginación
 * - Navegación al detalle y al formulario
 * - Detalle de receta: datos, estado de error
 * - Crear receta: validación sin título, envío correcto
 * - Editar receta: carga de datos previos, envío
 * - Eliminar receta: confirm dialog, eliminación exitosa, error
 */
describe('Recetas — con mocks', () => {
	// ── Setup de sesión + interceptors base ────────────────────────────────────
	beforeEach(() => {
		cy.stubSession()
		cy.stubHouseholdInterceptors()
		cy.intercept('GET', '/api/alerts*', { body: [] }).as('getAlerts')
	})

	// ── Lista de recetas ───────────────────────────────────────────────────────

	describe('Lista de recetas', () => {
		beforeEach(() => {
			cy.stubRecipeInterceptors('recipes/list.json')
			cy.visit('/recipes')
			cy.wait('@getRecipes')
		})

		it('muestra la página de recetas', () => {
			cy.contains(/recetas/i).should('be.visible')
		})

		it('muestra las tarjetas de recetas del fixture', () => {
			cy.contains('Tortilla de Patatas').should('be.visible')
			cy.contains('Ensalada César').should('be.visible')
		})

		it('muestra el botón de nueva receta', () => {
			cy.contains(/nueva receta/i).should('be.visible')
		})

		it('navega al formulario de nueva receta', () => {
			cy.contains(/nueva receta/i).click()
			cy.url().should('include', '/recipes/new')
		})

		it('navega al detalle de una receta al hacer clic en ella', () => {
			cy.contains('Tortilla de Patatas').click()
			cy.url().should('match', /\/recipes\/\d+/)
		})
	})

	// ── Lista vacía ────────────────────────────────────────────────────────────

	describe('Lista de recetas vacía', () => {
		it('muestra el estado vacío cuando no hay recetas', () => {
			cy.stubRecipeInterceptors('recipes/empty-list.json')
			cy.visit('/recipes')
			cy.wait('@getRecipes')

			// El componente debe mostrar algún mensaje de estado vacío
			cy.contains(/no hay recetas|sin recetas|ninguna receta/i).should('be.visible')
		})
	})

	// ── Filtros ────────────────────────────────────────────────────────────────

	describe('Filtros de recetas', () => {
		beforeEach(() => {
			cy.stubRecipeInterceptors('recipes/list.json')
			cy.visit('/recipes')
			cy.wait('@getRecipes')
		})

		it('lanza una nueva petición al buscar por texto', () => {
			// La búsqueda genera una nueva petición con ?search=...
			cy.intercept('GET', '/api/recipes*search=tortilla*', {
				body: { data: [], total: 0 },
			}).as('searchRecipes')

			cy.get('input[type="search"], input[placeholder*="buscar" i], input[placeholder*="search" i]')
				.first()
				.type('tortilla')

			// Espera debounce + petición
			cy.wait('@searchRecipes')
		})

		it('muestra los filtros de visibilidad', () => {
			cy.contains(/visibilidad|todas|mis recetas|públicas/i).should('exist')
		})
	})

	// ── Paginación ─────────────────────────────────────────────────────────────

	describe('Paginación', () => {
		it('muestra controles de paginación cuando el total supera el pageSize', () => {
			// Fixture con 13 recetas (pageSize default = 12)
			cy.intercept('GET', '/api/recipes*', {
				body: {
					data: Array.from({ length: 12 }, (_, i) => ({
						id: i + 1,
						title: `Receta ${i + 1}`,
						description: null,
						servings: 4,
						isPublic: true,
						userId: 1,
						authorName: 'Test User',
						ingredients: [],
						components: [],
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z',
					})),
					total: 13,
				},
			}).as('getRecipesPaginated')
			cy.intercept('GET', '/api/recipes/authors', { body: [] }).as('getAuthors')
			cy.intercept('GET', '/api/ingredient-tags*', { body: [] }).as('getTags')

			cy.visit('/recipes')
			cy.wait('@getRecipesPaginated')

			// Debe haber controles de paginación
			cy.get('.pagination, [data-testid="pagination"]').should('exist')
		})
	})

	// ── Detalle de receta ──────────────────────────────────────────────────────

	describe('Detalle de receta', () => {
		beforeEach(() => {
			cy.intercept('GET', '/api/recipes/1', { fixture: 'recipes/detail.json' }).as('getRecipe')
			cy.visit('/recipes/1')
			cy.wait('@getRecipe')
		})

		it('muestra el título de la receta', () => {
			cy.contains('Tortilla de Patatas').should('be.visible')
		})

		it('muestra los ingredientes de la receta', () => {
			cy.contains('Patata').should('be.visible')
			cy.contains('Huevo').should('be.visible')
		})

		it('muestra la información nutricional', () => {
			// Debe mostrar calorías
			cy.contains(/kcal|calorías|cal/i).should('be.visible')
		})

		it('muestra el botón de editar para el propietario', () => {
			cy.contains(/editar/i).should('be.visible')
		})

		it('muestra el botón de eliminar para el propietario', () => {
			cy.contains(/eliminar/i).should('be.visible')
		})
	})

	describe('Detalle de receta — error 404', () => {
		it('muestra mensaje de error cuando la receta no existe', () => {
			cy.intercept('GET', '/api/recipes/9999', {
				statusCode: 404,
				body: { error: 'Receta no encontrada' },
			}).as('getRecipeNotFound')

			cy.visit('/recipes/9999')
			cy.wait('@getRecipeNotFound')

			cy.contains(/no encontrada|not found|error/i).should('be.visible')
		})
	})

	// ── Crear receta ───────────────────────────────────────────────────────────

	describe('Crear receta', () => {
		beforeEach(() => {
			cy.intercept('GET', '/api/ingredients*', { fixture: 'ingredients/list.json' }).as(
				'getIngredients'
			)
			cy.visit('/recipes/new')
		})

		it('muestra el formulario de creación de receta', () => {
			cy.get('input[placeholder*="Tortilla" i], input[placeholder*="nombre" i]').should(
				'be.visible'
			)
		})

		it('no envía el formulario si el título está vacío', () => {
			cy.intercept('POST', '/api/recipes', cy.spy().as('createSpy'))

			cy.get('button[type="submit"]').click()

			// Debe permanecer en /recipes/new y no enviar la petición
			cy.url().should('include', '/recipes/new')
			cy.get('@createSpy').should('not.have.been.called')
		})

		it('crea una receta y redirige tras el envío exitoso', () => {
			const createdRecipe = {
				id: 99,
				title: 'Receta Test',
				description: 'Descripción test',
				servings: 4,
				isPublic: false,
				userId: 1,
				ingredients: [],
				components: [],
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
			}

			cy.intercept('POST', '/api/recipes', { body: createdRecipe, statusCode: 201 }).as(
				'createRecipe'
			)
			cy.intercept('GET', `/api/recipes/${createdRecipe.id}`, { body: createdRecipe }).as(
				'getNewRecipe'
			)

			cy.get('input[placeholder*="Tortilla" i], input[placeholder*="nombre" i]')
				.first()
				.type('Receta Test')

			cy.get('button[type="submit"]').click()
			cy.wait('@createRecipe')

			// Debe redirigir al detalle o a la lista
			cy.url().should('not.include', '/new')
		})
	})

	// ── Editar receta ──────────────────────────────────────────────────────────

	describe('Editar receta', () => {
		beforeEach(() => {
			cy.intercept('GET', '/api/recipes/1', { fixture: 'recipes/detail.json' }).as('getRecipe')
			cy.intercept('GET', '/api/ingredients*', { fixture: 'ingredients/list.json' }).as(
				'getIngredients'
			)
			cy.visit('/recipes/1/edit')
			cy.wait('@getRecipe')
		})

		it('pre-rellena el formulario con los datos de la receta', () => {
			cy.get('input[placeholder*="Tortilla" i], input[placeholder*="nombre" i]')
				.first()
				.should('have.value', 'Tortilla de Patatas')
		})

		it('envía los cambios y redirige tras editar', () => {
			const updatedRecipe = {
				id: 1,
				title: 'Tortilla de Patatas Actualizada',
				description: 'Nueva descripción',
				servings: 4,
				isPublic: true,
				userId: 1,
				ingredients: [],
				components: [],
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			}

			cy.intercept('PUT', '/api/recipes/1', { body: updatedRecipe, statusCode: 200 }).as(
				'updateRecipe'
			)
			cy.intercept('GET', '/api/recipes/1', { body: updatedRecipe }).as('getUpdatedRecipe')

			cy.get('input[placeholder*="Tortilla" i], input[placeholder*="nombre" i]')
				.first()
				.clear()
				.type('Tortilla de Patatas Actualizada')

			cy.get('button[type="submit"]').click()
			cy.wait('@updateRecipe')

			cy.url().should('not.include', '/edit')
		})
	})

	// ── Eliminar receta ────────────────────────────────────────────────────────

	describe('Eliminar receta', () => {
		beforeEach(() => {
			cy.stubRecipeInterceptors('recipes/list.json')
			cy.visit('/recipes')
			cy.wait('@getRecipes')
		})

		it('muestra el diálogo de confirmación al intentar eliminar', () => {
			cy.intercept('GET', '/api/recipes/1', { fixture: 'recipes/detail.json' }).as('getRecipe')

			// Navegar al detalle primero
			cy.visit('/recipes/1')
			cy.wait('@getRecipe')

			cy.contains(/eliminar/i).click()
			cy.get('.confirm-dialog-overlay, [data-testid="confirm-dialog"]').should('be.visible')
		})

		it('elimina la receta y muestra toast de éxito', () => {
			cy.intercept('GET', '/api/recipes/1', { fixture: 'recipes/detail.json' }).as('getRecipe')
			cy.intercept('DELETE', '/api/recipes/1', { statusCode: 204, body: {} }).as('deleteRecipe')

			cy.visit('/recipes/1')
			cy.wait('@getRecipe')

			cy.contains(/eliminar/i).click()
			cy.get('.confirm-dialog-overlay, [data-testid="confirm-dialog"]').should('be.visible')

			// Confirmar la eliminación
			cy.get('.confirm-dialog-overlay button, [data-testid="confirm-dialog"] button')
				.contains(/eliminar|confirmar/i)
				.click()

			cy.wait('@deleteRecipe')
			cy.get('.toast').should('be.visible')
		})

		it('cancela la eliminación al hacer clic en cancelar', () => {
			cy.intercept('GET', '/api/recipes/1', { fixture: 'recipes/detail.json' }).as('getRecipe')
			cy.intercept('DELETE', '/api/recipes/1', cy.spy().as('deleteSpy'))

			cy.visit('/recipes/1')
			cy.wait('@getRecipe')

			cy.contains(/eliminar/i).click()
			cy.get('.confirm-dialog-overlay, [data-testid="confirm-dialog"]').should('be.visible')

			cy.get('.confirm-dialog-overlay button, [data-testid="confirm-dialog"] button')
				.contains(/cancelar/i)
				.click()

			cy.get('@deleteSpy').should('not.have.been.called')
			cy.url().should('include', '/recipes/1')
		})

		it('muestra toast de error si la eliminación falla en el servidor', () => {
			cy.intercept('GET', '/api/recipes/1', { fixture: 'recipes/detail.json' }).as('getRecipe')
			cy.intercept('DELETE', '/api/recipes/1', {
				statusCode: 500,
				body: { error: 'Error interno' },
			}).as('deleteError')

			cy.visit('/recipes/1')
			cy.wait('@getRecipe')

			cy.contains(/eliminar/i).click()
			cy.get('.confirm-dialog-overlay, [data-testid="confirm-dialog"]').should('be.visible')

			cy.get('.confirm-dialog-overlay button, [data-testid="confirm-dialog"] button')
				.contains(/eliminar|confirmar/i)
				.click()

			cy.wait('@deleteError')
			cy.get('.toast').should('be.visible')
		})
	})
})
