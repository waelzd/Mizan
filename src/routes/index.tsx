import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  addMonths,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/finance/AppHeader";
import { SummaryCards } from "@/components/finance/SummaryCards";
import { Charts } from "@/components/finance/Charts";
import { ExpenseForm } from "@/components/finance/ExpenseForm";
import { ExpenseList } from "@/components/finance/ExpenseList";
import { CategoryManager } from "@/components/finance/CategoryManager";
import { Filters, EMPTY_FILTERS, type FilterState } from "@/components/finance/Filters";
import { useFinance } from "@/lib/finance/store";
import { toCents } from "@/lib/finance/format";
import type { Expense } from "@/lib/finance/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mizan — Personal Finance Tracker" },
      {
        name: "description",
        content:
          "Track daily spending, split it by category, and see monthly trends with clear charts. Works offline in your browser.",
      },
      { property: "og:title", content: "Mizan — Personal Finance Tracker" },
      {
        property: "og:description",
        content:
          "Log expenses in seconds and watch your monthly totals, categories and trends update instantly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [hydrated, setHydrated] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  const expenses = useFinance((s) => s.expenses);
  const theme = useFinance((s) => s.theme);

  useEffect(() => {
    void useFinance.persist.rehydrate();
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme, hydrated]);

  const filtered = useMemo(() => {
    const min = filters.min ? toCents(filters.min) : null;
    const max = filters.max ? toCents(filters.max) : null;
    return expenses
      .filter((e) => {
        const d = parseISO(e.date);
        if (filters.categoryId !== "all" && e.categoryId !== filters.categoryId) return false;
        if (filters.from && d < new Date(`${filters.from}T00:00:00`)) return false;
        if (filters.to && d > new Date(`${filters.to}T23:59:59`)) return false;
        if (min !== null && Number.isFinite(min) && e.amount < min) return false;
        if (max !== null && Number.isFinite(max) && e.amount > max) return false;
        if (
          filters.search &&
          !(e.note ?? "").toLowerCase().includes(filters.search.toLowerCase())
        )
          return false;
        return true;
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt)));
  }, [expenses, filters]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(expense: Expense) {
    setEditing(expense);
    setFormOpen(true);
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading your Mizan ...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onAdd={openAdd} onManageCategories={() => setCatOpen(true)} />

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6 pb-24">
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-display text-xl font-semibold">
            {format(month, "MMMM yyyy")}
          </h1>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous month"
              onClick={() => setMonth((m) => subMonths(m, 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next month"
              disabled={isSameMonth(month, new Date())}
              onClick={() => setMonth((m) => addMonths(m, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <SummaryCards month={month} />
        <Charts month={month} />
        <Filters value={filters} onChange={setFilters} />
        <ExpenseList
          expenses={filtered}
          total={total}
          onEdit={openEdit}
          hasAny={expenses.length > 0}
          onAdd={openAdd}
          month={month}
        />
      </main>

      <Button
        onClick={openAdd}
        aria-label="Add expense"
        className="fixed bottom-5 right-5 size-14 rounded-full shadow-lg sm:hidden"
      >
        <Plus className="size-6" />
      </Button>

      <ExpenseForm open={formOpen} onOpenChange={setFormOpen} editing={editing} />
      <CategoryManager open={catOpen} onOpenChange={setCatOpen} />
    </div>
  );
}
