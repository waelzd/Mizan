import { useMemo, useState } from "react";
import { Trash2, Check, Plus, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFinance, DEFAULT_CATEGORIES } from "@/lib/finance/store";
import { CategoryIcon, ICON_KEYS } from "@/lib/finance/icons";
import { cn } from "@/lib/utils";

type CategoryManagerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DEFAULT_IDS = new Set(DEFAULT_CATEGORIES.map((c) => c.id));

const PRESET_COLORS = [
  "#2ba88a",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#64748b",
];

export function CategoryManager({ open, onOpenChange }: CategoryManagerProps) {
  const categories = useFinance((s) => s.categories);
  const addCategory = useFinance((s) => s.addCategory);
  const deleteCategory = useFinance((s) => s.deleteCategory);

  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState<string>(ICON_KEYS[0]);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const sortedCategories = useMemo(
    () =>
      [...categories].sort((a, b) => {
        const aDefault = DEFAULT_IDS.has(a.id) ? 0 : 1;
        const bDefault = DEFAULT_IDS.has(b.id) ? 0 : 1;
        if (aDefault !== bDefault) return aDefault - bDefault;
        return a.name.localeCompare(b.name);
      }),
    [categories],
  );

  const customCount = sortedCategories.length - DEFAULT_IDS.size;

  const trimmedName = name.trim();
  const isDuplicate = useMemo(
    () =>
      trimmedName.length > 0 &&
      categories.some(
        (c) => c.name.toLowerCase() === trimmedName.toLowerCase(),
      ),
    [categories, trimmedName],
  );

  function resetForm() {
    setName("");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmedName) {
      setError("Give the category a name.");
      return;
    }
    if (isDuplicate) {
      setError("A category with that name already exists.");
      return;
    }
    addCategory({ name: trimmedName, color, icon });
    resetForm();
  }

  function handleDelete(id: string) {
    deleteCategory(id);
    setPendingDeleteId(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        - max-h-[90vh] → guarantees ~5vh gap top & bottom on short viewports
        - flex flex-col → header fixed, list scrolls, form fixed
        - overflow-hidden → keeps rounded corners clean
      */}
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        {/* Header — fixed */}
        <DialogHeader className="shrink-0 border-b border-border px-6 pb-4 pt-5">
          <DialogTitle className="flex items-center gap-2">
            Categories
            {customCount > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {customCount} custom
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Create your own categories. Deleting one moves its expenses to{" "}
            <span className="font-medium text-foreground">Food</span>.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable category list */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {sortedCategories.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No categories yet.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {sortedCategories.map((c) => {
                const isDefault = DEFAULT_IDS.has(c.id);
                const isPending = pendingDeleteId === c.id;
                return (
                  <li
                    key={c.id}
                    className="group flex items-center gap-3 rounded-xl border border-border/70 bg-card/40 px-3 py-2 transition-colors hover:bg-accent/40"
                  >
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ring-black/5"
                      style={{ backgroundColor: `${c.color}22`, color: c.color }}
                    >
                      <CategoryIcon icon={c.icon} className="size-4" />
                    </span>

                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {c.name}
                    </span>

                    {isDefault ? (
                      <span className="rounded-full border border-border/70 bg-muted/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Default
                      </span>
                    ) : isPending ? (
                      <div className="flex items-center gap-1">
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
                          onClick={() => handleDelete(c.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                        aria-label={`Delete ${c.name}`}
                        onClick={() => setPendingDeleteId(c.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Add form — fixed at bottom */}
        <form
          onSubmit={handleSubmit}
          className="shrink-0 space-y-3 border-t border-border bg-muted/20 px-6 py-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">New category</h3>

            <div className="flex items-center gap-2 rounded-full border border-border/70 bg-card px-2.5 py-1 text-xs">
              <span
                className="flex size-5 items-center justify-center rounded-md"
                style={{ backgroundColor: `${color}22`, color }}
              >
                <CategoryIcon icon={icon} className="size-3" />
              </span>
              <span className="max-w-[10rem] truncate font-medium">
                {trimmedName || "Preview"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name" className="text-xs">
                Name
              </Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Coffee runs"
                maxLength={32}
                autoComplete="off"
                className="h-9"
                aria-invalid={Boolean(error) || isDuplicate}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-color" className="text-xs">
                Color
              </Label>
              <Input
                id="cat-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-12 cursor-pointer p-1"
              />
            </div>
          </div>

          {/* Preset swatches */}
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((preset) => {
              const selected = preset.toLowerCase() === color.toLowerCase();
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setColor(preset)}
                  aria-label={`Use color ${preset}`}
                  aria-pressed={selected}
                  className={cn(
                    "relative size-6 rounded-full ring-1 ring-inset ring-black/10 transition-transform hover:scale-110",
                    selected && "ring-2 ring-offset-1 ring-offset-background",
                  )}
                  style={{ backgroundColor: preset }}
                >
                  {selected && (
                    <Check className="absolute inset-0 m-auto size-3.5 text-white drop-shadow" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Icon picker */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium">Icon</span>
            <div
              role="radiogroup"
              aria-label="Icon"
              className="grid grid-cols-8 gap-1.5 sm:grid-cols-10"
            >
              {ICON_KEYS.map((key) => {
                const selected = icon === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={key}
                    onClick={() => setIcon(key)}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-lg border transition-colors",
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/70 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <CategoryIcon icon={key} className="size-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {error ? (
            <p
              role="alert"
              className="flex items-center gap-1.5 text-xs text-destructive"
            >
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            className="w-full gap-1.5"
            disabled={!trimmedName || isDuplicate}
          >
            <Plus className="size-4" />
            Add category
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}