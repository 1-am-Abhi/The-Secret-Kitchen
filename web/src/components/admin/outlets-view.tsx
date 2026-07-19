"use client";

import * as React from "react";
import {
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Store,
  Trash2,
  Truck,
} from "lucide-react";

import { ApiErrorNotice, LoadingRows, useAdminQuery } from "@/components/admin/admin-data";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { StatusPill } from "@/components/admin/status-pill";
import { FilterChips, SearchField, Toolbar, ToolbarSpacer } from "@/components/admin/toolbar";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  checkAdminCoverage,
  createAdminDeliveryArea,
  createAdminOutlet,
  deleteAdminDeliveryArea,
  deleteAdminOutlet,
  listAdminOutlets,
  updateAdminDeliveryArea,
  updateAdminOutlet,
  type AdminDeliveryArea,
  type AdminOutlet,
  type CoverageAnswer,
  type DeliveryAreaInput,
  type OutletInput,
} from "@/lib/admin-orders";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "active" | "disabled";

/** Per-field messages, keyed the way the API paths its validation issues. */
type FieldErrors = Record<string, string[]>;

function fieldError(errors: FieldErrors, field: string): string | undefined {
  return errors[field]?.[0];
}

function formError(errors: FieldErrors): string | undefined {
  return errors._?.[0];
}

function outletAddress(outlet: AdminOutlet): string {
  return [outlet.line1, outlet.line2, outlet.city, outlet.state, outlet.postalCode]
    .filter((part) => part && part.length > 0)
    .join(", ");
}

function outletHours(outlet: AdminOutlet): string | null {
  if (!outlet.opensAt || !outlet.closesAt) return null;
  return `${outlet.opensAt} – ${outlet.closesAt}`;
}

