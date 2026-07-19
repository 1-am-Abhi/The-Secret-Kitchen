"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  Eraser,
  MessageSquareQuote,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Star,
  Trash2,
} from "lucide-react";

import { ApiErrorNotice, LoadingBlock, LoadingRows, useAdminQuery } from "@/components/admin/admin-data";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { StatusPill } from "@/components/admin/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/form-controls";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BANNER_TONES,
  BLANK_CONTENT,
  CONTENT_DESCRIPTION,
  CONTENT_LABEL,
  STAT_METRIC_LABEL,
  STAT_METRICS,
  toContentDraft,
  validateContent,
} from "@/lib/admin-content-schema";
import {
  CONTENT_KEYS,
  deleteAdminContent,
  deleteAdminReview,
  formatOrderDateTime,
  listAdminContent,
  listAdminReviews,
  saveAdminContent,
  updateAdminReview,
  type AdminContentBlock,
  type AdminReview,
  type ContentKey,
} from "@/lib/admin-orders";
import type {
  BannersContent,
  ContentBlockMap,
  DeliveryInfoContent,
  FeaturedContent,
  HeroContent,
  MilestonesContent,
  StatsContent,
  StoryContent,
  TeamContent,
} from "@/lib/storefront-data";
import { cn } from "@/lib/utils";

/** Per-field messages, keyed by the dotted path the form fields use. */
type FieldErrors = Record<string, string[]>;

function fieldError(errors: FieldErrors, field: string): string | undefined {
  return errors[field]?.[0];
}

