describe('Authentication', () => {
  describe('Login', () => {
    beforeEach(() => {
      cy.visit('/login');
    });

    it('should display login form', () => {
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="password"]').should('be.visible');
      cy.get('button[type="submit"]').should('contain', 'Entrar');
    });

    it('should show error with invalid credentials', () => {
      cy.get('input[type="email"]').type('wrong@test.com');
      cy.get('input[type="password"]').type('wrongpassword');
      cy.get('button[type="submit"]').click();
      
      cy.get('.auth-error').should('be.visible');
    });

    it('should navigate to register page', () => {
      cy.contains('Regístrate').click();
      cy.url().should('include', '/register');
    });
  });

  describe('Register', () => {
    beforeEach(() => {
      cy.visit('/register');
    });

    it('should display register form', () => {
      cy.get('input[placeholder="Tu nombre"]').should('be.visible');
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="password"]').first().should('be.visible');
    });

    it('should register a new user', () => {
      const timestamp = Date.now();
      cy.get('input[placeholder="Tu nombre"]').type('New User');
      cy.get('input[type="email"]').type(`newuser${timestamp}@test.com`);
      cy.get('input[type="password"]').first().type('password123');
      cy.get('input[type="password"]').last().type('password123');
      cy.get('button[type="submit"]').click();

      cy.url().should('include', '/recipes');
    });

    it('should show error for duplicate email', () => {
      const timestamp = Date.now();
      const email = `duplicate${timestamp}@test.com`;
      
      cy.get('input[placeholder="Tu nombre"]').type('First User');
      cy.get('input[type="email"]').type(email);
      cy.get('input[type="password"]').first().type('password123');
      cy.get('input[type="password"]').last().type('password123');
      cy.get('button[type="submit"]').click();

      cy.url().should('not.include', '/register');
      
      cy.window().then((win) => {
        win.localStorage.removeItem('token');
        win.localStorage.removeItem('user');
      });
      
      cy.visit('/register');
      
      cy.get('input[placeholder="Tu nombre"]').type('Second User');
      cy.get('input[type="email"]').type(email);
      cy.get('input[type="password"]').first().type('password123');
      cy.get('input[type="password"]').last().type('password123');
      cy.get('button[type="submit"]').click();

      cy.get('.auth-error').should('be.visible');
    });
  });

  describe('Protected Routes', () => {
    it('should redirect to login when not authenticated', () => {
      cy.visit('/recipes');
      cy.url().should('include', '/login');
    });

    it('should access protected route when authenticated', () => {
      cy.registerAndLogin();
      cy.visit('/recipes');
      cy.url().should('include', '/recipes');
    });
  });
});
