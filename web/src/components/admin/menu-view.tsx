"use client";

import * as React from "react";
import {
  Check,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { StatusPill } from "@/components/admin/status-pill";
import { FilterChips, SearchField, Toolbar, ToolbarSpacer } from "@/components/admin/toolbar";
import { Badge, VegMark } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox, Switch } from "@/components/ui/form-controls";
import { FoodImage } from "@/components/ui/food-image";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { categories, menuItems } from "@/data/menu";
import type { CategorySlug, DishTag, MenuItem, SpiceLevel } from "@/types";
import { cn, formatPrice, slugify } from "@/lib/utils";

type CategoryFilter = CategorySlug | "all";
type ViewMode = "grid" | "table";

const SPICE_LEVELS: SpiceLevel[] = ["mild", "medium", "spicy"];

const ALL_TAGS: DishTag[] = [
  "bestseller",
  "new",
  "chef-special",
  "healthy",
  "high-protein",
  "jain-available",
  "kids-favourite",
  "value",
];

function tagLabel(tag: DishTag): string {
  return tag.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function MenuView() {
  const [items, setItems] = React.useState<MenuItem[]>(menuItems);
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<CategoryFilter>("all");
  const [view, setView] = React.useState<ViewMode>("grid");
  const [editing, setEditing] = React.useState<MenuItem | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const counts = React.useMemo(() => {
    const map = new Map<CategoryFilter, number>([["all", items.length]]);
    for (const item of items) {
      map.set(item.category, (map.get(item.category) ?? 0) + 1);
    }
    return map;
  }, [items]);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items
      .filter((item) => (category === "all" ? true : item.category === category))
      .filter((item) =>
        needle
          ? item.name.toLowerCase().includes(needle) ||
            item.description.toLowerCase().includes(needle)
          : true,
      );
  }, [items, category, query]);

  function toggleAvailability(id: string, available: boolean) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, available } : item)),
    );
  }

  function updatePrice(id: string, price: number) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, price } : item)),
    );
  }

  function saveItem(item: MenuItem) {
    setItems((current) => {
      const exists = current.some((candidate) => candidate.id === item.id);
      return exists
        ? current.map((candidate) => (candidate.id === item.id ? item : candidate))
        : [item, ...current];
    });
  }

  const deleteTarget = deleteId ? items.find((item) => item.id === deleteId) : undefined;

  const columns: DataTableColumn<MenuItem>[] = [
    {
      id: "name",
      header: "Dish",
      sortValue: (item) => item.name,
      cell: (item) => (
        <span className="flex items-center gap-3">
          <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-ink-100">
            <FoodImage imageId={item.imageId} alt={item.name} sizes="44px" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <VegMark className="size-3.5" />
              <span className="truncate font-medium text-ink-900">{item.name}</span>
            </span>
            <span className="block truncate text-xs text-ink-400">{item.serves}</span>
          </span>
        </span>
      ),
    },
    {
      id: "category",
      header: "Category",
      sortValue: (item) => item.category,
      cell: (item) => (
        <Badge variant="muted" size="sm">
          {categories.find((c) => c.slug === item.category)?.name ?? item.category}
        </Badge>
      ),
    },
    {
      id: "price",
      header: "Price",
      align: "right",
      sortValue: (item) => item.price,
      cell: (item) => (
        <PriceEditor
          value={item.price}
          label={item.name}
          onSave={(price) => updatePrice(item.id, price)}
        />
      ),
    },
    {
      id: "rating",
      header: "Rating",
      align: "right",
      sortValue: (item) => item.rating,
      cell: (item) => (
        <span className="tabular-nums text-ink-600">
          {item.rating.toFixed(1)}
          <span className="ml-1 text-xs text-ink-400">({item.ratingCount})</span>
        </span>
      ),
    },
    {
      id: "available",
      header: "Available",
      align: "center",
      sortValue: (item) => (item.available ? 1 : 0),
      cell: (item) => (
        <span className="flex justify-center" onClick={(event) => event.stopPropagation()}>
          <Switch
            checked={item.available}
            onCheckedChange={(checked) => toggleAvailability(item.id, checked)}
            aria-label={`${item.name} availability`}
          />
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      headerClassName: "sr-only",
      cell: (item) => (
        <span className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit ${item.name}`}
            onClick={() => setEditing(item)}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${item.name}`}
            className="text-red-500 hover:bg-red-50 hover:text-red-600"
            onClick={() => setDeleteId(item.id)}
          >
            <Trash2 />
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Catalogue"
        title="Menu management"
        description={`${items.length} dishes across ${categories.length} categories. Switch a dish off and it disappears from the storefront instantly.`}
        actions={
          <Button size="md" onClick={() => setCreating(true)}>
            <Plus />
            Add dish
          </Button>
        }
      />

      <Toolbar>
        <SearchField
          label="Search dishes by name or description"
          placeholder="Search dishes…"
          value={query}
          onValueChange={setQuery}
        />
        <ToolbarSpacer />
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-500">
            {filtered.filter((item) => !item.available).length} unavailable
          </span>
          <div
            role="radiogroup"
            aria-label="View mode"
            className="flex items-center gap-1 rounded-full bg-ink-100 p-1"
          >
            {([
              ["grid", LayoutGrid, "Grid view"],
              ["table", List, "Table view"],
            ] as const).map(([mode, Icon, label]) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={view === mode}
                aria-label={label}
                onClick={() => setView(mode)}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full transition-colors",
                  view === mode
                    ? "bg-white text-ink-900 shadow-soft"
                    : "text-ink-500 hover:text-ink-800",
                )}
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        </div>
      </Toolbar>

      <FilterChips
        label="Filter dishes by category"
        value={category}
        onValueChange={setCategory}
        options={[
          { value: "all" as CategoryFilter, label: "All", count: counts.get("all") ?? 0 },
          ...categories.map((meta) => ({
            value: meta.slug as CategoryFilter,
            label: meta.name,
            count: counts.get(meta.slug) ?? 0,
          })),
        ]}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="No dishes match"
          description="Try a different category or clear the search."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
            >
              Reset filters
            </Button>
          }
        />
      ) : view === "table" ? (
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(item) => item.id}
          caption="All dishes on the menu"
          pageSize={12}
          initialSort={{ columnId: "name", direction: "asc" }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((item) => (
            <DishCard
              key={item.id}
              item={item}
              onToggle={(available) => toggleAvailability(item.id, available)}
              onPriceSave={(price) => updatePrice(item.id, price)}
              onEdit={() => setEditing(item)}
              onDelete={() => setDeleteId(item.id)}
            />
          ))}
        </div>
      )}

      <DishFormDialog
        open={creating || editing !== null}
        item={editing}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
        onSave={saveItem}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={`Delete ${deleteTarget?.name ?? "this dish"}?`}
        description="The dish is removed from the storefront, search and every category rail. Past orders keep their record."
        confirmLabel="Delete dish"
        icon={Trash2}
        onConfirm={() =>
          deleteId && setItems((current) => current.filter((item) => item.id !== deleteId))
        }
      />
    </div>
  );
}

