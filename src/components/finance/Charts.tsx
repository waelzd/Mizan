import { useCallback, useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  parseISO,
  isWithinInterval,
  subMonths,
  isSameMonth,
} from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Pencil,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  CalendarDays,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  ListOrdered,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BudgetDialog } from "@/components/finance/BudgetDialog";
import { useFinance } from "@/lib/finance/store";
import { formatMoney } from "@/lib/finance/format";
import { cn } from "@/lib/utils";

type PanelProps = {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  empty?: boolean;
  emptyMessage?: string;
  className?: string;
  /** Small icon shown in a colored tile to the left of the title. */
  icon?: React.ReactNode;
  /** Tailwind classes for the accent color, e.g. "text-primary bg-primary/10". */
  accentClassName?: string;
};

function Panel({
  title,
  subtitle,
  action,
  children,
  empty = false,
  emptyMessage = "Nothing to chart for this period yet.",
  className,
  icon,
  accentClassName = "text-primary bg-primary/10",
}: PanelProps) {
  return (
    <div className={cn("card-surface flex flex-col p-4", className)}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          {icon ? (
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-lg",
                accentClassName,
              )}
              aria-hidden="true"
            >
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold">{title}</h3>
            {subtitle ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {action}
      </div>

      <div className="min-h-0 flex-1">
        {empty ? (
          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-1 text-center">
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  money,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name?: string; color?: string }>;
  label?: string | number;
  money: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      {label !== undefined && (
        <p className="mb-0.5 font-medium text-popover-foreground">{label}</p>
      )}
      <div className="flex items-center gap-1.5">
        {entry.color && (
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
        )}
        <span className="font-semibold tabular-nums text-popover-foreground">
          {money(entry.value)}
        </span>
      </div>
    </div>
  );
}

function currentMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function Charts({ month }: { month: Date }) {
  const expenses = useFinance((s) => s.expenses);
  const categories = useFinance((s) => s.categories);
  const currency = useFinance((s) => s.currency);
  const budgets = useFinance((s) => s.budgets);
  const setBudget = useFinance((s) => s.setBudget);
  const clearBudget = useFinance((s) => s.clearBudget);

  const [budgetOpen, setBudgetOpen] = useState(false);

  const money = useCallback(
    (v: number) => formatMoney(v, currency),
    [currency],
  );
  const compact = useCallback(
    (v: number) => formatMoney(v, currency, true),
    [currency],
  );

  /* ------------------------- Month awareness ------------------------- */

  const today = useMemo(() => new Date(), []);
  const isCurrentMonth = isSameMonth(month, today);
  const isFutureMonth =
    startOfMonth(month).getTime() > startOfMonth(today).getTime();

  /* ------------------------------ Derived data ----------------------------- */

  const monthRange = useMemo(
    () => ({ start: startOfMonth(month), end: endOfMonth(month) }),
    [month],
  );

  const monthExpenses = useMemo(
    () =>
      expenses.filter((e) =>
        isWithinInterval(parseISO(e.date), monthRange),
      ),
    [expenses, monthRange],
  );

  const daily = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const e of monthExpenses) {
      const key = format(parseISO(e.date), "yyyy-MM-dd");
      byDay.set(key, (byDay.get(key) ?? 0) + e.amount);
    }
    return eachDayOfInterval(monthRange).map((d) => {
      const key = format(d, "yyyy-MM-dd");
      return { label: format(d, "d"), amount: byDay.get(key) ?? 0 };
    });
  }, [monthExpenses, monthRange]);

  const byCategory = useMemo(() => {
    const byId = new Map<string, number>();
    for (const e of monthExpenses) {
      byId.set(e.categoryId, (byId.get(e.categoryId) ?? 0) + e.amount);
    }
    const total = [...byId.values()].reduce((s, v) => s + v, 0);
    return [...byId.entries()]
      .map(([id, amount]) => {
        const cat = categories.find((c) => c.id === id);
        return {
          id,
          name: cat?.name ?? "Deleted",
          color: cat?.color ?? "#6b7a85",
          amount,
          pct: total ? (amount / total) * 100 : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [monthExpenses, categories]);

  const trend = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) =>
      subMonths(month, 5 - i),
    );
    const totalsByMonth = new Map<string, number>();
    for (const e of expenses) {
      const d = parseISO(e.date);
      const key = format(d, "yyyy-MM");
      if (!months.some((m) => isSameMonth(m, d))) continue;
      totalsByMonth.set(key, (totalsByMonth.get(key) ?? 0) + e.amount);
    }
    return months.map((m) => ({
      label: format(m, "MMM"),
      amount: totalsByMonth.get(format(m, "yyyy-MM")) ?? 0,
    }));
  }, [expenses, month]);

  const monthTotal = useMemo(
    () => monthExpenses.reduce((s, e) => s + e.amount, 0),
    [monthExpenses],
  );

  const prevMonthTotal = useMemo(() => {
    const prev = subMonths(month, 1);
    return expenses
      .filter((e) => isSameMonth(parseISO(e.date), prev))
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses, month]);

  const delta =
    prevMonthTotal > 0
      ? ((monthTotal - prevMonthTotal) / prevMonthTotal) * 100
      : null;

  /* --------------------------------- Budget -------------------------------- */

  const monthKey = currentMonthKey(month);
  const budget = budgets?.[monthKey] ?? 0;
  const hasBudget = budget > 0;
  const remaining = Math.max(budget - monthTotal, 0);
  const overBy = Math.max(monthTotal - budget, 0);
  const usedPct = hasBudget ? (monthTotal / budget) * 100 : 0;

  const prevMonthKey = currentMonthKey(subMonths(month, 1));
  const prevBudget = budgets?.[prevMonthKey] ?? 0;
  const canCopyPrevBudget = !hasBudget && prevBudget > 0;

  const status: {
    label: string;
    color: string;
    icon: React.ReactNode;
  } = useMemo(() => {
    if (!hasBudget) {
      return {
        label: "No budget set",
        color: "text-muted-foreground",
        icon: <Target className="size-3.5" />,
      };
    }
    if (usedPct > 100) {
      return {
        label: "Over budget",
        color: "text-destructive",
        icon: <AlertTriangle className="size-3.5" />,
      };
    }
    if (usedPct >= 80) {
      return {
        label: "Close to limit",
        color: "text-amber-600 dark:text-amber-500",
        icon: <AlertTriangle className="size-3.5" />,
      };
    }
    return {
      label: "On track",
      color: "text-emerald-600 dark:text-emerald-500",
      icon: <CheckCircle2 className="size-3.5" />,
    };
  }, [hasBudget, usedPct]);

  const dailyEmpty = monthTotal === 0;
  const categoryEmpty = byCategory.length === 0;
  const trendEmpty = trend.every((t) => t.amount === 0);

  const monthLabel = format(month, "MMMM yyyy");

  const dailyEmptyMessage = isFutureMonth
    ? "This month hasn't started yet."
    : isCurrentMonth
    ? `No spending logged in ${monthLabel} yet.`
    : `No spending logged in ${monthLabel}.`;

  const categoryEmptyMessage = isFutureMonth
    ? "Nothing here yet."
    : `No categories used in ${monthLabel}.`;

  /* ---------- Dynamic accent for the "By category" panel ---------- */
  // Uses the top category's color so the header dot reflects the pie's dominant slice.
  const topCategoryColor = byCategory[0]?.color ?? "#2ba88a";

  /* --------------------------------- Render -------------------------------- */

  return (
    <>
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Spent this month — with budget progress */}
        <Panel
          title="Spent this month"
          icon={<Wallet className="size-4" />}
          accentClassName="text-primary bg-primary/10"
          subtitle={
            <span className="inline-flex items-center gap-1.5">
              <span>{monthLabel}</span>
              {!isCurrentMonth && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {isFutureMonth ? "Upcoming" : "Past"}
                </span>
              )}
            </span>
          }
          action={
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setBudgetOpen(true)}
            >
              {hasBudget ? (
                <>
                  <Pencil className="size-3" />
                  Edit
                </>
              ) : (
                <>
                  <Target className="size-3" />
                  Set budget
                </>
              )}
            </Button>
          }
          className="lg:col-span-2"
          empty={false}
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Spent
                </p>
                <p className="font-display text-2xl font-semibold tabular-nums leading-tight">
                  {money(monthTotal)}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Budget
                </p>
                <p
                  className={cn(
                    "font-display text-2xl font-semibold tabular-nums leading-tight",
                    !hasBudget && "text-muted-foreground",
                  )}
                >
                  {hasBudget ? money(budget) : "—"}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {overBy > 0 ? "Over by" : "Remaining"}
                </p>
                <p
                  className={cn(
                    "font-display text-2xl font-semibold tabular-nums leading-tight",
                    !hasBudget && "text-muted-foreground",
                    overBy > 0 && "text-destructive",
                  )}
                >
                  {hasBudget
                    ? money(overBy > 0 ? overBy : remaining)
                    : "—"}
                </p>
              </div>

              <div className="ml-auto flex items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border border-current/20 px-2 py-0.5 text-[11px] font-medium",
                    status.color,
                  )}
                >
                  {status.icon}
                  {status.label}
                </span>
              </div>
            </div>

            {hasBudget ? (
              <div className="space-y-1.5">
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      usedPct > 100
                        ? "bg-destructive"
                        : usedPct >= 80
                        ? "bg-amber-500"
                        : "bg-primary",
                    )}
                    style={{ width: `${Math.min(usedPct, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] tabular-nums text-muted-foreground">
                  <span>{usedPct.toFixed(0)}% used</span>
                  <span>{money(remaining)} left</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-2.5">
                <Target
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="flex-1 text-xs text-muted-foreground">
                  {isFutureMonth
                    ? `Set a budget for ${monthLabel} to plan ahead.`
                    : `Set a budget for ${monthLabel} to track how much you have left.`}
                </p>
                {canCopyPrevBudget && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1.5 px-2 text-xs"
                    onClick={() => setBudget(monthKey, prevBudget)}
                  >
                    Use last month's ({money(prevBudget)})
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 px-2 text-xs"
                  onClick={() => setBudgetOpen(true)}
                >
                  Set budget
                </Button>
              </div>
            )}
          </div>
        </Panel>

        {/* Spending per day — primary green */}
        <Panel
          title="Spending per day"
          icon={<CalendarDays className="size-4" />}
          accentClassName="text-primary bg-primary/10"
          subtitle={
            <span className="tabular-nums">
              {money(monthTotal)} across {format(month, "MMMM yyyy")}
            </span>
          }
          empty={dailyEmpty}
          emptyMessage={dailyEmptyMessage}
          className="lg:col-span-1"
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} margin={{ left: -8, right: 4, top: 4 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                  opacity={0.6}
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="var(--color-muted-foreground)"
                  interval={2}
                />
                <YAxis
                  tickFormatter={compact}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="var(--color-muted-foreground)"
                  width={54}
                />
                <Tooltip
                  content={<ChartTooltip money={money} />}
                  cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                />
                <Bar
                  dataKey="amount"
                  fill="var(--color-primary)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* By category — accent matches top category's color */}
        <Panel
          title="By category"
          icon={<PieChartIcon className="size-4" />}
          accentClassName="text-rose-600 bg-rose-500/10 dark:text-rose-400"
          subtitle={
            byCategory.length > 0
              ? `${byCategory.length} ${
                  byCategory.length === 1 ? "category" : "categories"
                }`
              : undefined
          }
          empty={categoryEmpty}
          emptyMessage={categoryEmptyMessage}
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byCategory}
                  dataKey="amount"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={76}
                  paddingAngle={2}
                  stroke="var(--color-card)"
                  strokeWidth={2}
                >
                  {byCategory.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "0.75rem", paddingTop: 4 }}
                />
                <Tooltip content={<ChartTooltip money={money} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Trend — violet */}
        <Panel
          title="Last 6 months"
          icon={<LineChartIcon className="size-4" />}
          accentClassName="text-violet-600 bg-violet-500/10 dark:text-violet-400"
          subtitle={
            delta !== null ? (
              <span className="inline-flex items-center gap-1">
                {delta > 0 ? (
                  <>
                    <TrendingUp className="size-3 text-destructive" />
                    <span className="text-destructive">
                      {delta.toFixed(0)}% vs last month
                    </span>
                  </>
                ) : delta < 0 ? (
                  <>
                    <TrendingDown className="size-3 text-emerald-600" />
                    <span className="text-emerald-600">
                      {Math.abs(delta).toFixed(0)}% vs last month
                    </span>
                  </>
                ) : (
                  <>
                    <Minus className="size-3" />
                    <span>Same as last month</span>
                  </>
                )}
              </span>
            ) : (
              "No prior month to compare"
            )
          }
          empty={trendEmpty}
          emptyMessage="Track expenses over time to see a trend."
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ left: -8, right: 8, top: 4 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                  opacity={0.6}
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="var(--color-muted-foreground)"
                />
                <YAxis
                  tickFormatter={compact}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="var(--color-muted-foreground)"
                  width={54}
                />
                <Tooltip content={<ChartTooltip money={money} />} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "var(--color-primary)", strokeWidth: 0 }}
                  activeDot={{
                    r: 5,
                    strokeWidth: 2,
                    stroke: "var(--color-card)",
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Breakdown list — accent matches top category */}
        <Panel
          title="Category breakdown"
          icon={<ListOrdered className="size-4" />}
          accentClassName="text-amber-600 bg-amber-500/10 dark:text-amber-400"
          subtitle={
            byCategory.length > 0 ? `${money(monthTotal)} total` : undefined
          }
          empty={categoryEmpty}
          emptyMessage="Add an expense to see the breakdown."
        >
          {byCategory.length > 0 && (
            <ul className="max-h-56 space-y-2.5 overflow-y-auto pr-1">
              {byCategory.map((c, i) => (
                <li key={c.id} className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: c.color }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {c.name}
                    </span>
                    <span className="numeric shrink-0 tabular-nums text-muted-foreground">
                      {money(c.amount)}
                    </span>
                    <span className="numeric w-9 shrink-0 text-right tabular-nums font-medium">
                      {c.pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(c.pct, 2)}%`,
                        backgroundColor: c.color,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <BudgetDialog
        key={monthKey}
        open={budgetOpen}
        onOpenChange={setBudgetOpen}
        currency={currency}
        monthKey={monthKey}
        current={budget}
        onSave={(cents) => {
          setBudget(monthKey, cents);
          setBudgetOpen(false);
        }}
        onReset={() => clearBudget(monthKey)}
      />
    </>
  );
}