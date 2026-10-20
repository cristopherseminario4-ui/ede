// Credenciales de Mercado Pago. Con MP_SANDBOX=1 la web usa las credenciales DE PRUEBA (no se cobra nada):
// sirve para probar el flujo completo en el servidor real y volver a producción cambiando solo el interruptor.
export const mpSandbox = () => process.env.MP_SANDBOX === "1";

export function mpToken() {
  return mpSandbox() ? process.env.MP_ACCESS_TOKEN_TEST || "" : process.env.MP_ACCESS_TOKEN || "";
}

// Link de pago: los tokens TEST- usan el sandbox; las credenciales de un USUARIO DE PRUEBA (APP_USR) usan el link normal
export const mpCheckoutUrl = (data, token) =>
  String(token).startsWith("TEST-") ? data.sandbox_init_point || data.init_point : data.init_point;

// Clave de los avisos de pago: en modo prueba, la de la aplicación del vendedor de prueba
export const mpWebhookSecret = () => (mpSandbox() ? process.env.MP_WEBHOOK_SECRET_TEST : process.env.MP_WEBHOOK_SECRET) || "";
