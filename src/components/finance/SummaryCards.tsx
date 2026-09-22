import { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  isWithinInterval,
  parseISO,
  getDaysInMonth,
  isSameMonth,
} from "date-fns";
import { ArrowDownRight, ArrowUpRight, Minus, Receipt, TrendingUp, PieChart } from "lucide-react";
import { formatMoney } from "@/lib/finance/format";
import { useFinance } from "@/lib/finance/store";
import { CategoryIcon } from "@/lib/finance/icons";

function Stat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="card-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="numeric mt-2 font-display text-2xl font-semibold">{value}</p>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export function SummaryCards({ month }: { month: Date }) {
  const expenses = useFinance((s) => s.expenses);
  const categories = useFinance((s) => s.categories);
  const currency = useFinance((s) => s.currency);

  const data = useMemo(() => {
    const thisRange = { start: startOfMonth(month), end: endOfMonth(month) };
    const prev = subMonths(month, 1);
    const prevRange = { start: startOfMonth(prev), end: endOfMonth(prev) };

    const inThis = expenses.filter((e) =>
      isWithinInterval(parseISO(e.date), thisRange),
    );
    const inPrev = expenses.filter((e) =>
      isWithinInterval(parseISO(e.date), prevRange),
    );

    const total = inThis.reduce((sum, e) => sum + e.amount, 0);
    const prevTotal = inPrev.reduce((sum, e) => sum + e.amount, 0);
    const change = prevTotal === 0 ? null : ((total - prevTotal) / prevTotal) * 100;

    const byCat = new Map<string, number>();
    for (const e of inThis) byCat.set(e.categoryId, (byCat.get(e.categoryId) ?? 0) + e.amount);
    let topId: string | null = null;
    let topAmount = 0;
    for (const [id, amount] of byCat) {
      if (amount > topAmount) {
        topId = id;
        topAmount = amount;
      }
    }

    const days = isSameMonth(month, new Date())
      ? new Date().getDate()
      : getDaysInMonth(month);

    return {
      total,
      prevTotal,
      change,
      topCategory: categories.find((c) => c.id === topId) ?? null,
      topAmount,
      average: Math.round(total / Math.max(days, 1)),
      count: inThis.length,
    };
  }, [expenses, categories, month]);

  const ChangeIcon =
    data.change === null ? Minus : data.change > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Stat
        label="Spent this month"
        value={formatMoney(data.total, currency)}
        icon={<TrendingUp className="size-4" />}
        hint={
          <span className="inline-flex items-center gap-1">
            <ChangeIcon
              className={`size-3.5 ${data.change !== null && data.change > 0 ? "text-destructive" : "text-success"}`}
            />
            {data.change === null
              ? "No data for last month"
              : `${Math.abs(data.change).toFixed(1)}% vs ${formatMoney(data.prevTotal, currency)} last month`}
          </span>
        }
      />
      <Stat
        label="Top category"
        value={data.topCategory ? data.topCategory.name : "—"}
        icon={<PieChart className="size-4" />}
        hint={
          data.topCategory ? (
            <span className="inline-flex items-center gap-1">
              <CategoryIcon
                icon={data.topCategory.icon}
                className="size-3.5"
              />
              {formatMoney(data.topAmount, currency)}
            </span>
          ) : (
            "Nothing logged yet"
          )
        }
      />
      <Stat
        label="Average per day"
        value={formatMoney(data.average, currency)}
        icon={<TrendingUp className="size-4" />}
        hint="Based on days elapsed"
      />
      <Stat
        label="Transactions"
        value={String(data.count)}
        icon={<Receipt className="size-4" />}
        hint="This month"
      />
    </div>
  );
}
