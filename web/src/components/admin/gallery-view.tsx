"use client";

import * as React from "react";
import { Check, CloudUpload, ImageOff, Pencil, Star, Trash2, X } from "lucide-react";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { FilterChips, SearchField, Toolbar, ToolbarSpacer } from "@/components/admin/toolbar";
import { formatDay } from "@/components/admin/status-maps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FoodImage } from "@/components/ui/food-image";
import { Input } from "@/components/ui/input";
import { mediaAssets, type MediaAsset } from "@/data/admin-mock";
import { cn, distributeIntoColumns } from "@/lib/utils";

type CategoryFilter = MediaAsset["category"] | "all";

const CATEGORY_FILTERS: CategoryFilter[] = [
  "all",
  "dishes",
  "kitchen",
  "team",
  "packaging",
  "moments",
];

const CATEGORY_LABEL: Record<CategoryFilter, string> = {
  all: "All media",
  dishes: "Dishes",
  kitchen: "Kitchen",
  team: "Team",
  packaging: "Packaging",
  moments: "Moments",
};

const ASPECT_CLASS: Record<MediaAsset["aspect"], string> = {
  portrait: "aspect-[3/4]",
  landscape: "aspect-[4/3]",
  square: "aspect-square",
};

function formatBytes(bytes: number): string {
  return bytes >= 1_048_576
    ? `${(bytes / 1_048_576).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

export function GalleryView() {
  const [assets, setAssets] = React.useState<MediaAsset[]>(mediaAssets);
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<CategoryFilter>("all");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [dragActive, setDragActive] = React.useState(false);

  const counts = React.useMemo(() => {
    const map = new Map<CategoryFilter, number>([["all", assets.length]]);
    for (const asset of assets) {
      map.set(asset.category, (map.get(asset.category) ?? 0) + 1);
    }
    return map;
  }, [assets]);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return assets
      .filter((asset) => (category === "all" ? true : asset.category === category))
      .filter((asset) => (needle ? asset.caption.toLowerCase().includes(needle) : true));
  }, [assets, category, query]);

  // Round-robin into columns so the masonry keeps its editorial rhythm rather
  // than leaving one column short.
  const columns = distributeIntoColumns(filtered, 3);

  function updateCaption(id: string, caption: string) {
    setAssets((current) =>
      current.map((asset) => (asset.id === id ? { ...asset, caption } : asset)),
    );
  }

  function toggleFeatured(id: string) {
    setAssets((current) =>
      current.map((asset) =>
        asset.id === id ? { ...asset, featured: !asset.featured } : asset,
      ),
    );
  }

  const deleteTarget = deleteId ? assets.find((asset) => asset.id === deleteId) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Media"
        title="Gallery library"
        description="Every photograph the storefront can draw on. Uploads land in Cloudinary and are available to the gallery page immediately."
      />

      {/* ---- Upload dropzone --------------------------------------------- */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        className={cn(
          "rounded-3xl border-2 border-dashed p-8 text-center transition-colors duration-300",
          dragActive
            ? "border-brand-400 bg-brand-50"
            : "border-ink-200 bg-white hover:border-brand-300 hover:bg-brand-50/40",
        )}
      >
        <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <CloudUpload className="size-6" aria-hidden />
        </span>
        <p className="font-display text-lg text-ink-900">Drop photographs here</p>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-500">
          JPG, PNG or WebP up to 10 MB each. Shots are compressed and served through the image
          CDN automatically — upload the highest resolution you have.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button size="md" asChild>
            <label className="cursor-pointer">
              Choose files
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                aria-label="Upload gallery photographs"
              />
            </label>
          </Button>
          <Button variant="outline" size="md">
            Import from Cloudinary
          </Button>
        </div>
      </div>

      <Toolbar>
        <SearchField
          label="Search media by caption"
          placeholder="Search captions…"
          value={query}
          onValueChange={setQuery}
        />
        <ToolbarSpacer />
        <FilterChips
          label="Filter media by category"
          value={category}
          onValueChange={setCategory}
          options={CATEGORY_FILTERS.map((value) => ({
            value,
            label: CATEGORY_LABEL[value],
            count: counts.get(value) ?? 0,
          }))}
        />
      </Toolbar>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ImageOff}
          title="No media matches"
          description="Try another category, or upload something new."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {columns.map((column, columnIndex) => (
            <div key={columnIndex} className="flex flex-col gap-4">
              {column.map((asset) => (
                <MediaCard
                  key={asset.id}
                  asset={asset}
                  editing={editingId === asset.id}
                  onEdit={() => setEditingId(asset.id)}
                  onEditEnd={() => setEditingId(null)}
                  onCaptionChange={(caption) => updateCaption(asset.id, caption)}
                  onToggleFeatured={() => toggleFeatured(asset.id)}
                  onDelete={() => setDeleteId(asset.id)}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete this photograph?"
        description={
          deleteTarget
            ? `"${deleteTarget.caption}" is removed from the media library and any storefront section using it falls back to the category default.`
            : ""
        }
        confirmLabel="Delete photo"
        icon={Trash2}
        onConfirm={() =>
          deleteId && setAssets((current) => current.filter((asset) => asset.id !== deleteId))
        }
      />
    </div>
  );
}

function MediaCard({
  asset,
  editing,
  onEdit,
  onEditEnd,
  onCaptionChange,
  onToggleFeatured,
  onDelete,
}: {
  asset: MediaAsset;
  editing: boolean;
  onEdit: () => void;
  onEditEnd: () => void;
  onCaptionChange: (caption: string) => void;
  onToggleFeatured: () => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = React.useState(asset.caption);

  React.useEffect(() => {
    setDraft(asset.caption);
  }, [asset.caption]);

  return (
    <Card className="group overflow-hidden rounded-3xl transition-shadow duration-300 hover:shadow-lift">
      <div className={cn("relative overflow-hidden bg-ink-100", ASPECT_CLASS[asset.aspect])}>
        <FoodImage
          imageId={asset.imageId}
          alt={asset.caption}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-105"
        />

        {asset.featured && (
          <span className="absolute left-3 top-3">
            <Badge variant="bestseller" size="sm">
              <Star className="size-3" aria-hidden />
              Featured
            </Badge>
          </span>
        )}

        <div className="absolute right-3 top-3 flex gap-1.5 opacity-0 transition-opacity duration-300 focus-within:opacity-100 group-hover:opacity-100">
          <button
            type="button"
            onClick={onToggleFeatured}
            aria-label={
              asset.featured
                ? `Remove ${asset.caption} from featured`
                : `Feature ${asset.caption}`
            }
            aria-pressed={asset.featured}
            className="flex size-8 items-center justify-center rounded-full bg-white/90 text-ink-700 shadow-soft backdrop-blur transition-colors hover:bg-white hover:text-brand-600"
          >
            <Star className={cn("size-3.5", asset.featured && "fill-brand-500 text-brand-500")} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${asset.caption}`}
            className="flex size-8 items-center justify-center rounded-full bg-white/90 text-ink-700 shadow-soft backdrop-blur transition-colors hover:bg-red-500 hover:text-white"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="p-4">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <label htmlFor={`caption-${asset.id}`} className="sr-only">
              Caption
            </label>
            <Input
              id={`caption-${asset.id}`}
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onCaptionChange(draft);
                  onEditEnd();
                }
                if (event.key === "Escape") {
                  setDraft(asset.caption);
                  onEditEnd();
                }
              }}
              className="h-10 text-sm"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Save caption"
              onClick={() => {
                onCaptionChange(draft);
                onEditEnd();
              }}
            >
              <Check className="text-fresh-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Discard caption change"
              onClick={() => {
                setDraft(asset.caption);
                onEditEnd();
              }}
            >
              <X />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            className="group/caption flex w-full items-start gap-2 rounded-lg text-left transition-colors hover:text-brand-700"
          >
            <span className="min-w-0 flex-1 text-sm leading-snug text-ink-800">
              {asset.caption}
            </span>
            <Pencil className="mt-0.5 size-3.5 shrink-0 text-ink-300 transition-colors group-hover/caption:text-brand-500" />
          </button>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-400">
          <Badge variant="muted" size="sm" className="capitalize">
            {asset.category}
          </Badge>
          <span>{formatDay(asset.uploadedAt)}</span>
          <span>·</span>
          <span className="tabular-nums">{formatBytes(asset.sizeBytes)}</span>
        </div>
      </div>
    </Card>
  );
}
