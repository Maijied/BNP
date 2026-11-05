export type PlateModel = "A" | "B";

export type PaymentMethod = "lorahost_bridge" | "manual_bkash" | "manual_nagad";

export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed" | "refunded" | "disputed" | "pending_payment" | "verifying";

export type OrderStatus = "new" | "verification" | "production" | "qc" | "shipped" | "delivered" | "cancelled";

export interface OrderInput {
  name: string;
  shop_name?: string;
  phone: string;
  district: string;
  address: string;
  model: PlateModel;
  reg_number_bangla: string;
  reg_number_english?: string;
  quantity: number;
  bracket: boolean;
  payment_method: PaymentMethod;
  trx_id?: string;
  sender_number?: string;
}

export interface OrderRecord {
  id: string;
  order_number: string;
  created_at: string;
  name: string;
  shop_name: string | null;
  phone: string;
  district: string;
  address: string;
  model: PlateModel;
  reg_number_bangla: string;
  reg_number_english: string | null;
  quantity: number;
  bracket: boolean;
  unit_price: number;
  plate_total: number;
  bracket_total: number;
  delivery_charge: number;
  total: number;
  payment_status: PaymentStatus;
  payment_method: string;
  lora_session_id: string | null;
  lora_trx_id: string | null;
  trx_note: string | null;
  status: OrderStatus;
  notes: string | null;
}

export interface StoreSettings {
  price_a: number;
  price_b: number;
  price_preorder_a: number;
  price_preorder_b: number;
  bracket_price: number;
  delivery_dhaka: number;
  delivery_outside: number;
  urgency_text: string;
  hotline: string;
  whatsapp: string;
}
