/**
 * Brand palette, aligned with the web dashboard so the two clients read as one
 * product. Superkalan Gaz primary is the blue used across the web app (#007BC1).
 * The `login*` tokens come from the Figma login frame (node 175-1759).
 */
export const colors = {
  primary: '#007BC1',
  primaryDark: '#006399',
  primaryTint: '#E6F1FB',

  success: '#1D9E75',
  danger: '#CC1903',
  warning: '#C07A12',

  text: '#1A1A18',
  textMuted: '#6B6B67',
  border: '#E4E4E0',
  surface: '#FFFFFF',
  surfaceMuted: '#F7F7F6',
  background: '#F5F6F8',

  // --- Login screen (Figma) ---
  loginBackground: '#E7F3FB', // pale blue page behind the card
  heading: '#044674', // "Welcome back!" + subtitle
  label: '#002540', // field labels
  placeholder: '#B5C5CF', // input placeholder text
  tabInactive: '#989898', // "Commercial" tab
  inputBorder: '#E6EDF1', // input outline
  segmentTrack: '#F4F5F6', // Email/Phone segmented track
  footerText: '#193028', // "Don't have an account?"
  signupLink: '#2D7DEE', // "Sign Up"
} as const;

export type ColorToken = keyof typeof colors;
