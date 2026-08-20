import {
  Home, ShoppingCart, Car, HeartPulse, Popcorn, UtensilsCrossed,
  ShoppingBag, PiggyBank, Repeat, Landmark, CircleDollarSign, type LucideIcon,
} from 'lucide-react';

/**
 * Maps common bucket/category names to a recognizable icon.
 * Matching is case-insensitive substring so custom names like "Home Insurance"
 * or "Grocery Store" still resolve sensibly. Falls back to a generic $ icon.
 */
const ICON_RULES: Array<[RegExp, LucideIcon]> = [
  [/hous|rent|mortgage/, Home],
  [/grocer/, ShoppingCart],
  [/transport|car|gas|fuel|uber|commute/, Car],
  [/health|medical|doctor|pharmacy/, HeartPulse],
  [/entertain|movie|fun/, Popcorn],
  [/dining|restaurant|food|eat/, UtensilsCrossed],
  [/shop/, ShoppingBag],
  [/saving/, PiggyBank],
  [/subscript|streaming/, Repeat],
  [/loan|debt|credit/, Landmark],
];

export function bucketIcon(name: string): LucideIcon {
  const lower = name.toLowerCase();
  for (const [pattern, Icon] of ICON_RULES) {
    if (pattern.test(lower)) return Icon;
  }
  return CircleDollarSign;
}
