"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Bell,
  ChevronDown,
  ExternalLink,
  LifeBuoy,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  UserRound,
} from "lucide-react";

import { resolveAdminIcon } from "@/components/admin/icon";
import { formatClock } from "@/components/admin/status-maps";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { adminNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { adminNotifications, adminUser, unreadNotificationCount } from "@/data/admin-mock";
import { cn } from "@/lib/utils";

/* ========================================================================== */
/*  Brand mark                                                                */
/* ========================================================================== */

function AdminLogo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link
      href="/admin"
      className="flex items-center gap-3 rounded-2xl px-1 py-1 transition-opacity hover:opacity-80"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-500 font-display text-lg font-bold text-white shadow-[var(--shadow-glow)]">
        SK
      </span>
      {!collapsed && (
        <span className="min-w-0">
          <span className="block truncate font-display text-base leading-tight text-white">
            {siteConfig.shortName}
          </span>
          <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
            Admin
          </span>
        </span>
      )}
    </Link>
  );
}

/* ========================================================================== */
/*  Sidebar navigation                                                        */
/* ========================================================================== */

/**
 * `/admin` must only match exactly — every other route is a prefix match so
 * nested pages such as `/admin/orders/TSK-1` keep their parent highlighted.
 */
function isActiveRoute(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function SidebarNav({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="flex-1 overflow-y-auto px-3 py-2">
      <ul className="flex flex-col gap-1">
        {adminNav.map((item) => {
          const Icon = resolveAdminIcon(item.icon);
          const active = isActiveRoute(pathname, item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                  collapsed && "justify-center px-0",
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white",
                )}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-500"
                  />
                )}
                <Icon className="size-[18px] shrink-0" aria-hidden />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SidebarBody({
  collapsed,
  onToggleCollapse,
  onNavigate,
}: {
  collapsed: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-ink-900">
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-5",
          collapsed ? "justify-center px-2" : "justify-between",
        )}
      >
        <AdminLogo collapsed={collapsed} />
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden size-9 shrink-0 items-center justify-center rounded-xl text-white/45 transition-colors hover:bg-white/10 hover:text-white lg:flex"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-[18px]" />
            ) : (
              <PanelLeftClose className="size-[18px]" />
            )}
          </button>
        )}
      </div>

      <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />

      <div className={cn("border-t border-white/10 p-3", collapsed && "px-2")}>
        <Link
          href="/"
          onClick={onNavigate}
          title={collapsed ? "View storefront" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white",
            collapsed && "justify-center px-0",
          )}
        >
          <ExternalLink className="size-[18px] shrink-0" aria-hidden />
          {!collapsed && <span>View storefront</span>}
        </Link>

        {!collapsed && (
          <p className="px-3 pb-1 pt-3 text-[11px] leading-relaxed text-white/30">
            FSSAI {siteConfig.fssaiLicense}
          </p>
        )}
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  Top bar                                                                   */
/* ========================================================================== */

