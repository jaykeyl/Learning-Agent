
describe('Login Docente', () => {

    beforeEach(() => {
    cy.wait(2000); 
    });

  it('debe iniciar sesión con credenciales válidas', () => {
    cy.visit('http://localhost:5173/login');
    cy.get('input[id="login_email"]').type('docente@example.com');
    cy.get('input[id="login_password"]').type('Docente123!');
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login');
  });

  it('debe mostrar error con credenciales inválidas', () => {
    cy.visit('http://localhost:5173/login');
    cy.get('input[id="login_email"]').type('jefazo@example.com');
    cy.get('input[id="login_password"]').type('incorrecto123!');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/login');
  });
});