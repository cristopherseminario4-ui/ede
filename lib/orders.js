// Base de datos local SQLite (módulo nativo de Node, sin dependencias). Archivo: data/ede.db
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const nodeRequire = createRequire(import.meta.url); // evita que el bundler intente empaquetar node:sqlite
const FILE = path.join(process.cwd(), "data", "ede.db");

function open() {
  if (globalThis.__edeDb5) return globalThis.__edeDb5;
  const { DatabaseSync } = nodeRequire("node:sqlite");
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const db = new DatabaseSync(FILE);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS orders (
      code TEXT PRIMARY KEY,
      zone TEXT NOT NULL,
      price INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'PEN',
      nombre TEXT NOT NULL,
      dni TEXT NOT NULL,
      telefono TEXT NOT NULL,
      correo TEXT NOT NULL,
      comprobante TEXT NOT NULL,
      ruc TEXT,
      razon_social TEXT,
      terms_version TEXT NOT NULL,
      accepted_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      mp_payment_id TEXT,
      created_at TEXT NOT NULL,
      paid_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_orders_zone_status ON orders(zone, status);
    CREATE INDEX IF NOT EXISTS idx_orders_dni ON orders(dni);
  `);
  // Migración aditiva: columnas nuevas (token público del pase y estado de sincronización con Django)
  const have = new Set(db.prepare("PRAGMA table_info(orders)").all().map((c) => c.name));
  for (const [col, ddl] of [
    ["public_token", "TEXT"], ["sync_status", "TEXT DEFAULT 'none'"], ["sync_error", "TEXT"],
    ["sync_at", "TEXT"], ["django_id", "INTEGER"],
    ["advisor_code", "TEXT"], ["advisor_name", "TEXT"], ["payment_method", "TEXT"],
    ["accept_token", "TEXT"], ["accepted_ip", "TEXT"], ["manual_ref", "TEXT"],
    ["voucher_file", "TEXT"], ["voucher_token", "TEXT"],
    ["pay_date", "TEXT"], ["pay_amount", "REAL"], ["pay_bank", "TEXT"],
  ]) if (!have.has(col)) db.exec(`ALTER TABLE orders ADD COLUMN ${col} ${ddl}`);
  db.exec("CREATE INDEX IF NOT EXISTS idx_orders_token ON orders(public_token)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_orders_accept ON orders(accept_token)");
  db.exec(`CREATE TABLE IF NOT EXISTS advisors (
    code TEXT PRIMARY KEY, name TEXT NOT NULL, pin_salt TEXT NOT NULL, pin_hash TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
  )`);
  globalThis.__edeDb5 = db;
  return db;
}

const toObj = (r) =>
  r && {
    code: r.code, zone: r.zone, price: r.price, currency: r.currency, nombre: r.nombre, dni: r.dni,
    telefono: r.telefono, correo: r.correo, comprobante: r.comprobante, ruc: r.ruc, razonSocial: r.razon_social,
    termsVersion: r.terms_version, acceptedAt: r.accepted_at, status: r.status, mpPaymentId: r.mp_payment_id,
    createdAt: r.created_at, paidAt: r.paid_at,
    advisorCode: r.advisor_code, advisorName: r.advisor_name, paymentMethod: r.payment_method,
    payDate: r.pay_date, payAmount: r.pay_amount, payBank: r.pay_bank, voucherFile: r.voucher_file, voucherToken: r.voucher_token, acceptToken: r.accept_token, acceptedIp: r.accepted_ip, manualRef: r.manual_ref,
    publicToken: r.public_token, syncStatus: r.sync_status, syncError: r.sync_error, syncAt: r.sync_at, djangoId: r.django_id,
  };

export function newCode() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const db = open();
  for (let n = 0; n < 20; n++) {
    let s = "";
    for (let i = 0; i < 4; i++) s += abc[Math.floor(Math.random() * abc.length)];
    const code = `EDE26-${s}`;
    if (!db.prepare("SELECT 1 FROM orders WHERE code = ?").get(code)) return code;
  }
  throw new Error("No se pudo generar un código único");
}

export function saveOrder(o) {
  open().prepare(
    `INSERT INTO orders (code, zone, price, currency, nombre, dni, telefono, correo, comprobante, ruc, razon_social,
       terms_version, accepted_at, status, created_at, public_token, advisor_code, advisor_name, payment_method, accept_token, manual_ref, voucher_file, voucher_token, pay_date, pay_amount, pay_bank)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(o.code, o.zone, o.price, o.currency || "PEN", o.nombre, o.dni, o.telefono, o.correo, o.comprobante,
    o.ruc || null, o.razonSocial || null, o.termsVersion, o.acceptedAt ?? "", o.status || "pending", o.createdAt,
    o.publicToken || crypto.randomBytes(18).toString("base64url"),
    o.advisorCode || null, o.advisorName || null, o.paymentMethod || "mercadopago", o.acceptToken || null, o.manualRef || null, o.voucherFile || null, o.voucherToken || null,
    o.payDate || null, o.payAmount ?? null, o.payBank || null);
  return getOrder(o.code);
}

export const getDb = () => open();
export const getOrder = (code) => toObj(open().prepare("SELECT * FROM orders WHERE code = ?").get(code)) || null;

const FIELD = {
  status: "status", mpPaymentId: "mp_payment_id", paidAt: "paid_at",
  acceptedAt: "accepted_at", acceptedIp: "accepted_ip",
  syncStatus: "sync_status", syncError: "sync_error", syncAt: "sync_at", djangoId: "django_id",
};
export function updateOrder(code, patch) {
  const keys = Object.keys(patch).filter((k) => FIELD[k]);
  if (!keys.length) return getOrder(code);
  open().prepare(`UPDATE orders SET ${keys.map((k) => `${FIELD[k]} = ?`).join(", ")} WHERE code = ?`)
    .run(...keys.map((k) => patch[k]), code);
  return getOrder(code);
}

export const listOrders = () => open().prepare("SELECT * FROM orders ORDER BY created_at DESC").all().map(toObj);

// Cupos ocupados por zona: pagados + pendientes de los últimos 30 min (reserva temporal mientras paga)
export function soldByZone() {
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const rows = open().prepare(
    `SELECT zone, COUNT(*) AS n FROM orders
     WHERE status IN ('paid','paid-demo') OR (status = 'pending' AND created_at > ?) OR (status = 'awaiting_terms' AND created_at > ?) OR status = 'in_review'
     GROUP BY zone`
  ).all(since, new Date(Date.now() - 72 * 3600 * 1000).toISOString()); // venta de asesor: 72 h para aceptar T&C
  return Object.fromEntries(rows.map((r) => [r.zone, r.n]));
}

export const hasPaidDni = (zone, dni) =>
  !!open().prepare("SELECT 1 FROM orders WHERE zone = ? AND dni = ? AND status IN ('paid','awaiting_terms','in_review')").get(zone, dni);

// El pase público se busca por token largo e impredecible (nunca por el código corto del pedido)
export const getOrderByToken = (t) =>
  typeof t === "string" && t.length >= 20 ? toObj(open().prepare("SELECT * FROM orders WHERE public_token = ?").get(t)) || null : null;

// Pedidos pendientes recientes del mismo documento o correo (evita acaparar cupos)
export const pendingRecent = (dni, correo) =>
  open().prepare("SELECT COUNT(*) AS n FROM orders WHERE status = 'pending' AND created_at > ? AND (dni = ? OR correo = ?)")
    .get(new Date(Date.now() - 30 * 60 * 1000).toISOString(), dni, correo).n;

export const getOrderByAcceptToken = (t) =>
  typeof t === "string" && t.length >= 20 ? toObj(open().prepare("SELECT * FROM orders WHERE accept_token = ?").get(t)) || null : null;

export const listOrdersByAdvisor = (code) =>
  open().prepare("SELECT * FROM orders WHERE advisor_code = ? ORDER BY created_at DESC").all(code).map(toObj);

// ── Asesores ──
const hashPin = (pin, salt) => crypto.scryptSync(String(pin), salt, 32).toString("hex");
const cleanCode = (c) => String(c || "").trim().toLowerCase();

export function createAdvisor({ code, name, pin }) {
  code = cleanCode(code);
  if (!/^[a-z0-9_-]{3,30}$/.test(code)) throw new Error("Código: 3 a 30 letras, números, guion o guion bajo");
  if (String(name || "").trim().length < 3) throw new Error("Escribe el nombre del asesor");
  if (!/^\d{4,8}$/.test(String(pin || ""))) throw new Error("El PIN debe tener de 4 a 8 dígitos");
  const salt = crypto.randomBytes(12).toString("hex");
  open().prepare("INSERT INTO advisors (code, name, pin_salt, pin_hash, active, created_at) VALUES (?,?,?,?,1,?)")
    .run(code, String(name).trim(), salt, hashPin(pin, salt), new Date().toISOString());
  return getAdvisor(code);
}
export const getAdvisor = (code) => {
  const r = open().prepare("SELECT code, name, active, created_at FROM advisors WHERE code = ?").get(cleanCode(code));
  return r ? { code: r.code, name: r.name, active: !!r.active, createdAt: r.created_at } : null;
};
export const listAdvisors = () =>
  open().prepare("SELECT code, name, active, created_at FROM advisors ORDER BY created_at DESC").all()
    .map((r) => ({ code: r.code, name: r.name, active: !!r.active, createdAt: r.created_at }));
export const setAdvisorActive = (code, active) =>
  open().prepare("UPDATE advisors SET active = ? WHERE code = ?").run(active ? 1 : 0, cleanCode(code));
export function resetAdvisorPin(code, pin) {
  if (!/^\d{4,8}$/.test(String(pin || ""))) throw new Error("El PIN debe tener de 4 a 8 dígitos");
  const salt = crypto.randomBytes(12).toString("hex");
  open().prepare("UPDATE advisors SET pin_salt = ?, pin_hash = ? WHERE code = ?").run(salt, hashPin(pin, salt), cleanCode(code));
}
export function verifyAdvisor(code, pin) {
  const r = open().prepare("SELECT * FROM advisors WHERE code = ? AND active = 1").get(cleanCode(code));
  if (!r || !pin) return null;
  const a = Buffer.from(hashPin(pin, r.pin_salt)), b = Buffer.from(r.pin_hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? { code: r.code, name: r.name } : null;
}

export const getOrderByVoucherToken = (t) =>
  typeof t === "string" && t.length >= 20 ? toObj(open().prepare("SELECT * FROM orders WHERE voucher_token = ?").get(t)) || null : null;

// ¿Ya se usó este n.º de operación con el mismo método? (evita registrar el mismo voucher dos veces)
export const opNumberUsed = (method, op) =>
  !!open().prepare("SELECT 1 FROM orders WHERE payment_method = ? AND lower(manual_ref) = lower(?) AND status != 'cancelled'").get(method, op);