function NotificationsMenu() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Notifications, ${unreadNotificationCount} unread`}
          className="relative flex size-10 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 data-[state=open]:bg-ink-100"
        >
          <Bell className="size-[18px]" />
          {unreadNotificationCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold tabular-nums text-white ring-2 ring-white">
              {unreadNotificationCount}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          className="z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-ink-200/70 bg-white shadow-float data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <p className="font-display text-base text-ink-900">Notifications</p>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
              {unreadNotificationCount} new
            </span>
          </div>

          <ul className="max-h-80 overflow-y-auto py-1.5">
            {adminNotifications.map((notification) => (
              <li key={notification.id}>
                <DropdownMenu.Item className="flex cursor-pointer gap-3 px-5 py-3 outline-none transition-colors data-[highlighted]:bg-ink-50">
                  <span
                    aria-hidden
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      notification.unread ? "bg-brand-500" : "bg-ink-200",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium text-ink-900">
                        {notification.title}
                      </span>
                      <span className="shrink-0 text-[11px] tabular-nums text-ink-400">
                        {formatClock(notification.at)}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                      {notification.body}
                    </span>
                  </span>
                </DropdownMenu.Item>
              </li>
            ))}
          </ul>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function AccountMenu() {
  const items = [
    { label: "Profile", icon: UserRound },
    { label: "Settings", icon: Settings },
    { label: "Help & support", icon: LifeBuoy },
  ];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-ink-100 data-[state=open]:bg-ink-100"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink-900 text-xs font-semibold text-white">
            {adminUser.initials}
          </span>
          <span className="hidden text-left lg:block">
            <span className="block text-sm font-medium leading-tight text-ink-900">
              {adminUser.name}
            </span>
            <span className="block text-[11px] leading-tight text-ink-500">
              {adminUser.role}
            </span>
          </span>
          <ChevronDown className="hidden size-4 text-ink-400 lg:block" aria-hidden />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          className="z-50 w-60 overflow-hidden rounded-2xl border border-ink-200/70 bg-white p-1.5 shadow-float data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-medium text-ink-900">{adminUser.name}</p>
            <p className="truncate text-xs text-ink-500">{adminUser.email}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-ink-100" />

          {items.map((item) => (
            <DropdownMenu.Item
              key={item.label}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-ink-700 outline-none transition-colors data-[highlighted]:bg-ink-50 data-[highlighted]:text-ink-900"
            >
              <item.icon className="size-4 text-ink-400" aria-hidden />
              {item.label}
            </DropdownMenu.Item>
          ))}

          <DropdownMenu.Separator className="my-1 h-px bg-ink-100" />
          <DropdownMenu.Item className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-red-600 outline-none transition-colors data-[highlighted]:bg-red-50">
            <LogOut className="size-4" aria-hidden />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/* ========================================================================== */
/*  Shell                                                                     */
/* ========================================================================== */

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const pathname = usePathname();

  const currentSection =
    [...adminNav]
      .sort((a, b) => b.href.length - a.href.length)
      .find((item) => isActiveRoute(pathname, item.href))?.label ?? "Dashboard";

  return (
    <div className="min-h-dvh bg-surface-muted">
      {/* Desktop sidebar — fixed so the content column scrolls independently. */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-400 ease-[var(--ease-out-expo)] lg:block",
          collapsed ? "w-20" : "w-64",
        )}
      >
        <SidebarBody
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((value) => !value)}
        />
      </aside>

      <div
        className={cn(
          "flex min-h-dvh flex-col transition-[padding] duration-400 ease-[var(--ease-out-expo)]",
          collapsed ? "lg:pl-20" : "lg:pl-64",
        )}
      >
        <header className="sticky top-0 z-30 border-b border-ink-200/70 bg-white/80 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-2 px-4 sm:px-6">
            {/* Mobile drawer */}
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Open navigation" className="lg:hidden">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                hideClose
                className="w-72 gap-0 border-0 bg-ink-900 p-0"
                aria-label="Admin navigation"
              >
                <SidebarBody collapsed={false} onNavigate={() => setDrawerOpen(false)} />
              </SheetContent>
            </Sheet>

            <p className="truncate font-display text-lg text-ink-900 lg:hidden">
              {currentSection}
            </p>

            {/* Global search — cosmetic until the search API lands. */}
            <div className="relative ml-auto hidden max-w-md flex-1 lg:ml-0 lg:block">
              <label htmlFor="admin-global-search" className="sr-only">
                Search orders, customers and dishes
              </label>
              <Search
                className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-400"
                aria-hidden
              />
              <input
                id="admin-global-search"
                type="search"
                placeholder="Search orders, customers, dishes…"
                className="h-11 w-full rounded-full border border-ink-200 bg-ink-50/70 pl-11 pr-4 text-sm text-ink-900 placeholder:text-ink-400 transition-all duration-200 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/12"
              />
            </div>

            <div className="ml-auto flex items-center gap-1 lg:gap-2">
              <NotificationsMenu />
              <span className="hidden h-6 w-px bg-ink-200 sm:block" aria-hidden />
              <AccountMenu />
            </div>
          </div>
        </header>

        <main id="admin-main" className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto w-full max-w-[96rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}