function FieldMessage({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600">{message}</p>;
}

/** The reviews tab is a moderation queue, not a content block — hence its own id. */
const REVIEWS_TAB = "reviews";

export function ContentView() {
  const load = React.useCallback((signal: AbortSignal) => listAdminContent(signal), []);
  const content = useAdminQuery(load);

  const blocks = React.useMemo(() => {
    const map = new Map<ContentKey, AdminContentBlock>();
    for (const block of content.data?.blocks ?? []) map.set(block.key, block);
    return map;
  }, [content.data]);

  // Prefer the registry the API advertises; fall back to the one this build
  // knows so the editor is never blank just because the listing was thin.
  const keys = content.data?.keys?.length ? content.data.keys : [...CONTENT_KEYS];

  const authored = keys.filter((key) => blocks.has(key)).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Storefront"
        title="Site content & reviews"
        description="The words on the homepage and About page, and the customer reviews that appear beneath them."
        actions={
          <Button variant="outline" size="md" onClick={content.reload} disabled={content.loading}>
            <RefreshCw />
            Refresh
          </Button>
        }
      />

      {content.failure && <ApiErrorNotice failure={content.failure} onRetry={content.reload} />}

      {content.loading && !content.data ? (
        <LoadingBlock className="h-96" label="Loading site content" />
      ) : content.failure ? null : (
        <>
          <p className="text-sm text-ink-500">
            <span className="font-medium tabular-nums text-ink-900">{authored}</span> of{" "}
            <span className="font-medium tabular-nums text-ink-900">{keys.length}</span> blocks have
            been written. An unwritten block renders nothing at all on the storefront — it is never
            filled in with sample copy.
          </p>

          <Tabs defaultValue={keys[0] ?? REVIEWS_TAB}>
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <TabsList className="flex-nowrap">
                {keys.map((key) => (
                  <TabsTrigger key={key} value={key} className="px-4 py-2 text-xs sm:text-sm">
                    {CONTENT_LABEL[key]}
                    {!blocks.has(key) && (
                      <span className="ml-1.5 size-1.5 rounded-full bg-ink-300" aria-hidden />
                    )}
                  </TabsTrigger>
                ))}
                <TabsTrigger value={REVIEWS_TAB} className="px-4 py-2 text-xs sm:text-sm">
                  Customer reviews
                </TabsTrigger>
              </TabsList>
            </div>

            {keys.map((key) => (
              <TabsContent key={key} value={key}>
                <ContentSection
                  contentKey={key}
                  block={blocks.get(key) ?? null}
                  onChanged={content.reload}
                />
              </TabsContent>
            ))}

            <TabsContent value={REVIEWS_TAB}>
              <ReviewsPanel />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

/* ========================================================================== */
/*  One content block                                                         */
/* ========================================================================== */

/**
 * Dispatches a key to its form.
 *
 * Each block has its own JSON shape, so each gets its own typed editor rather
 * than a generic key/value grid — an operator editing the team list should see
 * name and role fields, not a textarea full of braces.
 */
function ContentSection({
  contentKey,
  block,
  onChanged,
}: {
  contentKey: ContentKey;
  block: AdminContentBlock | null;
  onChanged: () => void;
}) {
  switch (contentKey) {
    case "home.hero":
      return (
        <SectionEditor contentKey="home.hero" block={block} onChanged={onChanged}>
          {(state) => <HeroFields {...state} />}
        </SectionEditor>
      );
    case "home.stats":
      return (
        <SectionEditor contentKey="home.stats" block={block} onChanged={onChanged}>
          {(state) => <StatsFields {...state} />}
        </SectionEditor>
      );
    case "home.banners":
      return (
        <SectionEditor contentKey="home.banners" block={block} onChanged={onChanged}>
          {(state) => <BannersFields {...state} />}
        </SectionEditor>
      );
    case "home.featured":
      return (
        <SectionEditor contentKey="home.featured" block={block} onChanged={onChanged}>
          {(state) => <FeaturedFields {...state} />}
        </SectionEditor>
      );
    case "home.deliveryInfo":
      return (
        <SectionEditor contentKey="home.deliveryInfo" block={block} onChanged={onChanged}>
          {(state) => <DeliveryInfoFields {...state} />}
        </SectionEditor>
      );
    case "about.story":
      return (
        <SectionEditor contentKey="about.story" block={block} onChanged={onChanged}>
          {(state) => <StoryFields {...state} />}
        </SectionEditor>
      );
    case "about.milestones":
      return (
        <SectionEditor contentKey="about.milestones" block={block} onChanged={onChanged}>
          {(state) => <MilestonesFields {...state} />}
        </SectionEditor>
      );
    case "about.team":
      return (
        <SectionEditor contentKey="about.team" block={block} onChanged={onChanged}>
          {(state) => <TeamFields {...state} />}
        </SectionEditor>
      );
  }
}

interface SectionState<K extends ContentKey> {
  draft: ContentBlockMap[K];
  set: (next: ContentBlockMap[K]) => void;
  errors: FieldErrors;
}

/**
 * The shared frame around every block form: load, edit, validate, PUT.
 *
 * Validation runs against a local mirror of the server's schema first, so a
 * too-long headline is reported against its own field. Anything the server
 * still rejects comes back as `fieldErrors` and is merged into the same map,
 * which means a rule that exists only on the server lands inline too.
 */
function SectionEditor<K extends ContentKey>({
  contentKey,
  block,
  onChanged,
  children,
}: {
  contentKey: K;
  block: AdminContentBlock | null;
  onChanged: () => void;
  children: (state: SectionState<K>) => React.ReactNode;
}) {
  const initial = React.useMemo<ContentBlockMap[K]>(
    () => (block ? toContentDraft(contentKey, block.value) : BLANK_CONTENT[contentKey]),
    [contentKey, block],
  );

  const [draft, setDraft] = React.useState<ContentBlockMap[K]>(initial);
  const [published, setPublished] = React.useState(block?.published ?? true);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);

  /**
   * A successful save re-reads the listing, which arrives back here as a new
   * `block` — the same edit the operator just made. Without this the sync
   * below would wipe the "Saved." confirmation in the same frame it appeared.
   */
  const justSaved = React.useRef(false);

  React.useEffect(() => {
    setDraft(initial);
    setPublished(block?.published ?? true);
    setErrors({});
    if (justSaved.current) {
      justSaved.current = false;
      return;
    }
    setSaved(false);
  }, [initial, block]);

  function edit(next: ContentBlockMap[K]) {
    setDraft(next);
    setSaved(false);
  }

  async function save() {
    setSaved(false);
    const validation = validateContent(contentKey, draft);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSaving(true);
    const result = await saveAdminContent(contentKey, validation.value, published);
    setSaving(false);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? { _: [result.message] });
      return;
    }
    justSaved.current = true;
    setSaved(true);
    onChanged();
  }

  async function clear() {
    setSaving(true);
    const result = await deleteAdminContent(contentKey);
    setSaving(false);

    if (!result.ok) {
      setErrors({ _: [result.message] });
      return;
    }
    setErrors({});
    setSaved(false);
    onChanged();
  }

  return (
    <Card className="flex flex-col gap-5 rounded-3xl p-5 sm:p-6">
      <div className="flex flex-col gap-3 border-b border-ink-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl text-ink-900">{CONTENT_LABEL[contentKey]}</h2>
            <Badge variant="muted" size="sm" className="font-mono">
              {contentKey}
            </Badge>
            {block ? (
              <StatusPill
                tone={block.published ? "success" : "muted"}
                size="sm"
                label={block.published ? "Published" : "Hidden"}
              />
            ) : (
              <StatusPill tone="muted" size="sm" label="Not written yet" />
            )}
          </div>
          <p className="mt-2 max-w-2xl text-sm text-ink-500">{CONTENT_DESCRIPTION[contentKey]}</p>
          <p className="mt-1.5 text-xs text-ink-400">
            {block && block.updatedAt
              ? `Last saved ${formatOrderDateTime(block.updatedAt)}. The API does not record which admin saved it.`
              : "Nothing has been saved for this block, so the storefront renders nothing here."}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3 rounded-2xl bg-ink-50 px-4 py-3">
          <Label htmlFor={`published-${contentKey}`} className="text-sm">
            Visible on site
          </Label>
          <Switch
            id={`published-${contentKey}`}
            checked={published}
            onCheckedChange={(checked) => {
              setPublished(checked);
              setSaved(false);
            }}
          />
        </div>
      </div>

      <div role="alert" aria-live="polite">
        {fieldError(errors, "_") && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {fieldError(errors, "_")}
          </p>
        )}
      </div>

      {children({ draft, set: edit, errors })}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink-100 pt-5">
        <p className="mr-auto text-sm text-fresh-700" role="status" aria-live="polite">
          {saved ? "Saved." : ""}
        </p>

        {block && (
          <Button
            variant="ghost"
            size="md"
            className="text-red-500 hover:bg-red-50 hover:text-red-600"
            onClick={() => setClearing(true)}
            disabled={saving}
          >
            <Eraser />
            Clear block
          </Button>
        )}
        <Button variant="outline" size="md" onClick={() => edit(initial)} disabled={saving}>
          <RotateCcw />
          Reset
        </Button>
        <Button size="md" onClick={() => void save()} disabled={saving}>
          <Save />
          {saving ? "Saving…" : "Save section"}
        </Button>
      </div>

      <ConfirmDialog
        open={clearing}
        onOpenChange={setClearing}
        title={`Clear ${CONTENT_LABEL[contentKey]}?`}
        description="The block is deleted and the storefront renders nothing in its place until it is written again."
        confirmLabel="Clear block"
        icon={Eraser}
        onConfirm={() => void clear()}
      />
    </Card>
  );
}

