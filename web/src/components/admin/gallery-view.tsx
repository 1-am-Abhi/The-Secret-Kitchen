"use client";

import * as React from "react";
import { Check, CloudUpload, ImageOff, Loader2, Pencil, Trash2, X } from "lucide-react";

import { ApiErrorNotice, LoadingBlock, useAdminQuery } from "@/components/admin/admin-data";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { FilterChips, SearchField, Toolbar, ToolbarSpacer } from "@/components/admin/toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FoodImage } from "@/components/ui/food-image";
import { Input } from "@/components/ui/input";
import {
  GALLERY_CATEGORIES,
  deleteAdminGalleryImage,
  listAdminGallery,
  updateAdminGalleryImage,
  uploadAdminGalleryImage,
  type AdminGalleryCategory,
  type AdminGalleryImage,
} from "@/lib/admin-orders";
import { cn, distributeIntoColumns } from "@/lib/utils";

type CategoryFilter = AdminGalleryCategory | "all";

const CATEGORY_FILTERS: CategoryFilter[] = ["all", ...GALLERY_CATEGORIES];

const CATEGORY_LABEL: Record<CategoryFilter, string> = {
  all: "All media",
  dishes: "Dishes",
  kitchen: "Kitchen",
  team: "Team",
  packaging: "Packaging",
  moments: "Moments",
};

const ASPECT_CLASS: Record<AdminGalleryImage["aspect"], string> = {
  portrait: "aspect-[3/4]",
  landscape: "aspect-[4/3]",
  square: "aspect-square",
};

export function GalleryView() {
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<CategoryFilter>("all");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const load = React.useCallback((signal: AbortSignal) => listAdminGallery(signal), []);
  const gallery = useAdminQuery(load);

  const [assets, setAssets] = React.useState<AdminGalleryImage[]>([]);
  React.useEffect(() => setAssets(gallery.data ?? []), [gallery.data]);

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

  async function updateCaption(id: string, caption: string) {
    const previous = assets;
    setActionError(null);
    setAssets((current) =>
      current.map((asset) => (asset.id === id ? { ...asset, caption } : asset)),
    );

    const result = await updateAdminGalleryImage(id, { caption });
    if (!result.ok) {
      setAssets(previous);
      setActionError(`Could not save that caption — ${result.message}`);
    }
  }

  async function remove(id: string) {
    const previous = assets;
    setActionError(null);
    setAssets((current) => current.filter((asset) => asset.id !== id));

    const result = await deleteAdminGalleryImage(id);
    if (!result.ok) {
      setAssets(previous);
      setActionError(`Could not delete that photograph — ${result.message}`);
    }
  }

  async function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setActionError(null);
    setUploading(true);
    const result = await uploadAdminGalleryImage(file, {
      // The operator renames it inline straight afterwards; the filename is a
      // truthful starting point rather than an invented caption.
      caption: file.name.replace(/\.[^.]+$/, ""),
      category: category === "all" ? "dishes" : category,
      aspect: "square",
      sortOrder: assets.length,
    });
    setUploading(false);

    if (result.ok) {
      setAssets((current) => [result.data, ...current]);
      setEditingId(result.data.id);
      return;
    }
    setActionError(`Upload failed — ${result.message}`);
  }

  const deleteTarget = deleteId ? assets.find((asset) => asset.id === deleteId) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Media"
        title="Gallery library"
        description="Every photograph the storefront can draw on. Uploads land in Cloudinary and are available to the gallery page immediately."
      />

      {gallery.failure && <ApiErrorNotice failure={gallery.failure} onRetry={gallery.reload} />}

      <div role="status" aria-live="polite">
        {actionError && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </p>
        )}
      </div>

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
          void upload(event.dataTransfer.files);
        }}
        className={cn(
          "rounded-3xl border-2 border-dashed p-8 text-center transition-colors duration-300",
          dragActive
            ? "border-brand-400 bg-brand-50"
            : "border-ink-200 bg-white hover:border-brand-300 hover:bg-brand-50/40",
        )}
      >
        <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          {uploading ? (
            <Loader2 className="size-6 animate-spin" aria-hidden />
          ) : (
            <CloudUpload className="size-6" aria-hidden />
          )}
        </span>
        <p className="font-display text-lg text-ink-900">
          {uploading ? "Uploading…" : "Drop photographs here"}
        </p>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-500">
          JPEG, PNG, WebP, AVIF or GIF up to 5 MB. Shots are compressed and served through the
          image CDN automatically — upload the highest resolution you have.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button size="md" disabled={uploading} asChild>
            <label className="cursor-pointer">
              Choose a file
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                aria-label="Upload a gallery photograph"
                onChange={(event) => {
                  void upload(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
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

      {gallery.loading && !gallery.data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <LoadingBlock key={index} className="h-64" label="Loading the media library" />
          ))}
        </div>
      ) : gallery.failure ? null : filtered.length === 0 ? (
        <EmptyState
          icon={ImageOff}
          title={assets.length === 0 ? "The library is empty" : "No media matches"}
          description={
            assets.length === 0
              ? "Nothing has been published to the gallery yet. Upload a photograph to start."
              : "Try another category, or upload something new."
          }
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
                  onCaptionChange={(caption) => void updateCaption(asset.id, caption)}
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
        onConfirm={() => deleteId && void remove(deleteId)}
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
  onDelete,
}: {
  asset: AdminGalleryImage;
  editing: boolean;
  onEdit: () => void;
  onEditEnd: () => void;
  onCaptionChange: (caption: string) => void;
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

        <div className="absolute right-3 top-3 flex gap-1.5 opacity-0 transition-opacity duration-300 focus-within:opacity-100 group-hover:opacity-100">
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
          <span className="capitalize">{asset.aspect}</span>
          <span>·</span>
          <span className="tabular-nums">Position {asset.sortOrder + 1}</span>
        </div>
      </div>
    </Card>
  );
}