export function OutletsView() {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<StatusFilter>("all");
  const [editing, setEditing] = React.useState<AdminOutlet | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [areasFor, setAreasFor] = React.useState<string | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const load = React.useCallback((signal: AbortSignal) => listAdminOutlets(signal), []);
  const outlets = useAdminQuery(load);

  const [items, setItems] = React.useState<AdminOutlet[]>([]);
  React.useEffect(() => setItems(outlets.data ?? []), [outlets.data]);

  const counts = React.useMemo(() => {
    const active = items.filter((outlet) => outlet.active).length;
    return { all: items.length, active, disabled: items.length - active };
  }, [items]);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items
      .filter((outlet) =>
        filter === "all" ? true : filter === "active" ? outlet.active : !outlet.active,
      )
      .filter((outlet) => {
        if (!needle) return true;
        const haystack = [
          outlet.name,
          outlet.slug,
          outlet.city,
          outlet.postalCode,
          ...outlet.deliveryAreas.flatMap((area) => [area.name, area.pincode]),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      });
  }, [items, filter, query]);

  async function toggleActive(outlet: AdminOutlet, active: boolean) {
    const previous = items;
    setActionError(null);
    setItems((current) =>
      current.map((entry) => (entry.id === outlet.id ? { ...entry, active } : entry)),
    );

    const result = await updateAdminOutlet(outlet.id, { active });
    if (!result.ok) {
      setItems(previous);
      setActionError(`Could not update ${outlet.name} — ${result.message}`);
    }
  }

  /** Resolves to the field errors when the API rejected the body, else null. */
  async function save(input: OutletInput, existing: AdminOutlet | null): Promise<FieldErrors | null> {
    setActionError(null);
    const result = existing
      ? await updateAdminOutlet(existing.id, input)
      : await createAdminOutlet(input);

    if (!result.ok) {
      return result.fieldErrors ?? { _: [result.message] };
    }
    outlets.reload();
    return null;
  }

  async function remove(id: string) {
    const previous = items;
    const target = items.find((outlet) => outlet.id === id);
    setActionError(null);
    setItems((current) => current.filter((outlet) => outlet.id !== id));

    const result = await deleteAdminOutlet(id);
    if (!result.ok) {
      setItems(previous);
      setActionError(`Could not delete ${target?.name ?? "that outlet"} — ${result.message}`);
    }
  }

  const areasOutlet = areasFor ? items.find((outlet) => outlet.id === areasFor) : undefined;
  const deleteTarget = deleteId ? items.find((outlet) => outlet.id === deleteId) : undefined;
  const areaCount = items.reduce((total, outlet) => total + outlet.deliveryAreas.length, 0);

  const columns: DataTableColumn<AdminOutlet>[] = [
    {
      id: "name",
      header: "Outlet",
      sortValue: (outlet) => outlet.name,
      cell: (outlet) => (
        <div className="min-w-0">
          <p className="font-medium text-ink-900">{outlet.name}</p>
          <p className="mt-0.5 font-mono text-xs text-ink-400">{outlet.slug}</p>
        </div>
      ),
    },
    {
      id: "address",
      header: "Address",
      className: "max-w-[22rem]",
      sortValue: (outlet) => outlet.city,
      cell: (outlet) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-ink-700">{outletAddress(outlet)}</p>
          <p className="mt-0.5 text-xs text-ink-400">
            {outletHours(outlet) ?? "Opening hours not set"}
          </p>
        </div>
      ),
    },
    {
      id: "areas",
      header: "Service areas",
      align: "center",
      sortValue: (outlet) => outlet.deliveryAreas.length,
      cell: (outlet) => (
        <Button variant="outline" size="sm" onClick={() => setAreasFor(outlet.id)}>
          <MapPin />
          {outlet.deliveryAreas.length === 0
            ? "Add areas"
            : `${outlet.deliveryAreas.length} area${outlet.deliveryAreas.length === 1 ? "" : "s"}`}
        </Button>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (outlet) => (outlet.active ? 1 : 0),
      cell: (outlet) => (
        <span className="flex items-center gap-2.5">
          <Switch
            checked={outlet.active}
            onCheckedChange={(checked) => void toggleActive(outlet, checked)}
            aria-label={`Enable outlet ${outlet.name}`}
          />
          <StatusPill
            tone={outlet.active ? "success" : "muted"}
            size="sm"
            label={outlet.active ? "Open" : "Disabled"}
          />
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      headerClassName: "sr-only",
      align: "right",
      cell: (outlet) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit outlet ${outlet.name}`}
            onClick={() => setEditing(outlet)}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete outlet ${outlet.name}`}
            className="text-red-500 hover:bg-red-50 hover:text-red-600"
            onClick={() => setDeleteId(outlet.id)}
          >
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Outlets & service areas"
        description="Every kitchen this business delivers from, and the PIN codes each one covers."
        actions={
          <>
            <Button variant="outline" size="md" onClick={outlets.reload} disabled={outlets.loading}>
              <RefreshCw />
              Refresh
            </Button>
            <Button size="md" onClick={() => setCreating(true)}>
              <Plus />
              Add outlet
            </Button>
          </>
        }
      />

      {outlets.failure && <ApiErrorNotice failure={outlets.failure} onRetry={outlets.reload} />}

      <div role="status" aria-live="polite">
        {actionError && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </p>
        )}
      </div>

      <CoverageChecker />

      <Toolbar>
        <SearchField
          label="Search outlets by name, city, PIN code or area"
          placeholder="Search outlets…"
          value={query}
          onValueChange={setQuery}
        />
        <ToolbarSpacer />
        <FilterChips
          label="Filter outlets by status"
          value={filter}
          onValueChange={setFilter}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "active", label: "Open", count: counts.active },
            { value: "disabled", label: "Disabled", count: counts.disabled },
          ]}
        />
      </Toolbar>

      {outlets.loading && !outlets.data ? (
        <LoadingRows rows={4} label="Loading outlets" />
      ) : outlets.failure ? null : items.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No outlets yet"
          description="Nothing has been added, so the storefront lists no delivery locations at all. Add the first kitchen to start."
          action={<Button onClick={() => setCreating(true)}>Add outlet</Button>}
        />
      ) : (
        <>
          <p className="text-sm text-ink-500">
            <span className="font-medium tabular-nums text-ink-900">{items.length}</span>{" "}
            outlet{items.length === 1 ? "" : "s"} covering{" "}
            <span className="font-medium tabular-nums text-ink-900">{areaCount}</span> service
            area{areaCount === 1 ? "" : "s"}.
          </p>

          <DataTable
            data={filtered}
            columns={columns}
            getRowId={(outlet) => outlet.id}
            caption="Outlets, their addresses and the number of delivery areas each covers"
            pageSize={10}
            empty={
              <EmptyState
                icon={Store}
                title="No outlets match"
                description="Try another status or clear the search."
              />
            }
            renderCard={(outlet) => (
              <Card className="flex flex-col gap-3 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink-900">{outlet.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-ink-400">{outlet.slug}</p>
                  </div>
                  <StatusPill
                    tone={outlet.active ? "success" : "muted"}
                    size="sm"
                    label={outlet.active ? "Open" : "Disabled"}
                  />
                </div>
                <p className="text-sm text-ink-600">{outletAddress(outlet)}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setAreasFor(outlet.id)}>
                    <MapPin />
                    {outlet.deliveryAreas.length} area
                    {outlet.deliveryAreas.length === 1 ? "" : "s"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditing(outlet)}>
                    <Pencil />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => setDeleteId(outlet.id)}
                  >
                    <Trash2 />
                    Delete
                  </Button>
                </div>
              </Card>
            )}
          />
        </>
      )}

      <OutletFormDialog
        open={creating || editing !== null}
        outlet={editing}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
        onSave={(input) => save(input, editing)}
      />

      <DeliveryAreasDialog
        outlet={areasOutlet ?? null}
        onOpenChange={(open) => !open && setAreasFor(null)}
        onChanged={outlets.reload}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={`Delete ${deleteTarget?.name ?? "this outlet"}?`}
        description="Its delivery areas go with it, and the storefront stops offering this location immediately."
        confirmLabel="Delete outlet"
        icon={Trash2}
        onConfirm={() => deleteId && void remove(deleteId)}
      />
    </div>
  );
}

