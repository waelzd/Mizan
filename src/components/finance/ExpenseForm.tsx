import { useEffect, useMemo, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { AlertCircle, Calendar as CalendarIcon, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFinance } from "@/lib/finance/store";
import { formatMoney, fromCents, toCents } from "@/lib/finance/format";
import { CategoryIcon } from "@/lib/finance/icons";
import { cn } from "@/lib/utils";
import type { Expense } from "@/lib/finance/types";

type ExpenseFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Expense | null;
};

function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}

function toLocalISO(date: string) {
  return new Date(`${date}T12:00:00`).toISOString();
}

export function ExpenseForm({ open, onOpenChange, editing }: ExpenseFormProps) {
  const categories = useFinance((s) => s.categories);
  const addExpense = useFinance((s) => s.addExpense);
  const updateExpense = useFinance((s) => s.updateExpense);
  const currency = useFinance((s) => s.currency);

  const defaultCategoryId = useMemo(
    () => categories[0]?.id ?? "",
    [categories],
  );

  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const today = todayISO();
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

  useEffect(() => {
    if (!open) return;
    setError(null);

    if (editing) {
      const categoryStillExists = categories.some(
        (c) => c.id === editing.categoryId,
      );
      setAmount(fromCents(editing.amount));
      setCategoryId(
        categoryStillExists ? editing.categoryId : defaultCategoryId,
      );
      setDate(format(parseISO(editing.date), "yyyy-MM-dd"));
      setNote(editing.note ?? "");
    } else {
      setAmount("");
      setCategoryId(defaultCategoryId);
      setDate(todayISO());
      setNote("");
    }
  }, [open, editing, categories, defaultCategoryId]);

  const cents = toCents(amount);
  const amountValid = Number.isFinite(cents) && cents > 0;
  const canSubmit = amountValid && Boolean(categoryId) && Boolean(date);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amountValid) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!categoryId) {
      setError("Pick a category.");
      return;
    }
    if (!date) {
      setError("Pick a date.");
      return;
    }

    const payload = {
      amount: cents,
      categoryId,
      date: toLocalISO(date),
      note: note.trim() || undefined,
    };

    if (editing) updateExpense(editing.id, payload);
    else addExpense(payload);

    onOpenChange(false);
  }

  const selectedDate = new Date(`${date}T12:00:00`);
  const dateLabel = (() => {
    if (date === today) return "Today";
    if (date === yesterday) return "Yesterday";
    return format(selectedDate, "EEE, MMM d, yyyy");
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        {/* Header */}
        <DialogHeader className="shrink-0 border-b border-border px-5 pb-3 pt-4">
          <DialogTitle className="text-base">
            {editing ? "Edit expense" : "New expense"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Amount, category, and date required. Note is optional.
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <form
          id="expense-form"
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4"
        >
          {/* Amount + Date on one row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs font-medium">
                Amount
              </Label>
              <Input
                id="amount"
                inputMode="decimal"
                type="number"
                step="0.01"
                min="0.01"
                autoFocus
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="0.00"
                className={cn(
                  "h-9 tabular-nums",
                  error &&
                    !amountValid &&
                    "border-destructive focus-visible:ring-destructive",
                )}
                aria-invalid={Boolean(error) && !amountValid}
                aria-describedby={error ? "expense-error" : undefined}
                required
              />
            </div>

            {/* Date — Popover + Calendar */}
            <div className="space-y-1.5">
              <Label htmlFor="date-trigger" className="text-xs font-medium">
                Date
              </Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    id="date-trigger"
                    type="button"
                    className={cn(
                      "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-2.5 text-left text-sm shadow-sm transition-colors",
                      "hover:border-ring/60 hover:bg-accent/40",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
                      calendarOpen && "border-ring bg-accent/40 ring-2 ring-ring/20",
                    )}
                  >
                    <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {dateLabel}
                    </span>
                  </button>
                </PopoverTrigger>

                <PopoverContent
                  align="end"
                  sideOffset={6}
                  className="w-auto p-0"
                >
                  <div className="border-b border-border/70 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Pick a date
                    </p>
                  </div>

                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => {
                      if (!d) return;
                      setDate(format(d, "yyyy-MM-dd"));
                      setCalendarOpen(false);
                    }}
                    defaultMonth={selectedDate}
                    initialFocus
                    classNames={{
                      months: "flex flex-col sm:flex-row gap-2",
                      month: "flex flex-col gap-2 p-3",
                      caption:
                        "flex justify-center pt-1 relative items-center mb-1",
                      caption_label: "text-sm font-semibold",
                      nav: "flex items-center gap-1",
                      nav_button: cn(
                        "size-7 rounded-md border border-transparent text-muted-foreground",
                        "hover:bg-accent hover:text-foreground",
                      ),
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      table: "w-full border-collapse",
                      head_row: "flex",
                      head_cell:
                        "text-muted-foreground rounded-md w-8 font-normal text-[10px] uppercase tracking-wide",
                      row: "flex w-full mt-1",
                      cell: cn(
                        "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                        "[&:has([aria-selected])]:bg-accent",
                        "[&:has([aria-selected].day-range-end)]:rounded-r-md",
                        "[&:has(>.day-range-end)]:rounded-r-md",
                        "[&:has(>.day-range-start)]:rounded-l-md",
                        "first:[&:has([aria-selected])]:rounded-l-md",
                        "last:[&:has([aria-selected])]:rounded-r-md",
                      ),
                      day: cn(
                        "size-8 rounded-md p-0 text-sm font-normal",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                        "aria-selected:opacity-100",
                      ),
                      day_selected:
                        "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                      day_today:
                        "bg-accent text-accent-foreground font-semibold",
                      day_outside:
                        "text-muted-foreground/50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                      day_disabled: "text-muted-foreground opacity-40",
                      day_hidden: "invisible",
                    }}
                    components={{
                      IconLeft: () => <ChevronLeft className="size-4" />,
                      IconRight: () => <ChevronRight className="size-4" />,
                    }}
                  />

                  {/* Quick actions */}
                  <div className="flex items-center gap-1 border-t border-border/70 p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDate(today);
                        setCalendarOpen(false);
                      }}
                      className={cn(
                        "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                        date === today
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDate(yesterday);
                        setCalendarOpen(false);
                      }}
                      className={cn(
                        "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                        date === yesterday
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      Yesterday
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium">Category</span>
            <div
              role="radiogroup"
              aria-label="Category"
              className="grid max-h-44 grid-cols-2 gap-1.5 overflow-y-auto pr-0.5"
            >
              {categories.map((c) => {
                const selected = c.id === categoryId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setCategoryId(c.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-sm transition-all",
                      selected
                        ? "border-primary bg-primary/5 font-medium shadow-sm ring-1 ring-primary/20"
                        : "border-border/70 text-muted-foreground hover:border-border hover:bg-accent/50 hover:text-foreground",
                    )}
                  >
                    <span
                      className="flex size-5 shrink-0 items-center justify-center rounded"
                      style={{
                        backgroundColor: `${c.color}22`,
                        color: c.color,
                      }}
                    >
                      <CategoryIcon icon={c.icon} className="size-3" />
                    </span>
                    <span className="truncate">{c.name}</span>
                    {selected && (
                      <Check className="ml-auto size-3 shrink-0 text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="note" className="text-xs font-medium">
              Note{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Textarea
              id="note"
              rows={1}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What was this for?"
              maxLength={200}
              className="min-h-9 resize-none py-2 text-sm"
            />
          </div>

          {error ? (
            <p
              id="expense-error"
              role="alert"
              className="flex items-center gap-1.5 text-xs text-destructive"
            >
              <AlertCircle className="size-3.5 shrink-0" />
              {error}
            </p>
          ) : null}
        </form>

        {/* Footer */}
        <DialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/20 px-5 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            form="expense-form"
            disabled={!canSubmit}
            className="min-w-[8rem]"
          >
            {editing
              ? "Save changes"
              : amountValid
              ? `Add ${formatMoney(cents, currency)}`
              : "Add expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}