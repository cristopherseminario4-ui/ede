// Validación común de los datos del comprador (checkout web y venta de asesor)
export function validateBuyer(b) {
  const nombre = String(b.nombre || "").trim();
  const dni = String(b.dni || "").trim();
  const telefono = String(b.telefono || "").trim();
  const correo = String(b.correo || "").trim();
  const comprobante = b.comprobante === "factura" ? "factura" : "boleta";
  const ruc = String(b.ruc || "").trim();
  const razonSocial = String(b.razonSocial || "").trim();

  if (nombre.length < 3 || nombre.length > 120) return { error: "Escribe el nombre completo." };
  if (!/^[A-Za-z0-9]{8,12}$/.test(dni)) return { error: "DNI o documento inválido." };
  if (!/^\+?[0-9 ]{7,15}$/.test(telefono)) return { error: "Teléfono inválido." };
  if (!/^\S+@\S+\.\S+$/.test(correo) || correo.length > 160) return { error: "Correo inválido." };
  if (comprobante === "factura" && (!/^\d{11}$/.test(ruc) || razonSocial.length < 3))
    return { error: "Para factura indica RUC (11 dígitos) y razón social." };

  return {
    value: {
      nombre, dni, telefono, correo, comprobante,
      ruc: comprobante === "factura" ? ruc : null,
      razonSocial: comprobante === "factura" ? razonSocial : null,
    },
  };
}

// Límite simple por clave (en memoria): n intentos por minuto
const hits = globalThis.__edeLimits || (globalThis.__edeLimits = new Map());
export function limited(key, max = 8) {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(key, list);
  return list.length > max;
}

export const clientIp = (req) => req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "local";
