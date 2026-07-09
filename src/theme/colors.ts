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

  // Dark tint layered over the sign-up sheet's blur. Stands on its own so the
  // backdrop still reads as dimmed on Android, where BlurView is weak/absent.
  scrim: 'rgba(2,20,34,0.45)',

  // --- Home / Quick Order (Figma landing) ---
  helloAccent: '#81D1FF', // the "Juan" in the header greeting
  pointsTop: '#044674', // points card gradient — top (dark)
  pointsBottom: '#0883DA', // points card gradient — bottom (light)
  homeSheet: '#FFFFFF', // white rounded sheet under the blue header
  claimBtn: '#D7EFFF', // pale blue "Claim Reward" button
  detailsBtn: 'rgba(70,161,225,0.20)', // translucent "Details" button on the card
  activeFooter: '#E5F2F9', // "View Order Details" strip
  activeCardBorder: '#EAEAEA', // Active Orders card outline
  navInactive: '#9DB2CE', // inactive bottom-tab icon/label
} as const;

export type ColorToken = keyof typeof colors;
