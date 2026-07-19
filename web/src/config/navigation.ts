/** Navigation maps used by the navbar, mobile drawer, footer and sitemap. */

export type NavItem = {
  label: string;
  href: string;
  description?: string;
};

/** Primary header navigation. Keep to 6 items — beyond that the bar crowds. */
export const mainNav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Menu", href: "/menu", description: "80+ homestyle dishes" },
  { label: "Tiffin Service", href: "/tiffin", description: "Monthly meal plans" },
  { label: "Offers", href: "/offers", description: "Live deals & coupons" },
  { label: "Gallery", href: "/gallery", description: "Inside our kitchen" },
  { label: "About", href: "/about", description: "Our story" },
];

/** Secondary links that live in the mobile drawer and footer only. */
export const secondaryNav: NavItem[] = [
  { label: "Contact", href: "/contact" },
  { label: "FAQ", href: "/faq" },
];

export const footerNav: { title: string; items: NavItem[] }[] = [
  {
    title: "Explore",
    items: [
      { label: "Full Menu", href: "/menu" },
      { label: "Tiffin Plans", href: "/tiffin" },
      { label: "Build Your Tiffin", href: "/tiffin#build" },
      { label: "Today's Special", href: "/menu?filter=special" },
      { label: "Offers", href: "/offers" },
    ],
  },
  {
    title: "Company",
    items: [
      { label: "About Us", href: "/about" },
      { label: "Gallery", href: "/gallery" },
      { label: "Contact", href: "/contact" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "Support",
    items: [
      { label: "Track Order", href: "/contact" },
      { label: "Delivery Areas", href: "/#delivery-areas" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Refund Policy", href: "/refund-policy" },
    ],
  },
];

/** Admin sidebar. Icon names resolve against a lucide map in the admin shell. */
export const adminNav: { label: string; href: string; icon: string }[] = [
  { label: "Dashboard", href: "/admin", icon: "LayoutDashboard" },
  { label: "Orders", href: "/admin/orders", icon: "ReceiptText" },
  { label: "Menu", href: "/admin/menu", icon: "UtensilsCrossed" },
  { label: "Today's Special", href: "/admin/specials", icon: "Sparkles" },
  { label: "Customers", href: "/admin/customers", icon: "Users" },
  { label: "Subscribers", href: "/admin/subscribers", icon: "CalendarCheck" },
  { label: "Gallery", href: "/admin/gallery", icon: "Images" },
  { label: "Offers", href: "/admin/offers", icon: "BadgePercent" },
  { label: "Analytics", href: "/admin/analytics", icon: "TrendingUp" },
];
