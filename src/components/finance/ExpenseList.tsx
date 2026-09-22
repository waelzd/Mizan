import { useMemo, useState, useTransition } from "react";
import { format, isToday, isYesterday, isSameMonth } from "date-fns";
import { Pencil, Trash2, Inbox, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/lib/finance/store";
import { formatMoney } from "@/lib/finance/format";
import { CategoryIcon } from "@/lib/finance/icons";
import { cn } from "@/lib/utils";
import type { Category, Expense } from "@/lib/finance/types";

type ExpenseListProps = {
  expenses: Expense[];
  total: number;
  onEdit: (expense: Expense) => void;
  hasAny: boolean;
  onAdd: () => void;
  month: Date;
};

const FALLBACK_CATEGORY: Category = {
  id: "other",
  name: "Other",
  color: "#6b7a85",
  icon: "wallet",
};

/**
 * Safely parses an ISO-ish value into a Date.
 * Returns null for anything invalid — never throws.
 */
function safeDate(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dayLabel(iso: unknown) {
  const d = safeDate(iso);
  if (!d) return "Unknown date";
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, d MMMM yyyy");
}

export function ExpenseList({
  expenses,
  total,
  onEdit,
  hasAny,
  onAdd,
  month,
}: ExpenseListProps) {
  const categories = useFinance((s) => s.categories);
  const currency = useFinance((s) => s.currency);
  const deleteExpense = useFinance((s) => s.deleteExpense);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  // Only keep expenses whose dates are valid AND in the selected month.
  const monthExpenses = useMemo(() => {
    const monthDate = month instanceof Date ? month : new Date();
    return expenses.filter((e) => {
      const d = safeDate(e.date);
      if (!d) return false;
      return isSameMonth(d, monthDate);
    });
  }, [expenses, month]);

  // Group by yyyy-MM-dd, skipping anything with an invalid date.
  const groups = useMemo(() => {
    const map = new Map<string, { items: Expense[]; total: number }>();
    for (const e of monthExpenses) {
      const d = safeDate(e.date);
      if (!d) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0",
      )}-${String(d.getDate()).padStart(2, "0")}`;
      const bucket = map.get(key);
      if (bucket) {
        bucket.items.push(e);
        bucket.total += e.amount;
      } else {
        map.set(key, { items: [e], total: e.amount });
      }
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [monthExpenses]);

  const catOf = (id: string) => categoryById.get(id) ?? FALLBACK_CATEGORY;

  function handleDelete(id: string) {
    startTransition(() => {
      deleteExpense(id);
      setPendingDeleteId(null);
    });
  }

  const monthDate = month instanceof Date ? month : new Date();
  const monthLabel = format(monthDate, "MMMM yyyy");
  const isCurrentMonth = isSameMonth(monthDate, new Date());
  const isFutureMonth = monthDate > new Date();

  return (
    <section
      className="card-surface overflow-hidden"
      aria-label={`Expenses for ${monthLabel}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-baseline gap-2">
          <h2 className="font-display text-base font-semibold">Expenses</h2>
          <span className="text-xs font-medium text-muted-foreground">
            {monthLabel}
          </span>
          {!isCurrentMonth && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {isFutureMonth ? "Upcoming" : "Past"}
            </span>
          )}
        </div>
        <p className="numeric text-sm text-muted-foreground">
          {monthExpenses.length > 0 && (
            <span className="mr-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {monthExpenses.length}
            </span>
          )}
          <span className="font-semibold text-foreground">
            {formatMoney(total, currency)}
          </span>
        </p>
      </div>

      {/* Empty state */}
      {monthExpenses.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="relative flex size-14 items-center justify-center rounded-2xl bg-muted/60">
            <Inbox
              className="size-6 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
          <div className="space-y-1">
            <p className="font-medium">
              {hasAny && isCurrentMonth
                ? "No expenses match these filters"
                : isFutureMonth
                ? `No expenses for ${monthLabel} yet`
                : `No expenses in ${monthLabel}`}
            </p>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              {hasAny && isCurrentMonth
                ? "Try widening the date or amount range, or clear the filters."
                : isFutureMonth
                ? "Expenses you log for this month will appear here."
                : `Nothing was logged in ${monthLabel}.`}
            </p>
          </div>
          {isCurrentMonth && !hasAny ? (
            <Button className="mt-1 gap-1.5" onClick={onAdd}>
              <Plus className="size-4" />
              Add your first expense
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {groups.map(([day, { items, total: dayTotal }]) => (
            <li key={day}>
              <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-y border-border/60 bg-muted/40 px-4 py-1.5 backdrop-blur-sm first:border-t-0">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {dayLabel(items[0]!.date)}
                </span>
                <span className="numeric text-xs font-medium text-muted-foreground">
                  {formatMoney(dayTotal, currency)}
                </span>
              </div>

              <ul className="divide-y divide-border/60">
                {items.map((e) => {
                  const cat = catOf(e.categoryId);
                  const money = formatMoney(e.amount, currency);
                  const isPending = pendingDeleteId === e.id;

                  return (
                    <li
                      key={e.id}
                      className={cn(
                        "group relative flex items-center gap-3 px-4 py-3 transition-colors",
                        isPending
                          ? "bg-destructive/5"
                          : "hover:bg-muted/40 focus-within:bg-muted/40",
                      )}
                    >
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-black/5"
                        style={{
                          backgroundColor: `${cat.color}22`,
                          color: cat.color,
                        }}
                        aria-hidden="true"
                      >
                        <CategoryIcon icon={cat.icon} className="size-4" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {cat.name}
                        </p>
                        {e.note ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {e.note}
                          </p>
                        ) : null}
                      </div>

                      <p className="numeric shrink-0 text-sm font-semibold tabular-nums">
                        {money}
                      </p>

                      {isPending ? (
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setPendingDeleteId(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleDelete(e.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "flex shrink-0 gap-1 transition-opacity",
                            "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
                          )}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-foreground"
                            aria-label={`Edit ${cat.name} expense of ${money}`}
                            onClick={() => onEdit(e)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            aria-label={`Delete ${cat.name} expense of ${money}`}
                            onClick={() => setPendingDeleteId(e.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}