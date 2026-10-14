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
  // --- Home / Quick Order (Figma landing) ---
  helloAccent: '#81D1FF', // the customer's first name in the header greeting
  pointsTop: '#044674', // points card gradient — top (dark)
  pointsBottom: '#0883DA', // points card gradient — bottom (light)
  homeSheet: '#FFFFFF', // white rounded sheet under the blue header
  claimBtn: '#D7EFFF', // pale blue "Claim Reward" button
  detailsBtn: 'rgba(70,161,225,0.20)', // translucent "Details" button on the card
  activeFooter: '#E5F2F9', // "View Order Details" strip
  activeCardBorder: '#EAEAEA', // Active Orders card outline
  navInactive: '#9DB2CE', // inactive bottom-tab icon/label

  // --- Extended Figma palette (customer app screens) ---
  // These trace to the Figma Make frames the screens were ported from. Grouped
  // here so screens reference tokens instead of inlining raw hex (DESIGN.md §2).
  authBg: '#EAF7FF', // pale-blue canvas behind auth cards
  headerBlue: '#007BC1', // shared blue app header (same as primary)
  navBarFill: '#BEE1F7', // floating bottom-nav bar background
  darkNavy: '#044674', // menu drawer + headings (same as heading)
  cardBorder: '#D9D9D9', // generic card / input outline
  divider: '#F1F1F1', // thin section dividers
  dividerStrong: '#D9D9D9', // stronger separators inside cards
  muted: '#989898', // inactive tab / disabled text
  grayText: '#7D7F7E', // secondary body text
  gray: '#757575', // tertiary text / icons
  avatarGray: '#8F9297', // avatar placeholder fill
  searchBg: '#F0F4F7', // FAQ search field background
  prefRowBg: '#F2F2F2', // account-preferences row background
  redeemPale: '#F5F5F5', // recessed calendar / picker background
  green: '#1DB418', // success circle (confirmed / redeemed)
  greenBright: '#4BAD40', // "earned" points / first stepper node
  greenToast: '#50AF77', // toast success check
  starYellow: '#FFD147', // filled feedback stars + rider rating
  disabledBlue: '#B0CFE0', // disabled primary button (feedback next)
  disabledGray: '#989898', // disabled dark button text
  stepIdle: '#C0D5DE', // stepper idle node border/line
  stepActiveBg: '#F0F6FF', // stepper upcoming node fill
  promoScrim: 'rgba(0,0,0,0.30)', // modal / drawer backdrop
} as const;

export type ColorToken = keyof typeof colors;
