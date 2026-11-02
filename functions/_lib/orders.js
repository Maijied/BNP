// Cloudflare D1 order service. Internal module: not wired to public routes yet.
// All money values are integer BDT. Server-owned pricing is required.
export const PRICE_VERSION = "draft-2026-11";
const PRICES = Object.freeze({ A: 380, B: 450 });
const BRACKET_BDT = 80;
const SHIPPING = Object.freeze({ dhaka: 60, other: 120 });

export class OrderValidationError extends Error {
  constructor(message) { super(message); this.name = "OrderValidationError"; }
}

export function normalizeOrder(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new OrderValidationError("Invalid order.");
  const name = String(input.name ?? "").trim();
  const phone = String(input.phone ?? "").trim();
  const district = String(input.district ?? "").trim();
  const address = String(input.address ?? "").trim();
  const registration = String(input.reg_number_bangla ?? "").trim();
  const model = input.model;
  const quantity = input.quantity === undefined ? 1 : Number(input.quantity);
  if (name.length < 2 || name.length > 120) throw new OrderValidationError("Invalid name.");
  if (!/^01[3-9]\d{8}$/.test(phone)) throw new OrderValidationError("Invalid Bangladesh phone.");
  if (district.length < 2 || district.length > 80) throw new OrderValidationError("Invalid district.");
  if (address.length < 5 || address.length > 500) throw new OrderValidationError("Invalid address.");
  if (registration.length < 5 || registration.length > 80) throw new OrderValidationError("Invalid registration.");
  if (!Object.hasOwn(PRICES, model)) throw new OrderValidationError("Invalid plate model.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw new OrderValidationError("Invalid quantity.");
  if (typeof input.bracket !== "boolean" && input.bracket !== undefined) throw new OrderValidationError("Invalid bracket selection.");
  const bracket = input.bracket === true;
  const unitPrice = PRICES[model];
  const subtotal = quantity * (unitPrice + (bracket ? BRACKET_BDT : 0));
  const delivery = district.toLowerCase() === "dhaka" ? SHIPPING.dhaka : SHIPPING.other;
  return { name, phone, district, address, registration, model, quantity, bracket,
    unitPrice, subtotal, delivery, total: subtotal + delivery };
}

export function makeOrderIds() {
  const id = crypto.randomUUID();
  const itemId = crypto.randomUUID();
  const attemptId = crypto.randomUUID();
  const orderNumber = "BNP-" + new Date().toISOString().slice(0,10).replaceAll("-","") + "-" + id.slice(0,12).toUpperCase();
  const bridgeReference = orderNumber + "-A1";
  return { id, itemId, attemptId, orderNumber, bridgeReference };
}

// One atomic D1 batch creates the unpaid order and its pending bridge attempt.
// Caller must never mark it paid until an independently verified webhook settles.
export async function createPendingOrder(db, input) {
  if (!db || typeof db.batch !== "function") throw new Error("D1 DB binding required.");
  const o = normalizeOrder(input);
  const ids = makeOrderIds();
  const statements = [
    db.prepare("INSERT INTO orders (id,order_number,customer_name,customer_phone,district,delivery_address,subtotal_bdt,delivery_bdt,total_bdt,payment_status) VALUES (?,?,?,?,?,?,?,?,?,'unpaid')")
      .bind(ids.id,ids.orderNumber,o.name,o.phone,o.district,o.address,o.subtotal,o.delivery,o.total),
    db.prepare("INSERT INTO order_items (id,order_id,plate_type,registration_bangla,quantity,bracket,unit_price_bdt,line_total_bdt,rule_version) VALUES (?,?,?,?,?,?,?,?,?)")
      .bind(ids.itemId,ids.id,o.model === "A" ? "motorcycle_front" : "scooter_front",o.registration,o.quantity,o.bracket ? 1 : 0,o.unitPrice,o.subtotal,PRICE_VERSION),
    db.prepare("INSERT INTO payment_attempts (id,order_id,bridge_reference,amount_bdt,status) VALUES (?,?,?,?,'initiated')")
      .bind(ids.attemptId,ids.id,ids.bridgeReference,o.total),
    db.prepare("INSERT INTO order_status_history (id,order_id,to_status,actor_type,reason) VALUES (?,?,?,?,?)")
      .bind(crypto.randomUUID(),ids.id,"new","system","Order created awaiting verified payment")
  ];
  await db.batch(statements);
  return { orderNumber: ids.orderNumber, bridgeReference: ids.bridgeReference,
    attemptId: ids.attemptId, totalBdt: o.total, currency: "BDT", paymentStatus: "unpaid" };
}

// Payment bridge session creation and webhook verification belong to separate
// trusted server-side modules. This function never accepts payment status input.
