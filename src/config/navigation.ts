import type { LucideIcon } from 'lucide-react';
import { BarChart3, Home, Settings, Sparkles } from 'lucide-react';

export type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navigationItems: NavigationItem[] = [
  {
    href: '/',
    label: 'Home',
    icon: Home,
  },
  {
    href: '/practice',
    label: 'Practice',
    icon: Sparkles,
  },
  {
    href: '/progress',
    label: 'Progress',
    icon: BarChart3,
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
  },
];
