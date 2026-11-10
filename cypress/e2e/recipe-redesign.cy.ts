describe('Recipe redesign — responsive and themes', () => {
	const allViewports = [
		[390, 844],
		[768, 1024],
		[1024, 768],
		[1440, 900],
		[1920, 1080],
	] as const
	const requestedViewport = Cypress.env('visualViewport') as string | undefined
	const viewports = requestedViewport
		? allViewports.filter(([width, height]) => `${width}x${height}` === requestedViewport)
		: allViewports
	const themes = ['light', 'dark'] as const
	const testToken =
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjk5OTk5OTk5OTl9.mock-signature'
	const testUser = { id: 1, email: 'test@test.com', name: 'Test User', role: 'USER' }

	const visitAuthenticated = (path: string, theme: 'light' | 'dark') => {
		cy.visit(path, {
			onBeforeLoad(win) {
				win.localStorage.setItem('token', testToken)
				win.localStorage.setItem('user', JSON.stringify(testUser))
				win.localStorage.setItem('theme', theme)
			},
		})
	}

	const stubRecipeScreens = () => {
		// Keep this visual contract test independent from the API. Specific recipe
		// fixtures declared below take precedence over this read-only fallback.
		cy.intercept('GET', '/api/**', { body: [] })
		cy.intercept('GET', '/api/household/**', { body: [] })
		cy.intercept('GET', '/api/auth/me', { fixture: 'auth/me-response.json' })
		cy.intercept('GET', '/api/alerts/count', { body: { count: 0 } })
		cy.intercept('GET', '/api/alerts*', { body: [] })
		cy.intercept('GET', '/api/alerts/thresholds/recipes', { body: [] })
		cy.intercept('GET', '/api/ingredient-tags*', { fixture: 'ingredients/tags.json' })
		cy.intercept('GET', '/api/recipes/authors*', { fixture: 'recipes/authors.json' })
		cy.fixture('recipes/list.json').then((fixture) => {
			fixture.data[0].title =
				'Tortilla de patatas con cebolla caramelizada y hierbas frescas para compartir'
			cy.intercept('GET', '/api/recipes', { body: fixture })
			cy.intercept('GET', '/api/recipes?*', { body: fixture }).as('getRecipes')
		})
		cy.fixture('recipes/detail.json').then((fixture) => {
			fixture.title = 'Tortilla de patatas con cebolla caramelizada'
			fixture.instructions = [
				'Preparar las patatas y la cebolla en cortes regulares.',
				'Pochar a fuego medio hasta que todo esté tierno y sin dorarse en exceso.',
				'Mezclar con el huevo, cuajar por ambos lados y dejar reposar antes de servir.',
			].join('\n---\n')
			cy.intercept('GET', '/api/recipes/1', { body: fixture }).as('getRecipe')
		})
	}

	const expectNoHorizontalOverflow = () => {
		cy.wait(100)
		cy.document().then((document) => {
			expect(document.documentElement.scrollWidth).to.be.at.most(
				document.documentElement.clientWidth + 1
			)
		})
	}

	for (const theme of themes) {
		for (const [width, height] of viewports) {
			it(`${width}x${height} ${theme}: list, detail and edit stay usable`, () => {
				cy.viewport(width, height)
				stubRecipeScreens()

				visitAuthenticated('/recipes', theme)
				cy.wait('@getRecipes')
				cy.get('.recipe-list-grid').should('be.visible')
				cy.get('.item-card-title').first().should('contain.text', 'Tortilla')
				cy.get('.item-card-visibility').should('have.length.at.least', 2)
				cy.get('.item-card-bottom-bar').first().should('be.visible')
				expectNoHorizontalOverflow()
				cy.screenshot(`issue-7/list-${width}x${height}-${theme}`, { capture: 'viewport' })

				visitAuthenticated('/recipes/1', theme)
				cy.wait('@getRecipe')
				cy.get('.recipe-detail-title').should('be.visible')
				cy.get('.recipe-ingredients-list').should('be.visible')
				cy.get('.recipe-instructions').should('be.visible')
				cy.get('.recipe-detail-chip--visibility').should('be.visible')
				expectNoHorizontalOverflow()
				cy.get('.recipe-reading-sidebar').then(($ingredients) => {
					cy.get('.recipe-reading-steps').then(($steps) => {
						const ingredientsRect = $ingredients[0].getBoundingClientRect()
						const stepsRect = $steps[0].getBoundingClientRect()
						if (width >= 1024) expect(ingredientsRect.right).to.be.at.most(stepsRect.left + 1)
						else expect(ingredientsRect.top).to.be.at.most(stepsRect.top)
					})
				})
				if (width === 390 || width === 1440) {
					cy.screenshot(`issue-7/detail-${width}x${height}-${theme}`, { capture: 'viewport' })
				}

				visitAuthenticated('/recipes/1/edit', theme)
				cy.wait('@getRecipe')
				cy.get('.form-section-heading').should('have.length.at.least', 4)
				cy.get('label[for="recipe-title"]').should('be.visible')
				cy.get('.form-actions').should('be.visible')
				expectNoHorizontalOverflow()
				if (width === 390 || width === 1440) {
					cy.screenshot(`issue-7/edit-${width}x${height}-${theme}`, { capture: 'viewport' })
				}
			})
		}
	}
})
