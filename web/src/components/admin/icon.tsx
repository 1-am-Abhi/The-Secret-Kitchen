import {
  BadgePercent,
  CalendarCheck,
  Images,
  IndianRupee,
  LayoutDashboard,
  PackageCheck,
  ReceiptText,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

/**
 * Explicit icon map for the admin panel.
 *
 * Two reasons this exists rather than a dynamic `lucide[name]` lookup:
 *
 *  1. Tree-shaking — only the glyphs listed here ship to the browser, and a
 *     typo in a config fails visibly at this seam instead of rendering nothing.
 *  2. The server/client boundary — a React component is a function, and
 *     functions cannot be serialised across it. Server Components therefore
 *     pass an icon *name* (a plain string) and the Client Component resolves it
 *     through this map on its own side of the wire.
 */
export const adminIcons: Record<string, LucideIcon> = {
  LayoutDashboard,
  ReceiptText,
  UtensilsCrossed,
  Sparkles,
  Users,
  CalendarCheck,
  Images,
  BadgePercent,
  TrendingUp,
  IndianRupee,
  PackageCheck,
  TriangleAlert,
};

/** Name of any glyph this module can resolve. */
export type AdminIconName = keyof typeof adminIcons;

/** Sidebar lookup — falls back to the dashboard glyph so nav never renders blank. */
export function resolveAdminIcon(name: string): LucideIcon {
  return adminIcons[name] ?? LayoutDashboard;
}

/** Optional lookup — returns undefined for an unmapped name rather than guessing. */
export function findAdminIcon(name?: string): LucideIcon | undefined {
  return name ? adminIcons[name] : undefined;
}
