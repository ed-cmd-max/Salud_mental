describe("Configuración inicial de Jest", () => {
  test("Jest debe ejecutar correctamente una prueba básica", () => {
    const resultado = 2 + 2;

    expect(resultado).toBe(4);
  });
});