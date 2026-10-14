import { Platform, type ViewStyle } from 'react-native';

/**
 * Shared spacing / radii / elevation, extracted from the de-facto values used
 * across the ported Figma screens (DESIGN.md §4–§5). Screens should reference
 * these instead of re-declaring magic numbers.
 */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;

export const radii = {
  chip: 5,
  card: 10,
  input: 10,
  button: 8,
  sheet: 20,
  header: 24,
  pill: 999,
} as const;

/** The shared card shadow (DESIGN.md §5 `cardShadow`). */
export const cardShadow: ViewStyle = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  elevation: 4,
};

/** Softer shadow for the floating nav bar (lifts upward). */
export const navShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  default: { elevation: 12 },
}) as ViewStyle;
