// Tareas de fondo del servidor. Solo en el runtime de Node (el código de Node va aparte para que no se empaquete en "edge").
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