/* ========================================================================== */
/*  Coverage checker                                                          */
/* ========================================================================== */

/**
 * The operator's copy of the storefront's "do you deliver here?" box.
 *
 * It queries the same public endpoint a customer hits, so the answer shown here
 * is the answer they get — including "no", which is the honest result for a PIN
 * code nobody has added yet.
 */
function CoverageChecker() {
  const [value, setValue] = React.useState("");
  const [checking, setChecking] = React.useState(false);
  const [answer, setAnswer] = React.useState<CoverageAnswer | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function check(event: React.FormEvent) {
    event.preventDefault();
    const needle = value.trim();
    if (needle.length === 0) return;

    setChecking(true);
    setError(null);
    setAnswer(null);

    const result = await checkAdminCoverage(needle);
    setChecking(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    setAnswer(result.data);
  }

  return (
    <Card className="rounded-3xl p-5">
      <form onSubmit={(event) => void check(event)} className="flex flex-col gap-3">
        <div>
          <Label htmlFor="coverage-query">Check a PIN code or area</Label>
          <p className="mt-1 text-xs text-ink-500">
            Runs the same lookup the storefront runs for a customer.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="coverage-query"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="560001 or Indiranagar"
            className="sm:max-w-xs"
            inputMode="text"
          />
          <Button type="submit" variant="outline" size="md" disabled={checking}>
            <Search />
            {checking ? "Checking…" : "Check coverage"}
          </Button>
        </div>

        <div role="status" aria-live="polite" className="min-h-0">
          {error && <p className="text-sm text-red-700">{error}</p>}

          {answer && answer.covered && answer.area && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-fresh-200 bg-fresh-50 px-4 py-3 text-sm text-fresh-800">
              <Truck className="size-4 shrink-0" aria-hidden />
              <span>
                Delivered to <strong>{answer.query}</strong> from{" "}
                <strong>{answer.outlet?.name ?? "an outlet"}</strong> — {answer.area.name}, about{" "}
                {answer.area.etaMinutes} minutes
                {answer.area.freeDelivery ? ", free delivery" : ""}.
              </span>
            </div>
          )}

          {answer && !answer.covered && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-700">
              <MapPin className="size-4 shrink-0" aria-hidden />
              <span>
                No active outlet covers <strong>{answer.query}</strong>. Add it as a service area
                below to start delivering there.
              </span>
            </div>
          )}
        </div>
      </form>
    </Card>
  );
}

