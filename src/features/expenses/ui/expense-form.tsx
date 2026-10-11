"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";

import { isValidIsoDate, todayIsoDate } from "@/lib/id";
import { cn } from "@/lib/cn";
import { useSpendly } from "@/app/spendly-provider";
import type { Expense } from "@/features/expenses/models/expense";
import type { NewExpenseInput } from "@/features/expenses/data/factories";
import {
  DateInput,
  FieldLabel,
  FieldMessage,
  NumberInput,
  Select,
  Textarea,
  TextInput,
} from "@/components/ui/form-fields";
import { CategoryIcon, resolveCategoryColor } from "@/features/categories/ui/category-visuals";
import { Button } from "@/components/ui/button";

type ExpenseFormProps = {
  initial?: Expense;
  onSuccess?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
};

type FieldErrors = {
  date?: string;
  title?: string;
  amount?: string;
  categoryId?: string;
  note?: string;
};

/** Kept in step with the input maxLength so the counter and the input agree. */
const TITLE_MAX_LENGTH = 120;
const NOTE_MAX_LENGTH = 500;

function formatAmountForInput(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function parseAmount(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return NaN;
  }
  return Number(trimmed);
}

export function ExpenseForm({
  initial,
  onSuccess,
  onCancel,
  submitLabel,
}: ExpenseFormProps) {
  const { categories, createExpense, updateExpense, pushToast } = useSpendly();

  const defaultDate = useMemo(
    () => initial?.date ?? todayIsoDate(),
    [initial],
  );

  const [date, setDate] = useState(defaultDate);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [amount, setAmount] = useState(
    initial ? formatAmountForInput(initial.amount) : "",
  );
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const categoriesById = useMemo(() => {
    const map = new Map<string, typeof categories[number]>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  function validate(): FieldErrors {
    const nextErrors: FieldErrors = {};

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      nextErrors.title = "Title is required";
    } else if (trimmedTitle.length > TITLE_MAX_LENGTH) {
      nextErrors.title = `Title is too long (${TITLE_MAX_LENGTH} characters maximum)`;
    }

    const amountNum = parseAmount(amount);
    if (amount.trim() === "") {
      nextErrors.amount = "Amount is required";
    } else if (!Number.isFinite(amountNum)) {
      nextErrors.amount = "Enter a valid amount";
    } else if (amountNum <= 0) {
      nextErrors.amount = "Amount must be greater than 0";
    } else if (amountNum > 10_000_000) {
      nextErrors.amount = "Amount is too large";
    }

    if (!date) {
      nextErrors.date = "Date is required";
    } else if (!isValidIsoDate(date)) {
      nextErrors.date = "Enter a valid date";
    }

    if (!categoryId) {
      nextErrors.categoryId = "Select a category";
    } else if (!categoriesById.has(categoryId)) {
      nextErrors.categoryId = "Select a valid category";
    }

    if (note.trim().length > NOTE_MAX_LENGTH) {
      nextErrors.note = `Note is too long (${NOTE_MAX_LENGTH} characters maximum)`;
    }

    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      const amountNum = parseAmount(amount);
      const input: NewExpenseInput = {
        date,
        title,
        amount: amountNum,
        categoryId,
        note,
      };

      if (initial) {
        await updateExpense(initial.id, input);
      } else {
        await createExpense(input);
      }

      setDate(todayIsoDate());
      setTitle("");
      setAmount("");
      setCategoryId("");
      setNote("");
      setErrors({});
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save expense";
      pushToast({
        kind: "error",
        title: "Could not save",
        description: message.includes("Invalid")
          ? "Please review the values and try again."
          : message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4"
      aria-label={initial ? "Edit expense" : "Add expense"}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="expense-date" required>
            Date
          </FieldLabel>
          <DateInput
            id="expense-date"
            name="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            aria-invalid={Boolean(errors.date)}
            aria-describedby={errors.date ? "expense-date-error" : undefined}
          />
          {errors.date ? (
            <FieldMessage id="expense-date-error">{errors.date}</FieldMessage>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <FieldLabel htmlFor="expense-amount" required>
            Amount
          </FieldLabel>
          <NumberInput
            id="expense-amount"
            name="amount"
            placeholder="0.00"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={
              errors.amount ? "expense-amount-error" : undefined
            }
          />
          {errors.amount ? (
            <FieldMessage id="expense-amount-error">
              {errors.amount}
            </FieldMessage>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor="expense-title" required>
          Title
        </FieldLabel>
        <TextInput
          id="expense-title"
          name="title"
          type="text"
          maxLength={TITLE_MAX_LENGTH}
          placeholder="Lunch, groceries, taxi…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "expense-title-error" : undefined}
        />
        <div className="flex items-center justify-between gap-2">
          {errors.title ? (
            <FieldMessage id="expense-title-error">{errors.title}</FieldMessage>
          ) : (
            <span />
          )}
          <span className="text-[11px] text-[var(--color-muted-foreground)]">
            {title.trim().length}/{TITLE_MAX_LENGTH}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="expense-category" required>
          Category
        </FieldLabel>
        <div className="relative">
          <Select
            id="expense-category"
            name="categoryId"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            aria-invalid={Boolean(errors.categoryId)}
            aria-describedby={
              errors.categoryId ? "expense-category-error" : undefined
            }
            className="pl-11"
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </Select>
          {categoryId && categoriesById.has(categoryId) ? (
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute left-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full",
                resolveCategoryColor(
                  categoriesById.get(categoryId)!.colorToken,
                ).softBg,
                resolveCategoryColor(
                  categoriesById.get(categoryId)!.colorToken,
                ).fg,
              )}
            >
              <CategoryIcon
                icon={categoriesById.get(categoryId)!.icon}
                size={16}
              />
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {categories.slice(0, 8).map((cat) => {
            const active = categoryId === cat.id;
            const color = resolveCategoryColor(cat.colorToken);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                  active
                    ? cn(
                        color.softBg,
                        color.border,
                        "text-[var(--color-foreground)]",
                      )
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
                )}
              >
                <CategoryIcon icon={cat.icon} size={16} />
                {cat.name}
              </button>
            );
          })}
        </div>

        {errors.categoryId ? (
          <FieldMessage id="expense-category-error">
            {errors.categoryId}
          </FieldMessage>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor="expense-note">Note (optional)</FieldLabel>
        <Textarea
          id="expense-note"
          name="note"
          maxLength={NOTE_MAX_LENGTH}
          placeholder="Add details like who you were with, what for…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-describedby={errors.note ? "expense-note-error" : undefined}
          aria-invalid={Boolean(errors.note)}
        />
        <div className="flex items-center justify-between gap-2">
          {errors.note ? (
            <FieldMessage id="expense-note-error">{errors.note}</FieldMessage>
          ) : (
            <span />
          )}
          <span className="text-[11px] text-[var(--color-muted-foreground)]">
            {note.trim().length}/{NOTE_MAX_LENGTH}
          </span>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting}>
          {submitting
            ? "Saving…"
            : (submitLabel ?? (initial ? "Save changes" : "Save expense"))}
        </Button>
      </div>
    </form>
  );
}
