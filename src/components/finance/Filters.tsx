import { useCallback, useMemo, useState } from "react";
import { format, parseISO, isSameDay, startOfDay } from "date-fns";
import {
  Search,
  X,
  SlidersHorizontal,
  CalendarDays,
  ChevronDown,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useFinance } from "@/lib/finance/store";
import { CategoryIcon } from "@/lib/finance/icons";
import { cn } from "@/lib/utils";

export type FilterState = {
  search: string;
  categoryId: string;
  from: string;
  to: string;
  min: string;
  max: string;
};

export const EMPTY_FILTERS: FilterState = {
  search: "",
  categoryId: "all",
  from: "",
  to: "",
  min: "",
  max: "",
};

type FiltersProps = {
  value: FilterState;
  onChange: (next: FilterState) => void;
};

export function Filters({ value, onChange }: FiltersProps) {
  const set = useCallback(
    (patch: Partial<FilterState>) => onChange({ ...value, ...patch }),
    [value, onChange],
  );

  const activeCount = useMemo(
    () =>
      (Object.keys(EMPTY_FILTERS) as (keyof FilterState)[]).filter(
        (k) => value[k] !== EMPTY_FILTERS[k],
      ).length,
    [value],
  );

  const dirty = activeCount > 0;
  const dateRangeInvalid = Boolean(
    value.from && value.to && value.from > value.to,
  );

  return (
    <div className="card-surface space-y-3 p-3 sm:p-4">
      {/* Top row: search + clear */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label="Search notes"
            placeholder="Search notes…"
            className="h-9 pl-9 pr-8"
            value={value.search}
            onChange={(e) => set({ search: e.target.value })}
          />
          {value.search && (
            <button
              type="button"
              onClick={() => set({ search: "" })}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {dirty && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => onChange(EMPTY_FILTERS)}
          >
            <X className="size-3.5" />
            <span className="hidden sm:inline">Clear</span>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
              {activeCount}
            </span>
          </Button>
        )}
      </div>

      {/* Filter grid — more breathing room between fields */}
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_minmax(0,1.2fr)]">
        {/* Category */}
        <FilterField label="Category" icon={<SlidersHorizontal className="size-3" />}>
          <CategoryFilter
            value={value.categoryId}
            onChange={(categoryId) => set({ categoryId })}
          />
        </FilterField>

        {/* Date range */}
        <FilterField
          label="Date range"
          icon={<CalendarDays className="size-3" />}
          error={dateRangeInvalid}
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <DateField
              label="From"
              value={value.from}
              onChange={(from) => set({ from })}
              error={dateRangeInvalid}
            />
            <span className="text-xs text-muted-foreground">→</span>
            <DateField
              label="To"
              value={value.to}
              onChange={(to) => set({ to })}
              error={dateRangeInvalid}
            />
          </div>
        </FilterField>

        {/* Amount range */}
        <FilterField
          label="Amount range"
          icon={<span className="text-[11px] font-semibold">$</span>}
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <Input
              aria-label="Minimum amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="Min"
              value={value.min}
              onChange={(e) => set({ min: e.target.value })}
              className="h-9 px-2.5 text-sm tabular-nums"
            />
            <span className="text-xs text-muted-foreground">–</span>
            <Input
              aria-label="Maximum amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="Max"
              value={value.max}
              onChange={(e) => set({ max: e.target.value })}
              className="h-9 px-2.5 text-sm tabular-nums"
            />
          </div>
        </FilterField>
      </div>

      {dateRangeInvalid && (
        <p className="text-xs text-destructive">
          "From" date must be on or before the "To" date.
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Sub-components                               */
/* -------------------------------------------------------------------------- */

function FilterField({
  label,
  icon,
  children,
  className,
  error,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  error?: boolean;
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <div className="flex items-center gap-1.5">
        {icon ? (
          <span
            className={cn(
              "flex size-4 items-center justify-center rounded text-muted-foreground",
              error && "text-destructive",
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
        <label
          className={cn(
            "text-[11px] font-medium uppercase tracking-wide",
            error ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {label}
        </label>
      </div>
      {children}
    </div>
  );
}

/* ------------------------------- Date field ------------------------------- */

function DateField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${value}T12:00:00`) : undefined;

  const display = selected ? format(selected, "MMM d, yyyy") : "Date";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${label} date${selected ? `: ${display}` : ""}`}
          className={cn(
            "flex h-9 w-full min-w-0 items-center gap-1.5 rounded-lg border bg-card px-2.5 text-left text-sm transition-colors",
            "hover:border-ring/60 hover:bg-accent/40",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20",
            open && "border-ring bg-accent/40 ring-2 ring-ring/20",
            error
              ? "border-destructive focus-visible:ring-destructive/20"
              : "border-input",
          )}
        >
          <CalendarDays className="size-3.5 shrink-0 text-muted-foreground" />
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-xs tabular-nums",
              selected ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {display}
          </span>
          {value && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              aria-label={`Clear ${label.toLowerCase()} date`}
              className="flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
            >
              <X className="size-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-auto p-0"
        // prevent the popover from being clipped inside the card
        collisionPadding={12}
      >
        <div className="border-b border-border/70 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label} date
          </p>
        </div>

        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (!d) return;
            onChange(format(d, "yyyy-MM-dd"));
            setOpen(false);
          }}
          defaultMonth={selected ?? new Date()}
          initialFocus
          components={{
            IconLeft: () => <ChevronLeft className="size-4" />,
            IconRight: () => <ChevronRight className="size-4" />,
          }}
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
            cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
            day: cn(
              "size-8 rounded-md p-0 text-sm font-normal",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              "aria-selected:opacity-100",
            ),
            day_selected:
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            day_today: "bg-accent text-accent-foreground font-semibold",
            day_outside:
              "text-muted-foreground/50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
            day_disabled: "text-muted-foreground opacity-40",
            day_hidden: "invisible",
          }}
        />

        {/* Quick actions */}
        <div className="flex items-center gap-1 border-t border-border/70 p-2">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="flex-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => {
              onChange(format(new Date(), "yyyy-MM-dd"));
              setOpen(false);
            }}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              selected && isSameDay(selected, startOfDay(new Date()))
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            Today
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ---------------------------- Category filter ----------------------------- */

function CategoryFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const categories = useFinance((s) => s.categories);
  const [open, setOpen] = useState(false);

  const selected =
    value === "all" ? null : categories.find((c) => c.id === value) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Filter by category"
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border bg-card px-2.5 text-left text-sm transition-colors",
            "hover:border-ring/60 hover:bg-accent/40",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20",
            open && "border-ring bg-accent/40 ring-2 ring-ring/20",
            "border-input",
          )}
        >
          {selected ? (
            <span
              className="flex size-5 shrink-0 items-center justify-center rounded"
              style={{
                backgroundColor: `${selected.color}22`,
                color: selected.color,
              }}
              aria-hidden="true"
            >
              <CategoryIcon icon={selected.icon} className="size-3" />
            </span>
          ) : (
            <span className="flex size-5 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
              <SlidersHorizontal className="size-3" aria-hidden="true" />
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-sm">
            {selected ? selected.name : "All categories"}
          </span>
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" sideOffset={6} className="w-56 p-1">
        <div className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Filter category
        </div>
        <ul role="listbox" className="max-h-64 overflow-y-auto">
          <li>
            <button
              type="button"
              role="option"
              aria-selected={value === "all"}
              onClick={() => {
                onChange("all");
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                value === "all" ? "bg-accent" : "hover:bg-accent/60",
              )}
            >
              <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <SlidersHorizontal className="size-3.5" />
              </span>
              <span className="flex-1 font-medium">All categories</span>
              {value === "all" && <Check className="size-4 text-primary" />}
            </button>
          </li>
          {categories.map((c) => {
            const isSelected = value === c.id;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                    isSelected ? "bg-accent" : "hover:bg-accent/60",
                  )}
                >
                  <span
                    className="flex size-7 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${c.color}22`, color: c.color }}
                  >
                    <CategoryIcon icon={c.icon} className="size-3.5" />
                  </span>
                  <span className="flex-1 truncate font-medium">{c.name}</span>
                  {isSelected && <Check className="size-4 text-primary" />}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}