import { z } from 'zod';
const amount = z.number().finite().min(-1_000_000_000).max(1_000_000_000);
const positive = z.number().finite().min(0).max(1_000_000_000);
const entry = z.object({ id: z.string().min(1).max(150), amount: positive, note: z.string().max(500).optional() });
const person = z.object({ id: z.string().min(1).max(150), name: z.string().trim().min(1).max(150), entries: z.array(entry).max(1000) });
export const snapshotPayload = z.object({
  date: z.string().datetime({ offset: true }),
  bank: amount, ofii: amount, redotpay: amount, cash: amount,
  people: z.array(person).max(1000), liabilities: z.array(person).max(1000),
  gold: z.object({ grams: positive, karat: z.number().int().min(1).max(24), pricePerGram: positive }),
  note: z.string().max(2000).optional(),
});
export const settingsPayload = z.object({ monthlyBudget: positive.nullable(), defaultKarat: z.number().int().min(1).max(24), defaultGrams: positive, onboarded: z.boolean() });
export const goldPricePayload = z.object({ pricePerGram: positive.refine(v => v > 0), date: z.string().datetime({ offset: true }) });
