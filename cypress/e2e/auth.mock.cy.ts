/**
 * Tests de autenticación con mocks (sin backend real).
 *
 * Cubre:
 * - Renderizado del formulario de login
 * - Login exitoso (mock de POST /api/auth/login)
 * - Login con credenciales incorrectas (mock de error 401)
 * - Redireccion desde ruta protegida sin sesión
 * - Redirección si ya hay sesión (PublicOnlyRoutes)
 * - Renderizado del formulario de registro
 * - Registro exitoso (mock de POST /api/auth/register)
 * - Registro con email duplicado (mock de error 400)
 * - Validación local de contraseñas distintas
 * - Logout
 */
describe('Auth — con mocks', () => {
	// Respuesta estándar de login/register
	const mockAuthResponse = {
		user: { id: 1, email: 'test@test.com', name: 'Test User', role: 'USER' },
		token:
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjk5OTk5OTk5OTl9.mock-signature',
	}

	beforeEach(() => {
		// Interceptar invitaciones pendientes (necesario para el layout principal)
		cy.stubHouseholdInterceptors()
		cy.intercept('GET', '/api/alerts*', { body: [] }).as('getAlerts')
	})

	// ── Formulario de login ────────────────────────────────────────────────────

	describe('Formulario de Login', () => {
		beforeEach(() => {
			cy.visit('/login')
		})

		it('muestra el formulario de login correctamente', () => {
			cy.get('input[type="email"]').should('be.visible')
			cy.get('input[type="password"]').should('be.visible')
			cy.get('button[type="submit"]').should('be.visible')
		})

		it('tiene el campo de email vacío al cargar', () => {
			cy.get('input[type="email"]').should('have.value', '')
		})

		it('navega a la página de registro al hacer clic en el enlace', () => {
			cy.contains('a', /regístr/i).click()
			cy.url().should('include', '/register')
		})
	})

	// ── Login exitoso ──────────────────────────────────────────────────────────

	describe('Login exitoso', () => {
		beforeEach(() => {
			cy.intercept('POST', '/api/auth/login', { body: mockAuthResponse, statusCode: 200 }).as(
				'loginRequest'
			)
			cy.intercept('GET', '/api/recipes*', { body: { data: [], total: 0 } }).as('getRecipes')
			cy.intercept('GET', '/api/recipes/authors', { body: [] }).as('getAuthors')
			cy.intercept('GET', '/api/ingredient-tags*', { body: [] }).as('getTags')
			cy.visit('/login')
		})

		it('redirige a /recipes tras un login correcto', () => {
			cy.get('input[type="email"]').type('test@test.com')
			cy.get('input[type="password"]').type('password123')
			cy.get('button[type="submit"]').click()

			cy.wait('@loginRequest')
			cy.url().should('include', '/recipes')
		})

		it('guarda el token en localStorage tras el login', () => {
			cy.get('input[type="email"]').type('test@test.com')
			cy.get('input[type="password"]').type('password123')
			cy.get('button[type="submit"]').click()

			cy.wait('@loginRequest')
			cy.window().then((win) => {
				expect(win.localStorage.getItem('token')).to.equal(mockAuthResponse.token)
			})
		})
	})

	// ── Login con error ────────────────────────────────────────────────────────

	describe('Login con credenciales incorrectas', () => {
		beforeEach(() => {
			cy.intercept('POST', '/api/auth/login', {
				statusCode: 401,
				body: { error: 'Credenciales inválidas' },
			}).as('loginError')
			cy.visit('/login')
		})

		it('muestra mensaje de error cuando las credenciales son incorrectas', () => {
			cy.get('input[type="email"]').type('wrong@test.com')
			cy.get('input[type="password"]').type('wrongpassword')
			cy.get('button[type="submit"]').click()

			cy.wait('@loginError')
			cy.get('.auth-error').should('be.visible')
		})

		it('no redirige a /recipes cuando falla el login', () => {
			cy.get('input[type="email"]').type('wrong@test.com')
			cy.get('input[type="password"]').type('wrongpassword')
			cy.get('button[type="submit"]').click()

			cy.wait('@loginError')
			cy.url().should('include', '/login')
		})
	})

	// ── Guard: rutas protegidas ────────────────────────────────────────────────

	describe('Guard de rutas protegidas', () => {
		it('redirige a /login si no hay sesión', () => {
			cy.visit('/recipes')
			cy.url().should('include', '/login')
		})

		it('redirige a /login al intentar acceder a /ingredients sin sesión', () => {
			cy.visit('/ingredients')
			cy.url().should('include', '/login')
		})

		it('accede a /recipes si hay sesión válida en localStorage', () => {
			cy.intercept('GET', '/api/recipes*', { body: { data: [], total: 0 } }).as('getRecipes')
			cy.intercept('GET', '/api/recipes/authors', { body: [] }).as('getAuthors')
			cy.intercept('GET', '/api/ingredient-tags*', { body: [] }).as('getTags')

			cy.stubSession()
			cy.visit('/recipes')
			cy.url().should('include', '/recipes')
		})
	})

	// ── Guard: rutas públicas ──────────────────────────────────────────────────

	describe('Guard de rutas públicas (PublicOnlyRoutes)', () => {
		it('redirige a /recipes si ya hay sesión y se visita /login', () => {
			cy.intercept('GET', '/api/recipes*', { body: { data: [], total: 0 } }).as('getRecipes')
			cy.intercept('GET', '/api/recipes/authors', { body: [] }).as('getAuthors')
			cy.intercept('GET', '/api/ingredient-tags*', { body: [] }).as('getTags')

			cy.stubSession()
			cy.visit('/login')
			cy.url().should('include', '/recipes')
		})

		it('redirige a /recipes si ya hay sesión y se visita /register', () => {
			cy.intercept('GET', '/api/recipes*', { body: { data: [], total: 0 } }).as('getRecipes')
			cy.intercept('GET', '/api/recipes/authors', { body: [] }).as('getAuthors')
			cy.intercept('GET', '/api/ingredient-tags*', { body: [] }).as('getTags')

			cy.stubSession()
			cy.visit('/register')
			cy.url().should('include', '/recipes')
		})
	})

	// ── Formulario de registro ─────────────────────────────────────────────────

	describe('Formulario de registro', () => {
		beforeEach(() => {
			cy.visit('/register')
		})

		it('muestra el formulario de registro correctamente', () => {
			cy.get('input[placeholder="Tu nombre"]').should('be.visible')
			cy.get('input[type="email"]').should('be.visible')
			cy.get('input[type="password"]').first().should('be.visible')
		})

		it('navega a la página de login al hacer clic en el enlace', () => {
			cy.contains('a', /inicia sesión|ya tienes cuenta/i).click()
			cy.url().should('include', '/login')
		})
	})

	// ── Registro exitoso ───────────────────────────────────────────────────────

	describe('Registro exitoso', () => {
		beforeEach(() => {
			cy.intercept('POST', '/api/auth/register', { body: mockAuthResponse, statusCode: 201 }).as(
				'registerRequest'
			)
			cy.intercept('GET', '/api/recipes*', { body: { data: [], total: 0 } }).as('getRecipes')
			cy.intercept('GET', '/api/recipes/authors', { body: [] }).as('getAuthors')
			cy.intercept('GET', '/api/ingredient-tags*', { body: [] }).as('getTags')
			cy.visit('/register')
		})

		it('redirige a /recipes tras un registro exitoso', () => {
			cy.get('input[placeholder="Tu nombre"]').type('Test User')
			cy.get('input[type="email"]').type('new@test.com')
			cy.get('input[type="password"]').first().type('password123')
			cy.get('input[type="password"]').last().type('password123')
			cy.get('button[type="submit"]').click()

			cy.wait('@registerRequest')
			cy.url().should('include', '/recipes')
		})
	})

	// ── Registro con email duplicado ───────────────────────────────────────────

	describe('Registro con email duplicado', () => {
		beforeEach(() => {
			cy.intercept('POST', '/api/auth/register', {
				statusCode: 400,
				body: { error: 'El email ya está registrado' },
			}).as('registerDuplicate')
			cy.visit('/register')
		})

		it('muestra mensaje de error si el email ya está registrado', () => {
			cy.get('input[placeholder="Tu nombre"]').type('Otro Usuario')
			cy.get('input[type="email"]').type('existing@test.com')
			cy.get('input[type="password"]').first().type('password123')
			cy.get('input[type="password"]').last().type('password123')
			cy.get('button[type="submit"]').click()

			cy.wait('@registerDuplicate')
			cy.get('.auth-error').should('be.visible')
		})

		it('permanece en /register si el email ya existe', () => {
			cy.get('input[placeholder="Tu nombre"]').type('Otro Usuario')
			cy.get('input[type="email"]').type('existing@test.com')
			cy.get('input[type="password"]').first().type('password123')
			cy.get('input[type="password"]').last().type('password123')
			cy.get('button[type="submit"]').click()

			cy.wait('@registerDuplicate')
			cy.url().should('include', '/register')
		})
	})

	// ── Logout ─────────────────────────────────────────────────────────────────

	describe('Logout', () => {
		beforeEach(() => {
			cy.intercept('GET', '/api/recipes*', { body: { data: [], total: 0 } }).as('getRecipes')
			cy.intercept('GET', '/api/recipes/authors', { body: [] }).as('getAuthors')
			cy.intercept('GET', '/api/ingredient-tags*', { body: [] }).as('getTags')

			cy.stubSession()
			cy.visit('/recipes')
		})

		it('limpia localStorage al hacer logout', () => {
			// Busca el elemento de logout (icono/botón en el header)
			cy.get('[data-testid="user-menu"], .user-menu, .nav-user').first().click()
			cy.contains(/cerrar sesión|logout/i).click()

			cy.window().then((win) => {
				expect(win.localStorage.getItem('token')).to.be.null
				expect(win.localStorage.getItem('user')).to.be.null
			})
		})

		it('redirige a /login tras hacer logout', () => {
			cy.get('[data-testid="user-menu"], .user-menu, .nav-user').first().click()
			cy.contains(/cerrar sesión|logout/i).click()

			cy.url().should('include', '/login')
		})
	})
})
