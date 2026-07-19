import {
  Carrot,
  CookingPot,
  Droplets,
  Eye,
  Grid3x3,
  Milk,
  ScanLine,
  Sparkles,
  SprayCan,
  Stethoscope,
  Target,
  Thermometer,
  Wheat,
  type LucideIcon,
} from "lucide-react";

/**
 * `src/data/content.ts` stores icons as plain strings so the content file stays
 * free of React imports and can be edited by non-developers. This map is the
 * one place those strings become components — an unknown name degrades to a
 * neutral sparkle rather than crashing the page.
 */
const ICONS: Record<string, LucideIcon> = {
  Target,
  Eye,
  SprayCan,
  Thermometer,
  Droplets,
  Stethoscope,
  Grid3x3,
  ScanLine,
  Carrot,
  Milk,
  Wheat,
  CookingPot,
};

export function resolveIcon(name: string): LucideIcon {
  return ICONS[name] ?? Sparkles;
}
