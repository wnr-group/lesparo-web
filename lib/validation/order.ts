import { z } from "zod";

export const ORDER_STATUSES = ["new", "confirmed", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = { new: "New", confirmed: "Confirmed", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" };

export const PAYMENT_STATUSES = ["pending", "paid", "refunded"] as const;
export const PAYMENT_METHODS = { cod: "Cash on delivery", online_pending: "Pay online (we will send a payment link)" } as const;

const text = (max: number, min = 1, msg = "This field is required.") => z.string().trim().min(min, msg).max(max);

export const orderItemSchema = z.object({
  productId: z.uuid(),
  size: z.string().trim().max(20).nullable().optional(),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1.").max(20, "Up to 20 per item. For larger quantities please enquire for wholesale."),
});

export const orderSchema = z.object({
  idempotencyKey: z.uuid(),
  customerName: text(120, 2, "Enter your name."),
  email: z.email("Enter a valid email address.").trim().max(200),
  phone: text(32, 7, "Enter a phone number.").regex(/^[0-9+()\-\s]{7,}$/, "Use digits only, with an optional country code."),
  addressLine: text(300, 5, "Enter your address."),
  city: text(80, 2, "Enter your city."),
  state: text(80, 2, "Enter your state."),
  postcode: text(12, 4, "Enter your PIN code.").regex(/^[0-9A-Za-z\- ]{4,12}$/, "Enter a valid PIN code."),
  notes: z.string().trim().max(500).optional().transform((v) => v || null),
  paymentMethod: z.enum(["cod", "online_pending"]),
  /** Honeypot: real visitors never fill this. */
  website: z.string().max(0).optional(),
  items: z.array(orderItemSchema).min(1, "Your cart is empty.").max(30),
});
export type OrderInput = z.infer<typeof orderSchema>;