/* ========================================================================== */
/*  Repeatable list scaffolding                                               */
/* ========================================================================== */

function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return [...items];
  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return [...items];
  next.splice(to, 0, moved);
  return next;
}

/** One row of a repeatable list, with its reorder and remove controls. */
function ListRow({
  index,
  count,
  label,
  onMove,
  onRemove,
  children,
}: {
  index: number;
  count: number;
  label: string;
  onMove: (to: number) => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <li className="rounded-2xl border border-ink-200/70 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
          {label} {index + 1}
        </p>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Move ${label.toLowerCase()} ${index + 1} up`}
            disabled={index === 0}
            onClick={() => onMove(index - 1)}
          >
            <ArrowUp />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Move ${label.toLowerCase()} ${index + 1} down`}
            disabled={index === count - 1}
            onClick={() => onMove(index + 1)}
          >
            <ArrowDown />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
            className="text-red-500 hover:bg-red-50 hover:text-red-600"
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      {children}
    </li>
  );
}

function ListEmpty({ message }: { message: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/60 px-4 py-6 text-center text-sm text-ink-500">
      {message}
    </p>
  );
}

/* ========================================================================== */
/*  Home · hero                                                               */
/* ========================================================================== */

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldMessage message={error} />
    </div>
  );
}

function HeroFields({ draft, set, errors }: SectionState<"home.hero">) {
  const hero: HeroContent = draft;

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <TextField
        id="hero-eyebrow"
        label="Eyebrow"
        value={hero.eyebrow ?? ""}
        error={fieldError(errors, "eyebrow")}
        onChange={(value) => set({ ...hero, eyebrow: value })}
      />
      <TextField
        id="hero-image"
        label="Image id"
        value={hero.imageId ?? ""}
        error={fieldError(errors, "imageId")}
        onChange={(value) => set({ ...hero, imageId: value })}
      />
      <TextField
        id="hero-title"
        label="Headline"
        className="sm:col-span-2"
        value={hero.title ?? ""}
        error={fieldError(errors, "title")}
        onChange={(value) => set({ ...hero, title: value })}
      />

      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor="hero-subtitle">Sub-heading</Label>
        <Textarea
          id="hero-subtitle"
          value={hero.subtitle ?? ""}
          aria-invalid={Boolean(fieldError(errors, "subtitle"))}
          onChange={(event) => set({ ...hero, subtitle: event.target.value })}
        />
        <FieldMessage message={fieldError(errors, "subtitle")} />
      </div>

      <TextField
        id="hero-cta1-label"
        label="Primary button label"
        value={hero.primaryCtaLabel ?? ""}
        error={fieldError(errors, "primaryCtaLabel")}
        onChange={(value) => set({ ...hero, primaryCtaLabel: value })}
      />
      <TextField
        id="hero-cta1-href"
        label="Primary button link"
        placeholder="/menu"
        value={hero.primaryCtaHref ?? ""}
        error={fieldError(errors, "primaryCtaHref")}
        onChange={(value) => set({ ...hero, primaryCtaHref: value })}
      />
      <TextField
        id="hero-cta2-label"
        label="Secondary button label"
        value={hero.secondaryCtaLabel ?? ""}
        error={fieldError(errors, "secondaryCtaLabel")}
        onChange={(value) => set({ ...hero, secondaryCtaLabel: value })}
      />
      <TextField
        id="hero-cta2-href"
        label="Secondary button link"
        placeholder="/tiffin"
        value={hero.secondaryCtaHref ?? ""}
        error={fieldError(errors, "secondaryCtaHref")}
        onChange={(value) => set({ ...hero, secondaryCtaHref: value })}
      />
    </div>
  );
}

