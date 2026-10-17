// Datos del evento. Fuente: PDF de Términos v3 + PRESENTACION EDE FINAL.pptx
export const EVENT = {
  name: "El Despertar del Emprendedor 2.0",
  short: "EDE 2.0",
  start: "2026-11-14T00:00:00-05:00",
  city: "Lima, Perú",
  whatsappVip: "51936080473", // VIP y Empresarial (T&C art. 3.02)
  whatsappGeneral: "51955200218", // corrección a mano: administrativo (por confirmar)
  email: "el.despertar.del.emprendedor@hilariogrp.com",
  ruc: "20616546474",
  termsVersion: "v3 · 16 oct 2026",
  // [POR CONFIRMAR] se asume que la preventa termina al cierre del 5/11/2026 (hora Lima)
  presaleEnds: "2026-11-05T23:59:59-05:00",
};

export const ZONES = [
  {
    id: "emprendedor",
    name: "Emprendedor",
    color: "#9b9ba6",
    presale: 150,
    regular: 200,
    seats: 780,
    days: "Día 2",
    online: true,
    perks: ["Acceso a la experiencia Full Day", "Acceso exclusivo a la conferencia", "Kit de bienvenida Emprendedor"],
  },
  {
    id: "vip",
    name: "VIP",
    color: "#f28a1a",
    presale: 1000,
    regular: 1500,
    seats: 70,
    days: "Día 1 y Día 2",
    online: true,
    perks: [
      "Almuerzo exclusivo con Vitmer Hilario",
      "Show musical de danzas regionales",
      "Show de caballos de paso",
      "Acceso a la experiencia Full Day",
      "Kit de bienvenida VIP",
      "Asiento preferencial en Zona VIP",
      "1er libro de Vitmer Hilario autografiado",
    ],
  },
  {
    id: "empresarial",
    name: "Empresarial",
    color: "#b44dff",
    presale: 1999,
    regular: 2500,
    seats: 50,
    days: "Día 1 y Día 2",
    online: true,
    perks: [
      "Experiencia de inmersión en hielo",
      "Almuerzo ejecutivo",
      "Kit de bienvenida exclusivo",
      "Show musical y show de caballos de paso",
      "Networking empresarial exclusivo",
      "Acceso a la experiencia Full Day · Asiento preferencial",
      "1er libro autografiado",
      "Acceso a bancarización con línea de hasta S/ 15,000*",
      "Asesoría grupal personalizada post-evento",
    ],
  },
];

export const SPEAKERS = [
  "Vitmer Hilario",
  "Sandro Meléndez",
  "Jair Arango",
  "César Mormontoy",
  "Javier Cubas",
  "Augusto Peñaloza",
  "Yudis Lonzoy",
];

export function currentPrice(zone, now = new Date()) {
  return now <= new Date(EVENT.presaleEnds) ? zone.presale : zone.regular;
}
export const inPresale = (now = new Date()) => now <= new Date(EVENT.presaleEnds);

// Exhibición comercial (presentación). Se gestionan con asesor, no con pago en la web.
export const STANDS = [
  { name: "Diamante", tag: "Stand + ponencia", price: 10000, color: "#c9a8ff", items: ["Stand comercial premium", "Ponencia en escenario", "5 entradas Zona VIP", "15 entradas Zona Emprendedor"] },
  { name: "Oro", tag: "Stand + publicidad", price: 4000, color: "#e8c15a", items: ["Stand comercial", "Publicidad estratégica de la marca", "2 entradas Zona VIP", "5 entradas Zona Emprendedor"] },
  { name: "Plata", tag: "Stand solo", price: 3000, color: "#b9b9c4", items: ["Stand comercial", "5 entradas Zona Emprendedor"] },
  { name: "Gastronómico", tag: "Alimentos y bebidas", price: 1500, color: "#ff6b5e", items: ["Stand para venta y exhibición de alimentos o bebidas", "3 entradas Zona Emprendedor"] },
];