/* ========================================================================== */
/*  Grid card                                                                 */
/* ========================================================================== */

function DishCard({
  item,
  onToggle,
  onPriceSave,
  onEdit,
  onDelete,
}: {
  item: MenuItem;
  onToggle: (available: boolean) => void;
  onPriceSave: (price: number) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card
      className={cn(
        "group flex flex-col overflow-hidden rounded-3xl transition-shadow duration-300 hover:shadow-lift",
        !item.available && "opacity-70",
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-ink-100">
        <FoodImage
          imageId={item.imageId}
          alt={item.name}
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
          className="transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {item.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant={tag === "bestseller" ? "bestseller" : "default"} size="sm">
              {tagLabel(tag)}
            </Badge>
          ))}
        </div>
        {!item.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-900/45 backdrop-blur-[2px]">
            <StatusPill tone="danger" label="Unavailable" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-2">
          <VegMark className="mt-0.5 size-4 shrink-0" />
          <h3 className="min-w-0 flex-1 font-display text-base leading-snug text-ink-900">
            {item.name}
          </h3>
        </div>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-500">
          {item.description}
        </p>

        <div className="mt-3 flex items-center gap-3 text-xs text-ink-400">
          <span className="tabular-nums">★ {item.rating.toFixed(1)}</span>
          <span>·</span>
          <span>{item.prepTime} min</span>
          <span>·</span>
          <span className="capitalize">{item.spiceLevel}</span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <PriceEditor value={item.price} label={item.name} onSave={onPriceSave} />

          <div className="flex items-center gap-1">
            <Switch
              checked={item.available}
              onCheckedChange={onToggle}
              aria-label={`${item.name} availability`}
              className="mr-1"
            />
            <Button variant="ghost" size="icon-sm" aria-label={`Edit ${item.name}`} onClick={onEdit}>
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${item.name}`}
              className="text-red-500 hover:bg-red-50 hover:text-red-600"
              onClick={onDelete}
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ========================================================================== */
/*  Inline price editing                                                      */
/* ========================================================================== */

function PriceEditor({
  value,
  label,
  onSave,
}: {
  value: number;
  label: string;
  onSave: (price: number) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(String(value));

  React.useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function commit() {
    const parsed = Number(draft);
    if (Number.isFinite(parsed) && parsed > 0) onSave(Math.round(parsed));
    else setDraft(String(value));
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`Edit price for ${label}, currently ${formatPrice(value)}`}
        className="group/price inline-flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 text-base font-semibold tabular-nums text-ink-900 transition-colors hover:bg-brand-50 hover:text-brand-700"
      >
        {formatPrice(value)}
        <Pencil className="size-3 opacity-0 transition-opacity group-hover/price:opacity-100" />
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Input
        aria-label={`Price for ${label}`}
        type="number"
        min={1}
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") {
            setDraft(String(value));
            setEditing(false);
          }
        }}
        className="h-9 w-24 px-2 text-sm"
      />
      <Button variant="ghost" size="icon-sm" aria-label="Save price" onClick={commit}>
        <Check className="text-fresh-600" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Discard price change"
        onClick={() => {
          setDraft(String(value));
          setEditing(false);
        }}
      >
        <X />
      </Button>
    </span>
  );
}

/* ========================================================================== */
/*  Create / edit form                                                        */
/* ========================================================================== */

const BLANK: MenuItem = {
  id: "",
  slug: "",
  name: "",
  description: "",
  category: "north-indian",
  price: 149,
  imageId: "north-indian-1",
  isVeg: true,
  spiceLevel: "medium",
  prepTime: 20,
  calories: 350,
  protein: 10,
  serves: "1 person",
  rating: 0,
  ratingCount: 0,
  tags: [],
  available: true,
};

function DishFormDialog({
  open,
  item,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  item: MenuItem | null;
  onOpenChange: (open: boolean) => void;
  onSave: (item: MenuItem) => void;
}) {
  const [draft, setDraft] = React.useState<MenuItem>(item ?? BLANK);

  // Re-seed the form whenever the dialog opens against a different dish.
  React.useEffect(() => {
    if (open) setDraft(item ?? BLANK);
  }, [open, item]);

  function update<K extends keyof MenuItem>(key: K, value: MenuItem[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const slug = draft.slug || slugify(draft.name);
    onSave({
      ...draft,
      slug,
      id: draft.id || `new-${slug}`,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={submit}>
          <DialogHeader className="border-b border-ink-100 pb-5">
            <DialogTitle>{item ? `Edit ${item.name}` : "Add a new dish"}</DialogTitle>
            <DialogDescription>
              Changes go live on the storefront as soon as you save.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 p-6 sm:grid-cols-2">
            <Field label="Dish name" htmlFor="dish-name" className="sm:col-span-2">
              <Input
                id="dish-name"
                required
                value={draft.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="Paneer Butter Masala"
              />
            </Field>

            <Field label="Description" htmlFor="dish-description" className="sm:col-span-2">
              <Textarea
                id="dish-description"
                required
                value={draft.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder="What makes this dish worth ordering?"
              />
            </Field>

            <Field label="Category" htmlFor="dish-category">
              <Select
                value={draft.category}
                onValueChange={(value) => update("category", value as CategorySlug)}
              >
                <SelectTrigger id="dish-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((meta) => (
                    <SelectItem key={meta.slug} value={meta.slug}>
                      {meta.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Spice level" htmlFor="dish-spice">
              <Select
                value={draft.spiceLevel}
                onValueChange={(value) => update("spiceLevel", value as SpiceLevel)}
              >
                <SelectTrigger id="dish-spice">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPICE_LEVELS.map((level) => (
                    <SelectItem key={level} value={level} className="capitalize">
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Price (₹)" htmlFor="dish-price">
              <Input
                id="dish-price"
                type="number"
                min={1}
                required
                value={draft.price}
                onChange={(event) => update("price", Number(event.target.value))}
              />
            </Field>

            <Field label="Compare-at price (₹)" htmlFor="dish-compare" hint="Optional — shows as struck through">
              <Input
                id="dish-compare"
                type="number"
                min={0}
                value={draft.compareAtPrice ?? ""}
                onChange={(event) =>
                  update(
                    "compareAtPrice",
                    event.target.value ? Number(event.target.value) : undefined,
                  )
                }
              />
            </Field>

            <Field label="Prep time (min)" htmlFor="dish-prep">
              <Input
                id="dish-prep"
                type="number"
                min={1}
                value={draft.prepTime}
                onChange={(event) => update("prepTime", Number(event.target.value))}
              />
            </Field>

            <Field label="Calories" htmlFor="dish-calories">
              <Input
                id="dish-calories"
                type="number"
                min={0}
                value={draft.calories}
                onChange={(event) => update("calories", Number(event.target.value))}
              />
            </Field>

            <Field label="Serves" htmlFor="dish-serves">
              <Input
                id="dish-serves"
                value={draft.serves}
                onChange={(event) => update("serves", event.target.value)}
                placeholder="1 person"
              />
            </Field>

            <Field label="Image key" htmlFor="dish-image" hint="Resolves through the image registry">
              <Input
                id="dish-image"
                value={draft.imageId}
                onChange={(event) => update("imageId", event.target.value)}
                placeholder="north-indian-1"
              />
            </Field>

            <fieldset className="sm:col-span-2">
              <legend className="mb-2.5 text-sm font-medium text-ink-700">Tags</legend>
              <div className="flex flex-wrap gap-x-5 gap-y-3">
                {ALL_TAGS.map((tag) => (
                  <div key={tag} className="flex items-center gap-2">
                    <Checkbox
                      id={`tag-${tag}`}
                      checked={draft.tags.includes(tag)}
                      onCheckedChange={(checked) =>
                        update(
                          "tags",
                          checked
                            ? [...draft.tags, tag]
                            : draft.tags.filter((candidate) => candidate !== tag),
                        )
                      }
                    />
                    <Label htmlFor={`tag-${tag}`} className="text-ink-600">
                      {tagLabel(tag)}
                    </Label>
                  </div>
                ))}
              </div>
            </fieldset>

            <div className="flex items-center justify-between gap-4 rounded-2xl bg-ink-50 p-4 sm:col-span-2">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="dish-jain"
                  checked={draft.isJain ?? false}
                  onCheckedChange={(checked) => update("isJain", checked === true)}
                />
                <Label htmlFor="dish-jain">Jain (no onion or garlic)</Label>
              </div>

              <div className="flex items-center gap-3">
                <Label htmlFor="dish-available">Available today</Label>
                <Switch
                  id="dish-available"
                  checked={draft.available}
                  onCheckedChange={(checked) => update("available", checked)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-ink-100 pt-5">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{item ? "Save changes" : "Add dish"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-ink-400">{hint}</p>}
    </div>
  );
}