/* ========================================================================== */
/*  Home · statistics                                                         */
/* ========================================================================== */

function StatsFields({ draft, set, errors }: SectionState<"home.stats">) {
  const stats: StatsContent = draft;
  const items = stats.items;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-ink-50 p-4">
        <div>
          <Label htmlFor="stats-show">Show the figures strip</Label>
          <p className="mt-1 text-xs text-ink-500">
            The numbers are read live from the database. Only their wording is editable here — a
            figure can never be typed in.
          </p>
        </div>
        <Switch
          id="stats-show"
          checked={stats.show}
          onCheckedChange={(checked) => set({ ...stats, show: checked })}
        />
      </div>

      {items.length === 0 ? (
        <ListEmpty message="No figures are listed, so the hero shows none." />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item, index) => (
            <ListRow
              key={index}
              index={index}
              count={items.length}
              label="Figure"
              onMove={(to) => set({ ...stats, items: moveItem(items, index, to) })}
              onRemove={() =>
                set({ ...stats, items: items.filter((_, position) => position !== index) })
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`stat-metric-${index}`}>Metric</Label>
                  <Select
                    value={item.metric}
                    onValueChange={(value) =>
                      set({
                        ...stats,
                        items: items.map((entry, position) =>
                          position === index
                            ? { ...entry, metric: value as StatsContent["items"][number]["metric"] }
                            : entry,
                        ),
                      })
                    }
                  >
                    <SelectTrigger id={`stat-metric-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAT_METRICS.map((metric) => (
                        <SelectItem key={metric} value={metric}>
                          {STAT_METRIC_LABEL[metric]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldMessage message={fieldError(errors, `items.${index}.metric`)} />
                </div>

                <TextField
                  id={`stat-label-${index}`}
                  label="Label shown under the number"
                  value={item.label}
                  error={fieldError(errors, `items.${index}.label`)}
                  onChange={(value) =>
                    set({
                      ...stats,
                      items: items.map((entry, position) =>
                        position === index ? { ...entry, label: value } : entry,
                      ),
                    })
                  }
                />
              </div>
            </ListRow>
          ))}
        </ul>
      )}

      <FieldMessage message={fieldError(errors, "items")} />

      <div>
        <Button
          type="button"
          variant="outline"
          size="md"
          disabled={items.length >= 6}
          onClick={() =>
            set({ ...stats, items: [...items, { metric: "mealsServed", label: "" }] })
          }
        >
          <Plus />
          Add a figure
        </Button>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  Home · banners                                                            */
/* ========================================================================== */

function BannersFields({ draft, set, errors }: SectionState<"home.banners">) {
  const banners: BannersContent = draft;
  const items = banners.items;

  function patch(index: number, changes: Partial<BannersContent["items"][number]>) {
    set({
      ...banners,
      items: items.map((entry, position) =>
        position === index ? { ...entry, ...changes } : entry,
      ),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 ? (
        <ListEmpty message="No banners, so the homepage shows none." />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((banner, index) => (
            <ListRow
              key={index}
              index={index}
              count={items.length}
              label="Banner"
              onMove={(to) => set({ ...banners, items: moveItem(items, index, to) })}
              onRemove={() =>
                set({ ...banners, items: items.filter((_, position) => position !== index) })
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  id={`banner-id-${index}`}
                  label="Identifier"
                  value={banner.id}
                  placeholder="festive-week"
                  error={fieldError(errors, `items.${index}.id`)}
                  onChange={(value) => patch(index, { id: value })}
                />
                <TextField
                  id={`banner-title-${index}`}
                  label="Title"
                  value={banner.title}
                  error={fieldError(errors, `items.${index}.title`)}
                  onChange={(value) => patch(index, { title: value })}
                />
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <Label htmlFor={`banner-subtitle-${index}`}>Subtitle</Label>
                  <Textarea
                    id={`banner-subtitle-${index}`}
                    value={banner.subtitle ?? ""}
                    onChange={(event) => patch(index, { subtitle: event.target.value })}
                  />
                  <FieldMessage message={fieldError(errors, `items.${index}.subtitle`)} />
                </div>
                <TextField
                  id={`banner-cta-label-${index}`}
                  label="Button label"
                  value={banner.ctaLabel ?? ""}
                  error={fieldError(errors, `items.${index}.ctaLabel`)}
                  onChange={(value) => patch(index, { ctaLabel: value })}
                />
                <TextField
                  id={`banner-cta-href-${index}`}
                  label="Button link"
                  value={banner.ctaHref ?? ""}
                  error={fieldError(errors, `items.${index}.ctaHref`)}
                  onChange={(value) => patch(index, { ctaHref: value })}
                />

                <div className="flex flex-col gap-2">
                  <Label htmlFor={`banner-tone-${index}`}>Tone</Label>
                  <Select
                    value={banner.tone}
                    onValueChange={(value) =>
                      patch(index, { tone: value as BannersContent["items"][number]["tone"] })
                    }
                  >
                    <SelectTrigger id={`banner-tone-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BANNER_TONES.map((tone) => (
                        <SelectItem key={tone} value={tone} className="capitalize">
                          {tone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-2xl bg-ink-50 p-4">
                  <Label htmlFor={`banner-active-${index}`}>Show this banner</Label>
                  <Switch
                    id={`banner-active-${index}`}
                    checked={banner.active}
                    onCheckedChange={(checked) => patch(index, { active: checked })}
                  />
                </div>
              </div>
            </ListRow>
          ))}
        </ul>
      )}

      <FieldMessage message={fieldError(errors, "items")} />

      <div>
        <Button
          type="button"
          variant="outline"
          size="md"
          disabled={items.length >= 8}
          onClick={() =>
            set({
              ...banners,
              items: [...items, { id: "", title: "", tone: "brand", active: true }],
            })
          }
        >
          <Plus />
          Add a banner
        </Button>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  Home · featured                                                           */
/* ========================================================================== */

function CodeList({
  label,
  hint,
  field,
  codes,
  errors,
  onChange,
}: {
  label: string;
  hint: string;
  field: "dishCodes" | "offerCodes";
  codes: string[];
  errors: FieldErrors;
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold text-ink-900">{label}</p>
        <p className="mt-1 text-xs text-ink-500">{hint}</p>
      </div>

      {codes.length === 0 ? (
        <ListEmpty message="Nothing listed — the homepage falls back to showing none." />
      ) : (
        <ul className="flex flex-col gap-2">
          {codes.map((code, index) => (
            <li key={index} className="flex items-center gap-2">
              <Input
                aria-label={`${label} ${index + 1}`}
                value={code}
                className="font-mono"
                aria-invalid={Boolean(fieldError(errors, `${field}.${index}`))}
                onChange={(event) =>
                  onChange(
                    codes.map((entry, position) =>
                      position === index ? event.target.value : entry,
                    ),
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${label} ${index + 1} up`}
                disabled={index === 0}
                onClick={() => onChange(moveItem(codes, index, index - 1))}
              >
                <ArrowUp />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${label} ${index + 1} down`}
                disabled={index === codes.length - 1}
                onClick={() => onChange(moveItem(codes, index, index + 1))}
              >
                <ArrowDown />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${label} ${index + 1}`}
                className="text-red-500 hover:bg-red-50 hover:text-red-600"
                onClick={() => onChange(codes.filter((_, position) => position !== index))}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <FieldMessage message={fieldError(errors, field)} />

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={codes.length >= 12}
          onClick={() => onChange([...codes, ""])}
        >
          <Plus />
          Add code
        </Button>
      </div>
    </div>
  );
}

function FeaturedFields({ draft, set, errors }: SectionState<"home.featured">) {
  const featured: FeaturedContent = draft;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <CodeList
        label="Featured dishes"
        hint="Menu item codes. A code with no matching dish simply renders nothing."
        field="dishCodes"
        codes={featured.dishCodes}
        errors={errors}
        onChange={(dishCodes) => set({ ...featured, dishCodes })}
      />
      <CodeList
        label="Featured offers"
        hint="Coupon codes from the Offers screen."
        field="offerCodes"
        codes={featured.offerCodes}
        errors={errors}
        onChange={(offerCodes) => set({ ...featured, offerCodes })}
      />
    </div>
  );
}

/* ========================================================================== */
/*  Home · delivery info                                                      */
/* ========================================================================== */

function DeliveryInfoFields({ draft, set, errors }: SectionState<"home.deliveryInfo">) {
  const info: DeliveryInfoContent = draft;

  return (
    <div className="flex flex-col gap-5">
      <TextField
        id="delivery-title"
        label="Title"
        value={info.title ?? ""}
        error={fieldError(errors, "title")}
        onChange={(value) => set({ ...info, title: value })}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="delivery-description">Description</Label>
        <Textarea
          id="delivery-description"
          value={info.description ?? ""}
          aria-invalid={Boolean(fieldError(errors, "description"))}
          onChange={(event) => set({ ...info, description: event.target.value })}
        />
        <FieldMessage message={fieldError(errors, "description")} />
      </div>

      <TextField
        id="delivery-note"
        label="Note"
        value={info.note ?? ""}
        error={fieldError(errors, "note")}
        onChange={(value) => set({ ...info, note: value })}
      />

      <p className="text-xs text-ink-500">
        The delivery areas themselves are not edited here — they come from the outlets screen.
      </p>
    </div>
  );
}

/* ========================================================================== */
/*  About · story                                                             */
/* ========================================================================== */

function StoryFields({ draft, set, errors }: SectionState<"about.story">) {
  const story: StoryContent = draft;
  const paragraphs = story.paragraphs;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="story-eyebrow"
          label="Eyebrow"
          value={story.eyebrow ?? ""}
          error={fieldError(errors, "eyebrow")}
          onChange={(value) => set({ ...story, eyebrow: value })}
        />
        <TextField
          id="story-title"
          label="Title"
          value={story.title ?? ""}
          error={fieldError(errors, "title")}
          onChange={(value) => set({ ...story, title: value })}
        />
        <TextField
          id="story-signature"
          label="Signature"
          value={story.signature ?? ""}
          error={fieldError(errors, "signature")}
          onChange={(value) => set({ ...story, signature: value })}
        />
        <TextField
          id="story-signature-role"
          label="Signature role"
          value={story.signatureRole ?? ""}
          error={fieldError(errors, "signatureRole")}
          onChange={(value) => set({ ...story, signatureRole: value })}
        />
      </div>

      {paragraphs.length === 0 ? (
        <ListEmpty message="No paragraphs yet." />
      ) : (
        <ul className="flex flex-col gap-3">
          {paragraphs.map((paragraph, index) => (
            <ListRow
              key={index}
              index={index}
              count={paragraphs.length}
              label="Paragraph"
              onMove={(to) => set({ ...story, paragraphs: moveItem(paragraphs, index, to) })}
              onRemove={() =>
                set({
                  ...story,
                  paragraphs: paragraphs.filter((_, position) => position !== index),
                })
              }
            >
              <Textarea
                aria-label={`Paragraph ${index + 1}`}
                value={paragraph}
                aria-invalid={Boolean(fieldError(errors, `paragraphs.${index}`))}
                onChange={(event) =>
                  set({
                    ...story,
                    paragraphs: paragraphs.map((entry, position) =>
                      position === index ? event.target.value : entry,
                    ),
                  })
                }
              />
              <FieldMessage message={fieldError(errors, `paragraphs.${index}`)} />
            </ListRow>
          ))}
        </ul>
      )}

      <FieldMessage message={fieldError(errors, "paragraphs")} />

      <div>
        <Button
          type="button"
          variant="outline"
          size="md"
          disabled={paragraphs.length >= 8}
          onClick={() => set({ ...story, paragraphs: [...paragraphs, ""] })}
        >
          <Plus />
          Add a paragraph
        </Button>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  About · milestones                                                        */
/* ========================================================================== */

function MilestonesFields({ draft, set, errors }: SectionState<"about.milestones">) {
  const milestones: MilestonesContent = draft;
  const items = milestones.items;

  function patch(index: number, changes: Partial<MilestonesContent["items"][number]>) {
    set({
      ...milestones,
      items: items.map((entry, position) =>
        position === index ? { ...entry, ...changes } : entry,
      ),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 ? (
        <ListEmpty message="No milestones yet, so the About page shows no timeline." />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((milestone, index) => (
            <ListRow
              key={index}
              index={index}
              count={items.length}
              label="Milestone"
              onMove={(to) => set({ ...milestones, items: moveItem(items, index, to) })}
              onRemove={() =>
                set({ ...milestones, items: items.filter((_, position) => position !== index) })
              }
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <TextField
                  id={`milestone-year-${index}`}
                  label="Year"
                  value={milestone.year}
                  placeholder="2019"
                  error={fieldError(errors, `items.${index}.year`)}
                  onChange={(value) => patch(index, { year: value })}
                />
                <TextField
                  id={`milestone-title-${index}`}
                  label="Title"
                  className="sm:col-span-2"
                  value={milestone.title}
                  error={fieldError(errors, `items.${index}.title`)}
                  onChange={(value) => patch(index, { title: value })}
                />
                <div className="flex flex-col gap-2 sm:col-span-3">
                  <Label htmlFor={`milestone-description-${index}`}>Description</Label>
                  <Textarea
                    id={`milestone-description-${index}`}
                    value={milestone.description}
                    onChange={(event) => patch(index, { description: event.target.value })}
                  />
                  <FieldMessage message={fieldError(errors, `items.${index}.description`)} />
                </div>
              </div>
            </ListRow>
          ))}
        </ul>
      )}

      <FieldMessage message={fieldError(errors, "items")} />

      <div>
        <Button
          type="button"
          variant="outline"
          size="md"
          disabled={items.length >= 20}
          onClick={() =>
            set({ ...milestones, items: [...items, { year: "", title: "", description: "" }] })
          }
        >
          <Plus />
          Add a milestone
        </Button>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  About · team                                                              */
/* ========================================================================== */

function TeamFields({ draft, set, errors }: SectionState<"about.team">) {
  const team: TeamContent = draft;
  const items = team.items;

  function patch(index: number, changes: Partial<TeamContent["items"][number]>) {
    set({
      ...team,
      items: items.map((entry, position) =>
        position === index ? { ...entry, ...changes } : entry,
      ),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 ? (
        <ListEmpty message="Nobody listed, so the About page shows no team." />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((member, index) => (
            <ListRow
              key={index}
              index={index}
              count={items.length}
              label="Person"
              onMove={(to) => set({ ...team, items: moveItem(items, index, to) })}
              onRemove={() =>
                set({ ...team, items: items.filter((_, position) => position !== index) })
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  id={`team-name-${index}`}
                  label="Name"
                  value={member.name}
                  error={fieldError(errors, `items.${index}.name`)}
                  onChange={(value) => patch(index, { name: value })}
                />
                <TextField
                  id={`team-role-${index}`}
                  label="Role"
                  value={member.role}
                  error={fieldError(errors, `items.${index}.role`)}
                  onChange={(value) => patch(index, { role: value })}
                />
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <Label htmlFor={`team-bio-${index}`}>Bio</Label>
                  <Textarea
                    id={`team-bio-${index}`}
                    value={member.bio ?? ""}
                    onChange={(event) => patch(index, { bio: event.target.value })}
                  />
                  <FieldMessage message={fieldError(errors, `items.${index}.bio`)} />
                </div>
                <TextField
                  id={`team-experience-${index}`}
                  label="Experience"
                  value={member.experience ?? ""}
                  error={fieldError(errors, `items.${index}.experience`)}
                  onChange={(value) => patch(index, { experience: value })}
                />
                <TextField
                  id={`team-speciality-${index}`}
                  label="Speciality"
                  value={member.speciality ?? ""}
                  error={fieldError(errors, `items.${index}.speciality`)}
                  onChange={(value) => patch(index, { speciality: value })}
                />
                <TextField
                  id={`team-image-${index}`}
                  label="Image id"
                  value={member.imageId ?? ""}
                  error={fieldError(errors, `items.${index}.imageId`)}
                  onChange={(value) => patch(index, { imageId: value })}
                />
                <TextField
                  id={`team-initials-${index}`}
                  label="Initials (fallback avatar)"
                  value={member.initials ?? ""}
                  error={fieldError(errors, `items.${index}.initials`)}
                  onChange={(value) => patch(index, { initials: value.toUpperCase() })}
                />
              </div>
            </ListRow>
          ))}
        </ul>
      )}

      <FieldMessage message={fieldError(errors, "items")} />

      <div>
        <Button
          type="button"
          variant="outline"
          size="md"
          disabled={items.length >= 24}
          onClick={() => set({ ...team, items: [...items, { name: "", role: "" }] })}
        >
          <Plus />
          Add a person
        </Button>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  Customer reviews                                                          */
/* ========================================================================== */

/**
 * Moderation queue for reviews customers submitted themselves.
 *
 * There is no "add a review" control on purpose: every quote on the storefront
 * has to have been typed by a customer, so the only actions here are publish,
 * feature and delete.
 */
function ReviewsPanel() {
  const load = React.useCallback((signal: AbortSignal) => listAdminReviews(signal), []);
  const reviews = useAdminQuery(load);

  const [items, setItems] = React.useState<AdminReview[]>([]);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  React.useEffect(() => setItems(reviews.data?.reviews ?? []), [reviews.data]);

  async function moderate(review: AdminReview, patch: { published?: boolean; featured?: boolean }) {
    const previous = items;
    setActionError(null);
    setItems((current) =>
      current.map((entry) => (entry.id === review.id ? { ...entry, ...patch } : entry)),
    );

    const result = await updateAdminReview(review.id, patch);
    if (!result.ok) {
      setItems(previous);
      setActionError(`Could not update the review from ${review.name} — ${result.message}`);
      return;
    }
    reviews.reload();
  }

  async function remove(id: string) {
    const previous = items;
    const target = items.find((review) => review.id === id);
    setActionError(null);
    setItems((current) => current.filter((review) => review.id !== id));

    const result = await deleteAdminReview(id);
    if (!result.ok) {
      setItems(previous);
      setActionError(`Could not delete the review from ${target?.name ?? "that customer"} — ${result.message}`);
      return;
    }
    reviews.reload();
  }

  const summary = reviews.data?.summary;
  const pending = items.filter((review) => !review.published).length;
  const deleteTarget = deleteId ? items.find((review) => review.id === deleteId) : undefined;

  return (
    <Card className="flex flex-col gap-5 rounded-3xl p-5 sm:p-6">
      <div className="flex flex-col gap-3 border-b border-ink-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-xl text-ink-900">Customer reviews</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-500">
            Reviews are written by customers through the storefront and arrive unpublished. Nothing
            can be authored here — only approved, featured or removed.
          </p>
          {summary && summary.count > 0 && (
            <p className="mt-1.5 text-xs text-ink-400">
              {summary.average.toFixed(1)} average across {summary.count} published review
              {summary.count === 1 ? "" : "s"}
              {pending > 0 ? ` · ${pending} awaiting approval` : ""}.
            </p>
          )}
        </div>
        <Button variant="outline" size="md" onClick={reviews.reload} disabled={reviews.loading}>
          <RefreshCw />
          Refresh
        </Button>
      </div>

      {reviews.failure && <ApiErrorNotice failure={reviews.failure} onRetry={reviews.reload} />}

      <div role="status" aria-live="polite">
        {actionError && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </p>
        )}
      </div>

      {reviews.loading && !reviews.data ? (
        <LoadingRows rows={4} label="Loading reviews" />
      ) : reviews.failure ? null : items.length === 0 ? (
        <EmptyState
          icon={MessageSquareQuote}
          title="No reviews yet"
          description="Nobody has submitted one. Nothing is shown on the storefront until a real customer writes something."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((review) => (
            <li
              key={review.id}
              className={cn(
                "rounded-2xl border border-ink-200/70 bg-white p-4",
                !review.published && "border-amber-200 bg-amber-50/40",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink-900">{review.name}</p>
                    <Badge variant="muted" size="sm">
                      {review.role}
                    </Badge>
                    <StatusPill
                      tone={review.published ? "success" : "progress"}
                      size="sm"
                      label={review.published ? "Published" : "Awaiting approval"}
                    />
                    {review.verified && (
                      <Badge variant="default" size="sm">
                        Verified
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-ink-400">
                    {review.location}
                    {review.date ? ` · ${review.date}` : ""}
                  </p>
                </div>

                <p
                  className="flex items-center gap-1 text-sm font-medium tabular-nums text-ink-700"
                  aria-label={`Rated ${review.rating} out of 5`}
                >
                  <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
                  {review.rating}
                </p>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-ink-600">{review.quote}</p>

              <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-ink-100 pt-3">
                <span className="flex items-center gap-2 text-sm text-ink-600">
                  <Switch
                    checked={review.published}
                    onCheckedChange={(checked) => void moderate(review, { published: checked })}
                    aria-label={`Publish the review from ${review.name}`}
                  />
                  Published
                </span>
                <span className="flex items-center gap-2 text-sm text-ink-600">
                  <Switch
                    checked={review.featured}
                    onCheckedChange={(checked) => void moderate(review, { featured: checked })}
                    aria-label={`Feature the review from ${review.name}`}
                  />
                  Featured
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-red-500 hover:bg-red-50 hover:text-red-600"
                  onClick={() => setDeleteId(review.id)}
                >
                  <Trash2 />
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={`Delete the review from ${deleteTarget?.name ?? "this customer"}?`}
        description="It is removed permanently. Unpublishing hides it from the storefront without destroying it."
        confirmLabel="Delete review"
        icon={Trash2}
        onConfirm={() => deleteId && void remove(deleteId)}
      />
    </Card>
  );
}
