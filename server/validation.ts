import { z } from "zod";
const short = z.string().trim().min(1).max(120);
export const email = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
export const password = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(72, "Use at most 72 characters.")
  .refine(
    (v) => Buffer.byteLength(v) <= 72,
    "Password must be at most 72 UTF-8 bytes.",
  );
export const registerInput = z
  .object({ name: short, email, password, workspaceName: short })
  .strict();
export const loginInput = z
  .object({ email, password: z.string().min(1).max(200) })
  .strict();
export const recoveryInput = z
  .object({ email, password, recoveryCode: z.string().trim().min(1).max(100) })
  .strict();
export const nameInput = z.object({ name: short }).strict();
const hours = z
  .number()
  .min(0.25)
  .max(2000)
  .refine((v) => Number.isInteger(v * 4), "Use quarter-hour increments.");
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const d = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
  }, "Enter a valid calendar date.");
export const projectInput = z
  .object({
    name: short,
    client: short,
    description: z.string().trim().max(3000),
    currency: z.enum(["USD", "INR", "GBP", "EUR"]),
    budgetCents: z.number().int().min(0).max(1_000_000_000),
    rateCents: z.number().int().min(1).max(10_000_000),
    costRateCents: z.number().int().min(0).max(10_000_000),
    capacityHoursPerDay: z.number().min(1).max(24),
    dueDate: date,
    deliverables: z
      .array(
        z
          .object({
            title: short,
            description: z.string().trim().max(1600),
            hours,
            locked: z.boolean(),
            dependsOn: z.array(z.string().max(80)).max(30).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(40),
  })
  .strict()
  .refine(
    (p) => p.deliverables.reduce((s, d) => s + d.hours, 0) <= 5000,
    "Total project scope may not exceed 5,000 hours.",
  );
export const requestInput = z
  .object({ title: short, message: z.string().trim().min(10).max(4000), hours })
  .strict();
export const requestPatch = z
  .object({
    hours: hours.optional(),
    swapIds: z.array(z.string().min(1).max(80)).max(40).optional(),
    note: z.string().trim().max(1800).optional(),
    scheduleDays: z.number().int().min(0).max(365).optional(),
  })
  .strict();
export const choiceInput = z
  .object({
    choice: z.enum(["add", "swap", "defer"]),
    clientName: short,
    acknowledged: z.literal(true),
  })
  .strict();
