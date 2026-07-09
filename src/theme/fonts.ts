import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

/**
 * Poppins is the app's brand typeface (per the Figma). The three weights below
 * are the ones the designs actually use. Load `fontMap` once at the app root
 * with `useFonts`, then reference `fonts.*` as `fontFamily` in styles.
 */
export const fontMap = {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
};

export const fonts = {
  regular: 'Poppins_400Regular',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;
