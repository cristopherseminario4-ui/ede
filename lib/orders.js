// Base de datos local SQLite (módulo nativo de Node, sin dependencias). Archivo: data/ede.db
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const nodeRequire = createRequire(import.meta.url); // evita que el bundler intente empaquetar node:sqlite
const FILE = path.join(process.cwd(), "data", "ede.db");

function open() {
  if (globalThis.__edeDb2) return globalThis.__edeDb2;
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
  ]) if (!have.has(col)) db.exec(`ALTER TABLE orders ADD COLUMN ${col} ${ddl}`);
  db.exec("CREATE INDEX IF NOT EXISTS idx_orders_token ON orders(public_token)");
  globalThis.__edeDb2 = db;
  return db;
}

const toObj = (r) =>
  r && {
    code: r.code, zone: r.zone, price: r.price, currency: r.currency, nombre: r.nombre, dni: r.dni,
    telefono: r.telefono, correo: r.correo, comprobante: r.comprobante, ruc: r.ruc, razonSocial: r.razon_social,
    termsVersion: r.terms_version, acceptedAt: r.accepted_at, status: r.status, mpPaymentId: r.mp_payment_id,
    createdAt: r.created_at, paidAt: r.paid_at,
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
       terms_version, accepted_at, status, created_at, public_token)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(o.code, o.zone, o.price, o.currency || "PEN", o.nombre, o.dni, o.telefono, o.correo, o.comprobante,
    o.ruc || null, o.razonSocial || null, o.termsVersion, o.acceptedAt, o.status || "pending", o.createdAt, o.publicToken || crypto.randomBytes(18).toString("base64url"));
  return getOrder(o.code);
}

export const getOrder = (code) => toObj(open().prepare("SELECT * FROM orders WHERE code = ?").get(code)) || null;

const FIELD = {
  status: "status", mpPaymentId: "mp_payment_id", paidAt: "paid_at",
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
     WHERE status IN ('paid','paid-demo') OR (status = 'pending' AND created_at > ?)
     GROUP BY zone`
  ).all(since);
  return Object.fromEntries(rows.map((r) => [r.zone, r.n]));
}

export const hasPaidDni = (zone, dni) =>
  !!open().prepare("SELECT 1 FROM orders WHERE zone = ? AND dni = ? AND status = 'paid'").get(zone, dni);

// El pase público se busca por token largo e impredecible (nunca por el código corto del pedido)
export const getOrderByToken = (t) =>
  typeof t === "string" && t.length >= 20 ? toObj(open().prepare("SELECT * FROM orders WHERE public_token = ?").get(t)) || null : null;

// Pedidos pendientes recientes del mismo documento o correo (evita acaparar cupos)
export const pendingRecent = (dni, correo) =>
  open().prepare("SELECT COUNT(*) AS n FROM orders WHERE status = 'pending' AND created_at > ? AND (dni = ? OR correo = ?)")
    .get(new Date(Date.now() - 30 * 60 * 1000).toISOString(), dni, correo).n;
