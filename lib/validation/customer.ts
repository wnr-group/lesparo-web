import { z } from "zod";

const text = (max: number, min = 1, msg = "This field is required.") => z.string().trim().min(min, msg).max(max);

// Trim and lowercase first, then validate, so pasted addresses with stray spaces or capitals are accepted.
export const emailField = z.string().trim().toLowerCase().max(200, "Enter a valid email address.").pipe(z.email("Enter a valid email address."));
export const phoneField = text(32, 7, "Enter a phone number.").regex(/^[0-9+()\-\s]{7,}$/, "Use digits only, with an optional country code.");

/** bcrypt only reads the first 72 bytes, so longer passwords are refused rather than silently truncated. */
export const passwordField = z
  .string()
  .min(8, "Use at least 8 characters.")
  .refine((v) => Buffer.byteLength(v) <= 72, "Use at most 72 characters.")
  .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), "Include at least one letter and one number.");

export const registerSchema = z.object({
  name: text(120, 2, "Enter your name."),
  email: emailField,
  phone: phoneField,
  password: passwordField,
  /** Honeypot: real visitors never fill this. */
  website: z.string().max(0).optional(),
});

export const loginSchema = z.object({ email: emailField, password: z.string().min(1, "Enter your password.").max(200) });
export const forgotSchema = z.object({ email: emailField });
export const resetSchema = z.object({ token: z.string().min(20).max(200), password: passwordField });
export const tokenSchema = z.object({ token: z.string().min(20).max(200) });

export const profileSchema = z.object({ name: text(120, 2, "Enter your name."), phone: phoneField });
export const emailChangeSchema = z.object({ email: emailField, currentPassword: z.string().min(1, "Enter your current password.").max(200) });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1, "Enter your current password.").max(200), newPassword: passwordField });

export const addressSchema = z.object({
  label: text(30, 1, "Give this address a name, like Home or Office."),
  fullName: text(120, 2, "Enter the recipient's name."),
  phone: phoneField,
  line: text(300, 5, "Enter the address."),
  city: text(80, 2, "Enter the city."),
  state: text(80, 2, "Enter the state."),
  postcode: text(12, 4, "Enter the PIN code.").regex(/^[0-9A-Za-z\- ]{4,12}$/, "Enter a valid PIN code."),
  isDefault: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});
export const MAX_ADDRESSES = 10;
