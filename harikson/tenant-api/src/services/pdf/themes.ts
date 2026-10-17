import { DocumentThemeName, PdfThemeTokens } from './types.js';

export const PDF_THEMES: Record<DocumentThemeName, PdfThemeTokens> = {
  corporate: {
    name: 'corporate',
    colors: {
      primary: '#0F172A',       // Slate 900
      secondary: '#334155',     // Slate 700
      accent: '#2563EB',        // Royal Blue
      text: '#1E293B',          // Slate 800
      textMuted: '#64748B',     // Slate 500
      background: '#FFFFFF',
      cardBackground: '#F8FAFC',// Slate 50
      border: '#E2E8F0',        // Slate 200
      tableHeaderBg: '#0F172A',
      tableHeaderText: '#FFFFFF',
      tableAltRowBg: '#F8FAFC',
      codeBg: '#0F172A',
      codeText: '#38BDF8',
      calloutRibbon: {
        info: '#2563EB',
        warning: '#D97706',
        tip: '#059669',
        note: '#475569',
        quote: '#64748B',
        success: '#16A34A',
      },
      calloutBg: {
        info: '#EFF6FF',
        warning: '#FFFBEB',
        tip: '#ECFDF5',
        note: '#F1F5F9',
        quote: '#F8FAFC',
        success: '#F0FDF4',
      },
    },
    typography: {
      baseFontSize: 10,
      titleSize: 26,
      subtitleSize: 13,
      h1Size: 18,
      h2Size: 14,
      h3Size: 12,
      h4Size: 10.5,
      bodySize: 10,
      captionSize: 8.5,
      lineHeight: 1.45,
    },
    margins: {
      top: 54,
      bottom: 54,
      left: 54,
      right: 54,
    },
  },

  minimal: {
    name: 'minimal',
    colors: {
      primary: '#111827',       // Gray 900
      secondary: '#374151',     // Gray 700
      accent: '#111827',        // Pure Black
      text: '#1F2937',          // Gray 800
      textMuted: '#6B7280',     // Gray 500
      background: '#FFFFFF',
      cardBackground: '#FAFAFA',
      border: '#E5E7EB',        // Gray 200
      tableHeaderBg: '#1F2937',
      tableHeaderText: '#FFFFFF',
      tableAltRowBg: '#F9FAFB',
      codeBg: '#1F2937',
      codeText: '#E5E7EB',
      calloutRibbon: {
        info: '#111827',
        warning: '#4B5563',
        tip: '#111827',
        note: '#6B7280',
        quote: '#9CA3AF',
        success: '#111827',
      },
      calloutBg: {
        info: '#F9FAFB',
        warning: '#F9FAFB',
        tip: '#F9FAFB',
        note: '#F9FAFB',
        quote: '#F9FAFB',
        success: '#F9FAFB',
      },
    },
    typography: {
      baseFontSize: 9.5,
      titleSize: 24,
      subtitleSize: 12,
      h1Size: 17,
      h2Size: 13.5,
      h3Size: 11.5,
      h4Size: 10,
      bodySize: 9.5,
      captionSize: 8,
      lineHeight: 1.5,
    },
    margins: {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50,
    },
  },

  technical: {
    name: 'technical',
    colors: {
      primary: '#090D16',
      secondary: '#1E293B',
      accent: '#0284C7',        // Sky 600
      text: '#0F172A',
      textMuted: '#64748B',
      background: '#FFFFFF',
      cardBackground: '#F0F9FF',
      border: '#CBD5E1',
      tableHeaderBg: '#090D16',
      tableHeaderText: '#F8FAFC',
      tableAltRowBg: '#F1F5F9',
      codeBg: '#090D16',
      codeText: '#38BDF8',
      calloutRibbon: {
        info: '#0284C7',
        warning: '#EA580C',
        tip: '#10B981',
        note: '#64748B',
        quote: '#0284C7',
        success: '#10B981',
      },
      calloutBg: {
        info: '#F0F9FF',
        warning: '#FFF7ED',
        tip: '#ECFDF5',
        note: '#F8FAFC',
        quote: '#F0F9FF',
        success: '#ECFDF5',
      },
    },
    typography: {
      baseFontSize: 9.5,
      titleSize: 24,
      subtitleSize: 12,
      h1Size: 17,
      h2Size: 13,
      h3Size: 11,
      h4Size: 10,
      bodySize: 9.5,
      captionSize: 8,
      lineHeight: 1.4,
    },
    margins: {
      top: 48,
      bottom: 48,
      left: 48,
      right: 48,
    },
  },

  academic: {
    name: 'academic',
    colors: {
      primary: '#1C1917',       // Stone 900
      secondary: '#44403C',     // Stone 700
      accent: '#78350F',        // Amber 900
      text: '#292524',          // Stone 800
      textMuted: '#78716C',     // Stone 500
      background: '#FFFFFF',
      cardBackground: '#FAF7F5',
      border: '#E7E5E4',        // Stone 200
      tableHeaderBg: '#292524',
      tableHeaderText: '#FAF7F5',
      tableAltRowBg: '#FAF7F5',
      codeBg: '#292524',
      codeText: '#F59E0B',
      calloutRibbon: {
        info: '#78350F',
        warning: '#B45309',
        tip: '#065F46',
        note: '#57534E',
        quote: '#78716C',
        success: '#065F46',
      },
      calloutBg: {
        info: '#FFFBEB',
        warning: '#FEF3C7',
        tip: '#ECFDF5',
        note: '#F5F5F4',
        quote: '#FAFAF9',
        success: '#ECFDF5',
      },
    },
    typography: {
      baseFontSize: 10,
      titleSize: 24,
      subtitleSize: 12,
      h1Size: 16.5,
      h2Size: 13,
      h3Size: 11,
      h4Size: 10,
      bodySize: 10,
      captionSize: 8.5,
      lineHeight: 1.55,
    },
    margins: {
      top: 60,
      bottom: 60,
      left: 60,
      right: 60,
    },
  },

  xarwiz: {
    name: 'xarwiz',
    colors: {
      primary: '#0B132B',       // Xarwiz Navy
      secondary: '#1C2541',
      accent: '#2563EB',        // Sovereign Electric Blue
      text: '#0F172A',
      textMuted: '#64748B',
      background: '#FFFFFF',
      cardBackground: '#F8FAFC',
      border: '#E2E8F0',
      tableHeaderBg: '#0B132B',
      tableHeaderText: '#FFFFFF',
      tableAltRowBg: '#F1F5F9',
      codeBg: '#0B132B',
      codeText: '#60A5FA',
      calloutRibbon: {
        info: '#2563EB',
        warning: '#F59E0B',
        tip: '#10B981',
        note: '#6366F1',
        quote: '#2563EB',
        success: '#10B981',
      },
      calloutBg: {
        info: '#EFF6FF',
        warning: '#FFFBEB',
        tip: '#ECFDF5',
        note: '#EEF2FF',
        quote: '#F8FAFC',
        success: '#ECFDF5',
      },
    },
    typography: {
      baseFontSize: 10,
      titleSize: 26,
      subtitleSize: 13,
      h1Size: 18,
      h2Size: 14,
      h3Size: 12,
      h4Size: 10.5,
      bodySize: 10,
      captionSize: 8.5,
      lineHeight: 1.45,
    },
    margins: {
      top: 54,
      bottom: 54,
      left: 54,
      right: 54,
    },
  },
};

export function getTheme(themeName?: DocumentThemeName): PdfThemeTokens {
  if (themeName && PDF_THEMES[themeName]) {
    return PDF_THEMES[themeName];
  }
  return PDF_THEMES.corporate;
}
