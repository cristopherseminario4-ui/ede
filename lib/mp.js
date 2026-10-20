// Credenciales de Mercado Pago. Con MP_SANDBOX=1 la web usa las credenciales DE PRUEBA (no se cobra nada):
// sirve para probar el flujo completo en el servidor real y volver a producción cambiando solo el interruptor.
export const mpSandbox = () => process.env.MP_SANDBOX === "1";

export function mpToken() {
  return mpSandbox() ? process.env.MP_ACCESS_TOKEN_TEST || "" : process.env.MP_ACCESS_TOKEN || "";
}

// Link de pago de la preferencia: en prueba, el del entorno sandbox
export const mpCheckoutUrl = (data, token) =>
  mpSandbox() || String(token).startsWith("TEST-") ? data.sandbox_init_point || data.init_point : data.init_point;
