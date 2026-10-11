"use client";

import { useMemo, useState, type FormEvent } from "react";

import { useSpendly } from "@/app/spendly-provider";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import {
  FieldLabel,
  FieldMessage,
  Select,
  TextInput,
} from "@/components/ui/form-fields";
import type { Category } from "@/features/categories/models/category";
import {
  CategoryIcon,
  categoryColorKeys,
  categoryIconKeys,
  resolveCategoryColor,
} from "@/features/categories/ui/category-visuals";
import { cn } from "@/lib/cn";

const DEFAULT_COLOR_TOKEN = "sky";
const DEFAULT_ICON = "dots";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function CategoryManager() {
  const {
    categories,
    expenses,
    createCategory,
    updateCategory,
    removeCategory,
    isSeededCategory,
    pushToast,
  } = useSpendly();

  const usageById = useMemo(() => {
    const counts = new Map<string, number>();
    for (const expense of expenses) {
      counts.set(expense.categoryId, (counts.get(expense.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [expenses]);

  const customCount = useMemo(
    () => categories.filter((c) => !isSeededCategory(c.id)).length,
    [categories, isSeededCategory],
  );

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [colorToken, setColorToken] = useState(DEFAULT_COLOR_TOKEN);
  const [icon, setIcon] = useState(DEFAULT_ICON);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const previewColor = resolveCategoryColor(colorToken);

  function openAdd() {
    setEditing(null);
    setName("");
    setColorToken(DEFAULT_COLOR_TOKEN);
    setIcon(DEFAULT_ICON);
    setNameError(null);
    setEditorOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setName(category.name);
    setColorToken(category.colorToken);
    setIcon(category.icon);
    setNameError(null);
    setEditorOpen(true);
  }

  function validateName(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return "Name is required";
    }
    if (trimmed.length > 40) {
      return "Name is too long (40 characters maximum)";
    }
    return null;
  }

  function uniqueSlug(base: string): string {
    const taken = new Set(categories.map((c) => c.slug));
    if (!taken.has(base)) {
      return base;
    }
    let suffix = 2;
    while (taken.has(`${base}-${suffix}`)) {
      suffix += 1;
    }
    return `${base}-${suffix}`;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateName(name);
    setNameError(error);
    if (error) {
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateCategory(editing.id, {
          name: name.trim(),
          colorToken,
          icon,
        });
      } else {
        await createCategory({
          name: name.trim(),
          slug: uniqueSlug(slugify(name) || "category"),
          colorToken,
          icon,
        });
      }
      setEditorOpen(false);
    } catch {
      pushToast({
        kind: "error",
        title: editing ? "Couldn't update category" : "Couldn't add category",
        description: "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) {
      return;
    }
    setDeleting(true);
    try {
      await removeCategory(pendingDelete.id);
      setPendingDelete(null);
    } catch {
      pushToast({
        kind: "error",
        title: "Couldn't delete category",
        description: "It may be in use or set as a default category.",
      });
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          <span className="font-medium text-[var(--color-foreground)] tabular-nums">
            {categories.length}
          </span>{" "}
          {categories.length === 1 ? "category" : "categories"} ·{" "}
          <span className="font-medium text-[var(--color-foreground)] tabular-nums">
            {customCount}
          </span>{" "}
          custom
        </p>
        <Button className="h-9 px-3.5 text-xs" onClick={openAdd}>
          Add category
        </Button>
      </div>

      <ul className="grid gap-2.5">
        {categories.map((category) => {
          const usage = usageById.get(category.id) ?? 0;
          const seeded = isSeededCategory(category.id);
          const inUse = usage > 0;
          const color = resolveCategoryColor(category.colorToken);
          const deleteHint = seeded
            ? "Default categories can't be deleted"
            : inUse
              ? `Used by ${usage} ${usage === 1 ? "expense" : "expenses"}`
              : undefined;

          return (
            <li
              key={category.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden
                  className={cn(
                    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    color.softBg,
                    color.fg,
                  )}
                >
                  <CategoryIcon icon={category.icon} size={16} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--color-foreground)]">
                    {category.name}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {seeded ? "Default" : "Custom"} ·{" "}
                    {inUse
                      ? `${usage} ${usage === 1 ? "expense" : "expenses"}`
                      : "No expenses"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  className="h-9 px-3 text-xs"
                  aria-label={`Edit ${category.name}`}
                  onClick={() => openEdit(category)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  className="h-9 px-3 text-xs text-[var(--color-danger)]"
                  aria-label={`Delete ${category.name}`}
                  title={deleteHint}
                  disabled={seeded || inUse}
                  onClick={() => setPendingDelete(category)}
                >
                  Delete
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-xs leading-5 text-[var(--color-muted-foreground)]">
        Default categories can be renamed but not removed. A category that is
        used by expenses cannot be deleted — move or delete those expenses
        first.
      </p>

      <Dialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        size="sm"
        title={editing ? "Edit category" : "Add category"}
        description={
          editing
            ? "Rename this category or update how it looks. Existing expenses keep their link."
            : "Create a category to organize future expenses."
        }
        initialFocus="#settings-cat-name"
      >
        <form
          onSubmit={(event) => void handleSubmit(event)}
          noValidate
          className="space-y-4"
          aria-label={editing ? "Edit category" : "Add category"}
        >
          <div className="space-y-1.5">
            <FieldLabel htmlFor="settings-cat-name" required>
              Name
            </FieldLabel>
            <TextInput
              id="settings-cat-name"
              name="name"
              maxLength={40}
              placeholder="e.g. Pets"
              value={name}
              required
              aria-invalid={Boolean(nameError)}
              aria-describedby={
                nameError ? "settings-cat-name-error" : undefined
              }
              onChange={(event) => {
                setName(event.target.value);
                if (nameError) {
                  setNameError(validateName(event.target.value));
                }
              }}
            />
            {nameError ? (
              <FieldMessage id="settings-cat-name-error">
                {nameError}
              </FieldMessage>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="settings-cat-color">Color</FieldLabel>
              <Select
                id="settings-cat-color"
                name="color"
                value={colorToken}
                onChange={(event) => setColorToken(event.target.value)}
              >
                {categoryColorKeys.map((key) => (
                  <option key={key} value={key}>
                    {capitalize(key)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <FieldLabel htmlFor="settings-cat-icon">Icon</FieldLabel>
              <Select
                id="settings-cat-icon"
                name="icon"
                value={icon}
                onChange={(event) => setIcon(event.target.value)}
              >
                {categoryIconKeys.map((key) => (
                  <option key={key} value={key}>
                    {capitalize(key)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold tracking-wide text-[var(--color-foreground)]">
              Preview
            </p>
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-foreground)]",
                previewColor.border,
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full",
                  previewColor.softBg,
                  previewColor.fg,
                )}
              >
                <CategoryIcon icon={icon} size={16} />
              </span>
              <span className="font-medium">{name.trim() || "Category name"}</span>
            </span>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              disabled={saving}
              onClick={() => setEditorOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Saving…"
                : editing
                  ? "Save changes"
                  : "Add category"}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        confirming={deleting}
        title="Delete category?"
        confirmLabel="Delete"
        cancelLabel="Keep it"
        description={
          pendingDelete
            ? `"${pendingDelete.name}" will be permanently removed. It isn't used by any expenses, so nothing else changes. This can't be undone.`
            : null
        }
      />
    </div>
  );
}
