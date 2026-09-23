import { useEffect, useRef, useState } from "react";
import { AlertCircle, Target, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fromCents, toCents } from "@/lib/finance/format";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  LBP: "ل.ل",
};

type BudgetDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  monthKey: string;
  current: number;
  onSave: (cents: number) => void;
  /** Optional — if provided, a "Reset budget" button is shown when a budget exists. */
  onReset?: () => void;
};

export function BudgetDialog({
  open,
  onOpenChange,
  currency,
  monthKey,
  current,
  onSave,
  onReset,
}: BudgetDialogProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset whenever the dialog opens OR the target month changes.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setConfirmingReset(false);
    setValue(current > 0 ? fromCents(current) : "");
  }, [open, current, monthKey]);

  // Autofocus + select when opening.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 60);
    return () => clearTimeout(t);
  }, [open, monthKey]);

  const monthLabel = (() => {
    const [y = 0, m = 1] = monthKey.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  })();

  const cents = toCents(value);
  const isValid = Number.isFinite(cents) && cents > 0;
  const hasExisting = current > 0;
  const canReset = hasExisting && Boolean(onReset);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) {
      setError("Enter a budget greater than zero.");
      return;
    }
    onSave(cents);
  }

  function handleReset() {
    if (!onReset) return;
    onReset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Target className="size-4" />
            </span>
            {hasExisting ? "Edit budget" : "Set your monthly budget"}
          </DialogTitle>
          <DialogDescription>
            Enter the amount you plan to spend in {monthLabel}. Each month has
            its own budget — changing this one won't affect other months.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="budget-amount">Budget for {monthLabel}</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                {CURRENCY_SYMBOLS[currency] ?? currency}
              </span>
              <Input
                ref={inputRef}
                id="budget-amount"
                inputMode="decimal"
                type="number"
                step="0.01"
                min="0.01"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="0.00"
                className="h-11 pl-8 text-lg font-semibold tabular-nums"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "budget-error" : undefined}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This is a soft limit — you can still log expenses above it.
            </p>
          </div>

          {error ? (
            <p
              id="budget-error"
              role="alert"
              className="flex items-center gap-1.5 text-sm text-destructive"
            >
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </p>
          ) : null}

          {confirmingReset ? (
            <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">
                    Reset the budget for {monthLabel}?
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Your expenses stay intact. Only the budget is removed.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={() => setConfirmingReset(false)}
                >
                  Keep it
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={handleReset}
                >
                  Reset budget
                </Button>
              </div>
            </div>
          ) : (
            <DialogFooter className="gap-2 sm:justify-between">
              {canReset ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmingReset(true)}
                >
                  <RotateCcw className="size-3.5" />
                  Reset
                </Button>
              ) : (
                <span />
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!isValid}
                  className="min-w-[7rem]"
                >
                  {hasExisting ? "Save budget" : "Set budget"}
                </Button>
              </div>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}