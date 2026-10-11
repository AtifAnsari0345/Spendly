import { z } from "zod";

export const ExpenseSchema = z.object({
  id: z.string().trim().min(1),
  date: z.string().date(),
  title: z.string().trim().min(1).max(120),
  amount: z.number().finite().positive().max(10_000_000),
  categoryId: z.string().trim().min(1),
  note: z.string().trim().max(500).optional().default(""),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Expense = z.infer<typeof ExpenseSchema>;

export type ExpenseFilters = {
  query?: string;
  categoryIds?: string[];
  minAmount?: number;
  maxAmount?: number;
  from?: string;
  to?: string;
  month?: number;
  year?: number;
};
