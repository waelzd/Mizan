import {
  Utensils,
  Car,
  Home,
  Zap,
  Film,
  HeartPulse,
  ShoppingBag,
  Wallet,
  Plane,
  GraduationCap,
  Gift,
  Coffee,
  Dumbbell,
  PawPrint,
  Baby,
  Smartphone,
  Wifi,
  type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  home: Home,
  zap: Zap,
  film: Film,
  health: HeartPulse,
  shopping: ShoppingBag,
  wallet: Wallet,
  plane: Plane,
  education: GraduationCap,
  gift: Gift,
  coffee: Coffee,
  dumbbell: Dumbbell,
  pet: PawPrint,
  baby: Baby,
  phone: Smartphone,
  wifi: Wifi,
};

export const ICON_KEYS = Object.keys(ICONS);

export function CategoryIcon({
  icon,
  className,
}: {
  icon: string;
  className?: string;
}) {
  const Comp = ICONS[icon] ?? Wallet;
  return <Comp className={className} aria-hidden="true" />;
}
