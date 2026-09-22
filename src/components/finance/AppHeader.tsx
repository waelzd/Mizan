import { useCallback, useEffect, useRef, useState } from "react";
import {
  Moon,
  Sun,
  Wallet,
  Plus,
  Tags,
  Check,
  ChevronDown,
  DollarSign,
  Target,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CURRENCIES, formatMoney } from "@/lib/finance/format";
import { BudgetDialog } from "@/components/finance/BudgetDialog";
import { useFinance } from "@/lib/finance/store";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  onAdd: () => void;
  onManageCategories: () => void;
};

const CURRENCY_META: Record<
  string,
  { symbol: string; flag: string; hint: string }
> = {
  USD: { symbol: "$", flag: "🇺🇸", hint: "US Dollar" },
  LBP: { symbol: "ل.ل", flag: "🇱🇧", hint: "Lebanese Pound" },
};

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function AppHeader({ onAdd, onManageCategories }: AppHeaderProps) {
  const theme = useFinance((s) => s.theme);
  const setTheme = useFinance((s) => s.setTheme);
  const currency = useFinance((s) => s.currency);
  const setCurrency = useFinance((s) => s.setCurrency);

  const budgets = useFinance((s) => s.budgets);
  const setBudget = useFinance((s) => s.setBudget);
  const clearBudget = useFinance((s) => s.clearBudget);

  const [budgetOpen, setBudgetOpen] = useState(false);

  const isDark = theme === "dark";
  const monthKey = currentMonthKey();
  const currentBudget = budgets?.[monthKey] ?? 0;
  const hasBudget = currentBudget > 0;

  const safeCurrency = CURRENCIES.some((c) => c.code === currency)
    ? currency
    : CURRENCIES[0].code;

  const toggleTheme = useCallback(() => {
    setTheme(isDark ? "light" : "dark");
  }, [isDark, setTheme]);

  const handleAddClick = useCallback(() => {
    if (!hasBudget) {
      setBudgetOpen(true);
      return;
    }
    onAdd();
  }, [hasBudget, onAdd]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:gap-3">
          <div className="mr-auto flex items-center gap-3">
              <img
      src="/favicon.png"
      alt=""
      width={40}
      height={40}
      className="size-10 object-contain"
      aria-hidden="true"
    />
            <div className="leading-tight">
    <p className="font-display text-base font-semibold tracking-tight sm:text-lg">
      Mizan
    </p>
    <p className="hidden text-xs text-muted-foreground sm:block">
      Know your balance
    </p>
  </div>
</div>

          <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-card/60 p-1 shadow-sm">
            {hasBudget ? (
              <button
                type="button"
                onClick={() => setBudgetOpen(true)}
                aria-label={`Monthly budget: ${formatMoney(
                  currentBudget,
                  safeCurrency,
                )}. Click to edit.`}
                title="Click to edit your monthly budget"
                className={cn(
                  "group flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm outline-none transition-colors",
                  "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <Target className="size-3.5 text-primary" aria-hidden="true" />
                <span className="hidden text-xs font-medium tabular-nums text-muted-foreground sm:inline">
                  Budget
                </span>
                <span className="text-xs font-semibold tabular-nums">
                  {formatMoney(currentBudget, safeCurrency, true)}
                </span>
                <Pencil
                  className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden="true"
                />
              </button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 rounded-lg px-2 text-xs font-medium text-primary hover:bg-primary/10 hover:text-primary"
                onClick={() => setBudgetOpen(true)}
              >
                <Target className="size-3.5" />
                Set budget
              </Button>
            )}

            <span className="h-5 w-px bg-border/80" aria-hidden="true" />

            <CurrencyDropdown value={safeCurrency} onChange={setCurrency} />

            <span className="h-5 w-px bg-border/80" aria-hidden="true" />

            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg"
              aria-label="Manage categories"
              title="Manage categories"
              onClick={onManageCategories}
            >
              <Tags className="size-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              aria-pressed={isDark}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={toggleTheme}
            >
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </div>

          <Button
            onClick={handleAddClick}
            disabled={!hasBudget}
            aria-disabled={!hasBudget}
            title={hasBudget ? "Add expense" : "Set your monthly budget first"}
            className={cn(
              "gap-1.5 shadow-sm",
              !hasBudget && "cursor-not-allowed opacity-60",
            )}
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add</span>
            <span className="sr-only sm:hidden">
              {hasBudget ? "Add transaction" : "Set your monthly budget first"}
            </span>
          </Button>
        </div>

        <span className="sr-only" aria-live="polite">
          {isDark ? "Dark mode enabled" : "Light mode enabled"}
        </span>
      </header>

      <BudgetDialog
        open={budgetOpen}
        onOpenChange={setBudgetOpen}
        currency={safeCurrency}
        monthKey={monthKey}
        current={currentBudget}
        onSave={(cents) => {
          setBudget(monthKey, cents);
          setBudgetOpen(false);
        }}
        onReset={() => clearBudget(monthKey)}
      />
    </>
  );
}

function CurrencyDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      CURRENCIES.findIndex((c) => c.code === value),
    ),
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = CURRENCIES.find((c) => c.code === value) ?? CURRENCIES[0];
  const meta = CURRENCY_META[selected.code];

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const idx = CURRENCIES.findIndex((c) => c.code === value);
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [open, value]);

  const commit = useCallback(
    (code: string) => {
      onChange(code);
      setOpen(false);
    },
    [onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % CURRENCIES.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + CURRENCIES.length) % CURRENCIES.length);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(CURRENCIES[activeIndex].code);
        break;
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Currency: ${selected.label}. Click to change.`}
        className={cn(
          "group flex h-8 items-center gap-2 rounded-lg pl-1.5 pr-2 text-sm font-medium text-foreground outline-none transition-all",
          "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
          open && "bg-accent",
        )}
      >
        <span className="flex size-5 items-center justify-center rounded-md bg-primary/10 text-[10px] font-semibold text-primary">
          {meta?.symbol ?? <DollarSign className="size-3" />}
        </span>
        <span className="tabular-nums">{selected.code}</span>
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select currency"
          className={cn(
            "absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border/80 bg-popover p-1 text-popover-foreground shadow-lg shadow-black/5",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150",
          )}
        >
          <div className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Select currency
          </div>
          <ul ref={listRef} className="max-h-64 overflow-y-auto">
            {CURRENCIES.map((c, i) => {
              const m = CURRENCY_META[c.code];
              const isSelected = c.code === value;
              const isActive = i === activeIndex;
              return (
                <li key={c.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => commit(c.code)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                      isActive && "bg-accent",
                      !isActive && "hover:bg-accent/60",
                    )}
                  >
                    <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-[11px] font-semibold text-foreground/80">
                      {m?.symbol ?? c.code[0]}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="flex items-center gap-1.5 font-medium">
                        {c.code}
                        <span className="text-xs text-muted-foreground">
                          {m?.flag}
                        </span>
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {m?.hint ?? c.label}
                      </span>
                    </span>
                    {isSelected && (
                      <Check className="size-4 shrink-0 text-primary" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}