/* ========================================================================== */
/*  Outlet form                                                               */
/* ========================================================================== */

const BLANK_OUTLET: OutletInput = {
  slug: "",
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "IN",
  phone: "",
  email: "",
  deliveryRadiusKm: undefined,
  deliveryMinutes: undefined,
  opensAt: "",
  closesAt: "",
  active: true,
  sortOrder: 0,
};

function toOutletInput(outlet: AdminOutlet): OutletInput {
  return {
    slug: outlet.slug,
    name: outlet.name,
    line1: outlet.line1,
    line2: outlet.line2 ?? "",
    city: outlet.city,
    state: outlet.state,
    postalCode: outlet.postalCode,
    country: outlet.country,
    phone: outlet.phone ?? "",
    email: outlet.email ?? "",
    deliveryRadiusKm: outlet.deliveryRadiusKm,
    deliveryMinutes: outlet.deliveryMinutes,
    opensAt: outlet.opensAt ?? "",
    closesAt: outlet.closesAt ?? "",
    active: outlet.active,
    sortOrder: outlet.sortOrder,
  };
}

/** "Indiranagar Kitchen" → "indiranagar-kitchen", the slug shape the API wants. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function FieldMessage({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600">{message}</p>;
}

function OutletFormDialog({
  open,
  outlet,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  outlet: AdminOutlet | null;
  onOpenChange: (open: boolean) => void;
  onSave: (input: OutletInput) => Promise<FieldErrors | null>;
}) {
  const [draft, setDraft] = React.useState<OutletInput>(BLANK_OUTLET);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [saving, setSaving] = React.useState(false);
  /** Stops slug auto-fill once the operator has typed one of their own. */
  const [slugTouched, setSlugTouched] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setDraft(outlet ? toOutletInput(outlet) : BLANK_OUTLET);
    setErrors({});
    setSlugTouched(outlet !== null);
  }, [open, outlet]);

  function update<K extends keyof OutletInput>(key: K, value: OutletInput[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const result = await onSave(draft);
    setSaving(false);

    if (result) {
      setErrors(result);
      return;
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={(event) => void submit(event)}>
          <DialogHeader className="border-b border-ink-100 pb-5">
            <DialogTitle>{outlet ? `Edit ${outlet.name}` : "Add an outlet"}</DialogTitle>
            <DialogDescription>
              The address here is what the storefront and search engines publish for this kitchen.
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[60vh] gap-5 overflow-y-auto p-6 sm:grid-cols-2">
            {formError(errors) && (
              <p
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2"
              >
                {formError(errors)}
              </p>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="outlet-name">Outlet name</Label>
              <Input
                id="outlet-name"
                required
                value={draft.name}
                aria-invalid={Boolean(fieldError(errors, "name"))}
                onChange={(event) => {
                  update("name", event.target.value);
                  if (!slugTouched) update("slug", slugify(event.target.value));
                }}
                placeholder="Indiranagar Kitchen"
              />
              <FieldMessage message={fieldError(errors, "name")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="outlet-slug">Slug</Label>
              <Input
                id="outlet-slug"
                required
                value={draft.slug}
                aria-invalid={Boolean(fieldError(errors, "slug"))}
                onChange={(event) => {
                  setSlugTouched(true);
                  update("slug", event.target.value);
                }}
                placeholder="indiranagar-kitchen"
                className="font-mono lowercase"
              />
              <FieldMessage message={fieldError(errors, "slug")} />
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="outlet-line1">Address line 1</Label>
              <Input
                id="outlet-line1"
                required
                value={draft.line1}
                aria-invalid={Boolean(fieldError(errors, "line1"))}
                onChange={(event) => update("line1", event.target.value)}
              />
              <FieldMessage message={fieldError(errors, "line1")} />
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="outlet-line2">Address line 2 (optional)</Label>
              <Input
                id="outlet-line2"
                value={draft.line2 ?? ""}
                onChange={(event) => update("line2", event.target.value)}
              />
              <FieldMessage message={fieldError(errors, "line2")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="outlet-city">City</Label>
              <Input
                id="outlet-city"
                required
                value={draft.city}
                aria-invalid={Boolean(fieldError(errors, "city"))}
                onChange={(event) => update("city", event.target.value)}
              />
              <FieldMessage message={fieldError(errors, "city")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="outlet-state">State</Label>
              <Input
                id="outlet-state"
                required
                value={draft.state}
                aria-invalid={Boolean(fieldError(errors, "state"))}
                onChange={(event) => update("state", event.target.value)}
              />
              <FieldMessage message={fieldError(errors, "state")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="outlet-postal">PIN code</Label>
              <Input
                id="outlet-postal"
                required
                inputMode="numeric"
                pattern="[1-9][0-9]{5}"
                value={draft.postalCode}
                aria-invalid={Boolean(fieldError(errors, "postalCode"))}
                onChange={(event) => update("postalCode", event.target.value)}
                placeholder="560038"
              />
              <FieldMessage message={fieldError(errors, "postalCode")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="outlet-country">Country code</Label>
              <Input
                id="outlet-country"
                required
                maxLength={2}
                value={draft.country}
                aria-invalid={Boolean(fieldError(errors, "country"))}
                onChange={(event) => update("country", event.target.value.toUpperCase())}
                className="uppercase"
              />
              <FieldMessage message={fieldError(errors, "country")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="outlet-phone">Phone (optional)</Label>
              <Input
                id="outlet-phone"
                value={draft.phone ?? ""}
                onChange={(event) => update("phone", event.target.value)}
              />
              <FieldMessage message={fieldError(errors, "phone")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="outlet-email">Email (optional)</Label>
              <Input
                id="outlet-email"
                type="email"
                value={draft.email ?? ""}
                onChange={(event) => update("email", event.target.value)}
              />
              <FieldMessage message={fieldError(errors, "email")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="outlet-opens">Opens at (optional)</Label>
              <Input
                id="outlet-opens"
                type="time"
                value={draft.opensAt ?? ""}
                onChange={(event) => update("opensAt", event.target.value)}
              />
              <FieldMessage message={fieldError(errors, "opensAt")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="outlet-closes">Closes at (optional)</Label>
              <Input
                id="outlet-closes"
                type="time"
                value={draft.closesAt ?? ""}
                onChange={(event) => update("closesAt", event.target.value)}
              />
              <FieldMessage message={fieldError(errors, "closesAt")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="outlet-minutes">Typical delivery (minutes, optional)</Label>
              <Input
                id="outlet-minutes"
                type="number"
                min={1}
                max={600}
                value={draft.deliveryMinutes ?? ""}
                onChange={(event) =>
                  update(
                    "deliveryMinutes",
                    event.target.value ? Number(event.target.value) : undefined,
                  )
                }
              />
              <FieldMessage message={fieldError(errors, "deliveryMinutes")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="outlet-radius">Delivery radius (km, optional)</Label>
              <Input
                id="outlet-radius"
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={draft.deliveryRadiusKm ?? ""}
                onChange={(event) =>
                  update(
                    "deliveryRadiusKm",
                    event.target.value ? Number(event.target.value) : undefined,
                  )
                }
              />
              <FieldMessage message={fieldError(errors, "deliveryRadiusKm")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="outlet-sort">Sort order</Label>
              <Input
                id="outlet-sort"
                type="number"
                min={0}
                max={999}
                value={draft.sortOrder}
                onChange={(event) => update("sortOrder", Number(event.target.value) || 0)}
              />
              <FieldMessage message={fieldError(errors, "sortOrder")} />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-2xl bg-ink-50 p-4">
              <Label htmlFor="outlet-active">Open for delivery</Label>
              <Switch
                id="outlet-active"
                checked={draft.active}
                onCheckedChange={(checked) => update("active", checked)}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-ink-100 pt-5">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : outlet ? "Save changes" : "Add outlet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ========================================================================== */
/*  Delivery areas                                                            */
/* ========================================================================== */

const BLANK_AREA: DeliveryAreaInput = {
  name: "",
  pincode: "",
  etaMinutes: 45,
  freeDelivery: false,
  active: true,
  sortOrder: 0,
};

function toAreaInput(area: AdminDeliveryArea): DeliveryAreaInput {
  return {
    name: area.name,
    pincode: area.pincode,
    etaMinutes: area.etaMinutes,
    freeDelivery: area.freeDelivery,
    active: area.active,
    sortOrder: area.sortOrder,
  };
}

/**
 * Per-outlet service areas.
 *
 * Every mutation goes straight to the API and the parent re-reads afterwards —
 * an area list edited only in memory would be a promise the kitchen has not
 * actually made.
 */
function DeliveryAreasDialog({
  outlet,
  onOpenChange,
  onChanged,
}: {
  outlet: AdminOutlet | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [draft, setDraft] = React.useState<DeliveryAreaInput>(BLANK_AREA);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [busy, setBusy] = React.useState(false);
  const outletId = outlet?.id ?? null;

  React.useEffect(() => {
    setDraft(BLANK_AREA);
    setEditingId(null);
    setErrors({});
  }, [outletId]);

  function update<K extends keyof DeliveryAreaInput>(key: K, value: DeliveryAreaInput[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function startEdit(area: AdminDeliveryArea) {
    setEditingId(area.id);
    setDraft(toAreaInput(area));
    setErrors({});
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(BLANK_AREA);
    setErrors({});
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!outletId) return;

    setBusy(true);
    const result = editingId
      ? await updateAdminDeliveryArea(outletId, editingId, draft)
      : await createAdminDeliveryArea(outletId, draft);
    setBusy(false);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? { _: [result.message] });
      return;
    }
    cancelEdit();
    onChanged();
  }

  async function toggle(area: AdminDeliveryArea, patch: Partial<DeliveryAreaInput>) {
    if (!outletId) return;
    setBusy(true);
    const result = await updateAdminDeliveryArea(outletId, area.id, patch);
    setBusy(false);

    if (!result.ok) {
      setErrors({ _: [`Could not update ${area.name} — ${result.message}`] });
      return;
    }
    setErrors({});
    onChanged();
  }

  async function remove(area: AdminDeliveryArea) {
    if (!outletId) return;
    setBusy(true);
    const result = await deleteAdminDeliveryArea(outletId, area.id);
    setBusy(false);

    if (!result.ok) {
      setErrors({ _: [`Could not remove ${area.name} — ${result.message}`] });
      return;
    }
    setErrors({});
    if (editingId === area.id) cancelEdit();
    onChanged();
  }

  const areas = outlet?.deliveryAreas ?? [];

  return (
    <Dialog open={outlet !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="border-b border-ink-100 pb-5">
          <DialogTitle>Service areas{outlet ? ` · ${outlet.name}` : ""}</DialogTitle>
          <DialogDescription>
            A customer whose PIN code is not listed here is told this kitchen does not deliver to
            them.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto p-6">
          <div role="alert" aria-live="polite">
            {formError(errors) && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError(errors)}
              </p>
            )}
          </div>

          {areas.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="No service areas yet"
              description="This outlet covers nothing until a PIN code is added below."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {areas.map((area) => (
                <li
                  key={area.id}
                  className={cn(
                    "flex flex-wrap items-center gap-3 rounded-2xl border border-ink-200/70 bg-white px-4 py-3",
                    editingId === area.id && "border-brand-300 bg-brand-50/40",
                    !area.active && "opacity-70",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink-900">{area.name}</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      <span className="font-mono">{area.pincode}</span> · about {area.etaMinutes}{" "}
                      min
                    </p>
                  </div>

                  {area.freeDelivery && (
                    <Badge variant="muted" size="sm">
                      Free delivery
                    </Badge>
                  )}

                  <span className="flex items-center gap-2 text-xs text-ink-600">
                    <Switch
                      checked={area.active}
                      disabled={busy}
                      onCheckedChange={(checked) => void toggle(area, { active: checked })}
                      aria-label={`Serve ${area.name}`}
                    />
                    {area.active ? "Serving" : "Paused"}
                  </span>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit area ${area.name}`}
                      onClick={() => startEdit(area)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove area ${area.name}`}
                      className="text-red-500 hover:bg-red-50 hover:text-red-600"
                      disabled={busy}
                      onClick={() => void remove(area)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form
            onSubmit={(event) => void submit(event)}
            className="grid gap-4 rounded-2xl border border-ink-200/70 bg-ink-50/60 p-4 sm:grid-cols-2"
          >
            <p className="text-sm font-semibold text-ink-900 sm:col-span-2">
              {editingId ? "Edit service area" : "Add a service area"}
            </p>

            <div className="flex flex-col gap-2">
              <Label htmlFor="area-name">Area name</Label>
              <Input
                id="area-name"
                required
                value={draft.name}
                aria-invalid={Boolean(fieldError(errors, "name"))}
                onChange={(event) => update("name", event.target.value)}
                placeholder="Indiranagar"
              />
              <FieldMessage message={fieldError(errors, "name")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="area-pincode">PIN code</Label>
              <Input
                id="area-pincode"
                required
                inputMode="numeric"
                pattern="[1-9][0-9]{5}"
                value={draft.pincode}
                aria-invalid={Boolean(fieldError(errors, "pincode"))}
                onChange={(event) => update("pincode", event.target.value)}
                placeholder="560038"
                className="font-mono"
              />
              <FieldMessage message={fieldError(errors, "pincode")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="area-eta">Delivery ETA (minutes)</Label>
              <Input
                id="area-eta"
                type="number"
                required
                min={1}
                max={600}
                value={draft.etaMinutes}
                aria-invalid={Boolean(fieldError(errors, "etaMinutes"))}
                onChange={(event) => update("etaMinutes", Number(event.target.value) || 0)}
              />
              <FieldMessage message={fieldError(errors, "etaMinutes")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="area-sort">Sort order</Label>
              <Input
                id="area-sort"
                type="number"
                min={0}
                max={999}
                value={draft.sortOrder}
                onChange={(event) => update("sortOrder", Number(event.target.value) || 0)}
              />
              <FieldMessage message={fieldError(errors, "sortOrder")} />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4">
              <Label htmlFor="area-free">Free delivery</Label>
              <Switch
                id="area-free"
                checked={draft.freeDelivery}
                onCheckedChange={(checked) => update("freeDelivery", checked)}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4">
              <Label htmlFor="area-active">Serving now</Label>
              <Switch
                id="area-active"
                checked={draft.active}
                onCheckedChange={(checked) => update("active", checked)}
              />
            </div>

            <div className="flex justify-end gap-2 sm:col-span-2">
              {editingId && (
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Cancel edit
                </Button>
              )}
              <Button type="submit" disabled={busy || !outletId}>
                <Plus />
                {editingId ? "Save area" : "Add area"}
              </Button>
            </div>
          </form>
        </div>

        <DialogFooter className="border-t border-ink-100 pt-5">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
