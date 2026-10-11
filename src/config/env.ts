import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().trim().min(1).default("Spendly"),
  NEXT_PUBLIC_DEFAULT_CURRENCY: z.string().trim().min(1).default("INR"),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.string().trim().min(1).default("en-IN"),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_DEFAULT_CURRENCY: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY,
  NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
});
