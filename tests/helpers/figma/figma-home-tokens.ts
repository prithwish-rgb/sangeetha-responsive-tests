/**
 * ═════════════════════════════════════════════════════════════════════════════
 * FIGMA DESIGN TOKENS & NODE SPECIFICATIONS
 * Source: Sangeetha-Des (Node 4681:131479 - Mobile Home Screen, 390px x 5299px)
 * Figma URL: https://www.figma.com/design/Q7vjg9zvLUDvEQ5ZEh2Dki/Sangeetha-Des?node-id=4681-131479
 * ═════════════════════════════════════════════════════════════════════════════
 */

export const FIGMA_SOURCE = {
  fileKey: 'Q7vjg9zvLUDvEQ5ZEh2Dki',
  fileName: 'Sangeetha-Des',
  nodeId: '4681:131479',
  nodeName: 'Home Screen (Mobile)',
  viewport: { width: 390, height: 844 },
  totalHeight: 5299,
};

export const STAGING_BASE_URL = process.env.STAGING_URL || 'https://smpl-new.bangalore2.com/';

export const FIGMA_TOKENS = {
  // ─── Color Palette ────────────────────────────────────────────────────────
  colors: {
    white: '#FFFFFF',
    black: '#030B1A',
    neutralBlack: '#030B1A',
    neutral50: '#F9FAFB',
    neutral100: '#F6F6F6',
    neutral300: '#D9DFE9',
    neutral500: '#5C6779',
    neutral600: '#4F5A6E',
    blueBase: '#0B74B8',
    blue100: '#E7F1F8',
    searchPlaceholder: '#9AA0B4',
    saveBadgeBg: '#252B0D',
    dealOfDayBg: '#030B1A',
    dealOfDayGradient: 'linear-gradient(56deg, rgba(84, 168, 223, 1) 0%, rgba(255, 255, 255, 1) 57%, rgba(241, 166, 93, 1) 100%)',
    appDownloadGradient: 'linear-gradient(163deg, rgba(253, 231, 208, 1) 0%, rgba(237, 194, 150, 1) 100%)',
  },

  // ─── Component Specs ──────────────────────────────────────────────────────
  header: {
    padding: '24px',
    backgroundColor: '#FFFFFF',
    logoNodeId: '4681:131496',
    cartButtonNodeId: '4681:131512',
    cartButtonSize: { width: 40, height: 40 },
    cartButtonRadius: 12,
    cartButtonBorder: '1px solid rgba(0, 0, 0, 0.1)',
  },

  locationBar: {
    nodeId: '4681:131523',
    fontFamily: 'Outfit',
    fontWeight: 500,
    fontSize: 13,
    lineHeight: '20px',
    textDecoration: 'underline',
  },

  searchBar: {
    nodeId: '4681:131532',
    placeholderText: 'Search or Ask for "Smartphones"',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: '14px 20px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    fontFamily: 'Outfit',
    fontWeight: 400,
    fontSize: 14,
    textColor: '#9AA0B4',
    icons: {
      sparkle: { nodeId: '4681:131534', alt: 'sparkle' },
      camera: { nodeId: '4681:131545', alt: 'camera' },
      microphone: { nodeId: '4681:131546', alt: 'microphone' },
    },
    suggestionChips: [
      'Smartphones',
      'Smart Watches',
      'Smart gadgets',
      'Mobile Accessories',
    ],
  },

  productCard: {
    nodeId: '4681:131568',
    width: 106,
    height: 195,
    borderRadius: 16,
    padding: 12,
    titleTypography: {
      fontFamily: 'Outfit',
      fontWeight: 500,
      fontSize: 10,
      letterSpacing: '-0.024em',
    },
    priceTypography: {
      fontFamily: 'Outfit',
      fontWeight: 600,
      fontSize: 12,
      lineHeight: '16px',
      letterSpacing: '-0.02em',
    },
    strikeThroughTypography: {
      fontFamily: 'Outfit',
      fontWeight: 400,
      fontSize: 10,
      lineHeight: '14px',
      textDecoration: 'line-through',
    },
    saveBadge: {
      backgroundColor: '#252B0D',
      fontFamily: 'Outfit',
      fontWeight: 500,
    },
  },

  dealOfDay: {
    nodeId: 'EL-149168c2',
    textNodeId: 'EL-562144ed',
    title: 'Deal of the day',
    backgroundColor: '#030B1A',
    padding: '40px 24px',
    gap: 24,
    titleTypography: {
      fontFamily: 'Outfit',
      fontWeight: 500,
      fontSize: 32,
      lineHeight: '38px',
      letterSpacing: '-0.0188em',
    },
  },

  appDownloadBanner: {
    nodeId: 'EL-9704b675',
    titleNodeId: 'EL-e40cac0b',
    title: 'Download the Sangeetha App',
    subtitle: 'Find our on exclusive launches & amazing deals',
    width: 390,
    height: 192,
    titleTypography: {
      fontFamily: 'Outfit',
      fontWeight: 500,
      fontSize: 16,
      lineHeight: '1.3em',
      letterSpacing: '-0.01em',
    },
    subtitleTypography: {
      fontFamily: 'Outfit',
      fontWeight: 400,
      fontSize: 14,
      lineHeight: '1.3em',
    },
  },
};

export const TOLERANCE = {
  pixelDimensions: 4,     // px variance allowed across responsive breakpoints
  fontSize: 2,            // px font size tolerance
  colorDelta: 12,         // per-channel RGB tolerance
};
