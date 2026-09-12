/**
 * Figma Design Tokens — Home Screen (node 4681:131479)
 * Source: https://www.figma.com/design/Q7vjg9zvLUDvEQ5ZEh2Dki/Sangeetha-Des?node-id=4681-131479
 * Viewport: 390px wide × 5299px tall (mobile)
 */

export const FIGMA_NODE = '4681:131479';
export const FIGMA_URL = 'https://www.figma.com/design/Q7vjg9zvLUDvEQ5ZEh2Dki/Sangeetha-Des?node-id=4681-131479';
export const STAGING_URL = process.env.STAGING_URL || 'https://smpl-new.bangalore2.com/';

// ─── Viewport ────────────────────────────────────────────────────────────────
export const VIEWPORT = { width: 390, height: 844 };

// ─── Colors ──────────────────────────────────────────────────────────────────
export const COLORS = {
  white:          '#FFFFFF',
  black:          '#030B1A',
  neutralBlack:   '#030B1A',
  neutral100:     '#F6F6F6',
  neutral300:     '#D9DFE9',
  neutral500:     '#5C6779',
  neutral600:     '#4F5A6E',
  blueBase:       '#0B74B8',
  blue100:        '#E7F1F8',
  searchPlaceholder: '#9AA0B4',
  headerBg:       'rgba(255, 255, 255, 1)',  // header section is white fill
  cardBorder:     'rgba(0, 0, 0, 0.1)',
  cardShadow:     '5px 5px 50px 0px rgba(0, 0, 0, 0.15)',
  // Product-card "Price Drop" banner gradient (dark background card)
  dealOfDayGradient: 'linear-gradient(56deg, rgba(84, 168, 223, 1) 0%, rgba(255, 255, 255, 1) 57%, rgba(241, 166, 93, 1) 100%)',
  appDownloadGradient: 'linear-gradient(163deg, rgba(253, 231, 208, 1) 0%, rgba(237, 194, 150, 1) 100%)',
  savedBadgeBg:   '#252B0D', // green-dark save badge
};

// ─── Typography ──────────────────────────────────────────────────────────────
export const TYPOGRAPHY = {
  searchPlaceholder: {
    fontFamily: 'Outfit',
    fontWeight: 400,
    fontSize: 14,
    lineHeight: '20px',
    color: '#9AA0B4',
  },
  locationText: {
    fontFamily: 'Outfit',
    fontWeight: 500,
    fontSize: 13,
    lineHeight: '20px',
    textDecoration: 'underline',
  },
  productTitle: {
    fontFamily: 'Outfit',
    fontWeight: 500,
    fontSize: 10,
    letterSpacing: '-0.024em',
  },
  productPrice: {
    fontFamily: 'Outfit',
    fontWeight: 600,
    fontSize: 12,
    lineHeight: '16px',
    letterSpacing: '-0.02em',
  },
  strikeThroughPrice: {
    fontWeight: 400,
    fontSize: 10,
    lineHeight: '14px',
    textDecoration: 'line-through',
  },
  saveBadge: {
    fontFamily: 'Outfit',
    fontWeight: 500,  // style_85b70d6c
  },
  dealOfDay: {
    fontFamily: 'Outfit',
    fontWeight: 500,
    fontSize: 32,
    lineHeight: '38px',
    letterSpacing: '-0.0188em',
  },
  appDownloadTitle: {
    fontFamily: 'Outfit',
    fontWeight: 500,
    fontSize: 16,
    lineHeight: '1.3em',
    letterSpacing: '-0.01em',
  },
};

// ─── Layout / Spacing ────────────────────────────────────────────────────────
export const LAYOUT = {
  frameWidth: 390,
  contentGap: 24,
  headerPadding: '24px',
  searchBarHeight: 48,       // 14px*2 padding + 20px line
  searchBarBorderRadius: 12,
  searchBarBorderColor: 'rgba(0, 0, 0, 0.1)',
  cartButtonSize: 40,
  cartButtonRadius: 12,
  menuButtonRadius: 12,
  productCardWidth: 106,
  productCardHeight: 195,
  productCardRadius: 16,
  productCardPadding: 12,
  dealCardPadding: '16px 16px 20px',
  dealCardRadius: 24,
  appDownloadSectionWidth: 390,
  appDownloadSectionHeight: 192,
};

// ─── Tolerance ───────────────────────────────────────────────────────────────
export const TOLERANCE = {
  pixels: 4,       // acceptable px diff for dimensions/positions
  colorDelta: 10,  // acceptable channel difference for RGB color comparison
  screenshotThreshold: 0.05,  // 5% pixel diff allowed for screenshots
};

// ─── Sections present in the Home Screen ────────────────────────────────────
export const HOME_SECTIONS = [
  'hero-banner',
  'location-bar',
  'search-bar',
  'search-suggestions',
  'women-day-banner',
  'product-cards-horizontal-scroll',
  'deal-of-the-day',
  'app-download-banner',
] as const;
