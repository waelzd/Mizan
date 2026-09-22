import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Category, Expense, Theme } from "./types";
import { convertCurrency } from "./format";

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "housing", name: "Housing", color: "#7c5cd6", icon: "home" },
  { id: "generator", name: "Generator", color: "#e8833a", icon: "zap" },
  { id: "electricity", name: "Electricity", color: "#c9a227", icon: "zap" },
  { id: "wifi", name: "WiFi", color: "#3a86e8", icon: "wifi" },
  { id: "food", name: "Food", color: "#e0484b", icon: "utensils" },
  { id: "health", name: "Health", color: "#2ba88a", icon: "health" },
  { id: "transport", name: "Transport", color: "#d64f8d", icon: "car" },
];

export const STATIC_CATEGORY_IDS = new Set(DEFAULT_CATEGORIES.map((c) => c.id));

const FALLBACK_CATEGORY_ID = "food";

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

type FinanceState = {
  expenses: Expense[];
  categories: Category[];
  currency: string;
  theme: Theme;
  budgets: Record<string, number>; // "yyyy-MM" → cents

  addExpense: (input: Omit<Expense, "id" | "createdAt">) => void;
  updateExpense: (
    id: string,
    input: Partial<Omit<Expense, "id" | "createdAt">>,
  ) => void;
  deleteExpense: (id: string) => void;

  addCategory: (input: Omit<Category, "id">) => void;
  deleteCategory: (id: string) => void;

  setCurrency: (currency: string) => void;
  setTheme: (theme: Theme) => void;
  setBudget: (monthKey: string, cents: number) => void;
  clearBudget: (monthKey: string) => void;
};

export const useFinance = create<FinanceState>()(
  persist(
    (set) => ({
      expenses: [],
      categories: DEFAULT_CATEGORIES,
      currency: "USD",
      theme: "light",
      budgets: {},

      /* ------------------------------ Expenses ------------------------------ */

      addExpense: (input) =>
        set((s) => ({
          expenses: [
            { ...input, id: uid(), createdAt: new Date().toISOString() },
            ...s.expenses,
          ],
        })),

      updateExpense: (id, input) =>
        set((s) => ({
          expenses: s.expenses.map((e) =>
            e.id === id ? { ...e, ...input } : e,
          ),
        })),

      deleteExpense: (id) =>
        set((s) => ({
          expenses: s.expenses.filter((e) => e.id !== id),
        })),

      /* ----------------------------- Categories ----------------------------- */

      addCategory: (input) =>
        set((s) => ({
          categories: [...s.categories, { ...input, id: uid() }],
        })),

      deleteCategory: (id) => {
        if (STATIC_CATEGORY_IDS.has(id)) return;
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          expenses: s.expenses.map((e) =>
            e.categoryId === id
              ? { ...e, categoryId: FALLBACK_CATEGORY_ID }
              : e,
          ),
        }));
      },

      /* ----------------------------- Preferences ---------------------------- */

      setCurrency: (nextCurrency) =>
        set((s) => {
          const prevCurrency = s.currency;
          if (prevCurrency === nextCurrency) return s;

          const expenses = s.expenses.map((e) => ({
            ...e,
            amount: Math.round(
              convertCurrency(e.amount, prevCurrency, nextCurrency),
            ),
          }));

          const budgets: Record<string, number> = {};
          for (const [k, v] of Object.entries(s.budgets ?? {})) {
            budgets[k] = Math.round(
              convertCurrency(v, prevCurrency, nextCurrency),
            );
          }

          return { currency: nextCurrency, expenses, budgets };
        }),

      setTheme: (theme) => set({ theme }),

      /* ------------------------------- Budgets ------------------------------ */

      setBudget: (monthKey, cents) =>
        set((s) => ({
          budgets: { ...s.budgets, [monthKey]: cents },
        })),

      clearBudget: (monthKey) =>
        set((s) => {
          const { [monthKey]: _removed, ...rest } = s.budgets ?? {};
          return { budgets: rest };
        }),
    }),
    {
      name: "fintrack-v1",
      version: 3,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      migrate: (persisted: any, version) => {
        if (!persisted) return persisted;

        if (version < 2) {
          const oldIds = new Set(
            (persisted.categories ?? []).map((c: Category) => c.id),
          );
          const validIds = STATIC_CATEGORY_IDS;

          if (Array.isArray(persisted.expenses)) {
            persisted.expenses = persisted.expenses.map((e: Expense) =>
              oldIds.has(e.categoryId) && !validIds.has(e.categoryId)
                ? { ...e, categoryId: FALLBACK_CATEGORY_ID }
                : e,
            );
          }

          const customCategories = (persisted.categories ?? []).filter(
            (c: Category) => !oldIds.has(c.id) || validIds.has(c.id),
          );

          persisted.categories = [
            ...DEFAULT_CATEGORIES,
            ...customCategories.filter(
              (c: Category) => !validIds.has(c.id),
            ),
          ];
        }

        if (version < 3) {
          if (
            !persisted.budgets ||
            typeof persisted.budgets !== "object"
          ) {
            persisted.budgets = {};
          }
        }

        return persisted;
      },
    },
  ),
);