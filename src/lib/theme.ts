interface ThemeConfig {
    background: string;
    foreground: string;
    primary: string;
    primaryForeground: string;
    card: string;
    cardForeground: string;
    secondary: string;
    secondaryForeground: string;
    border: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
  }
  
  const themes: Record<string, ThemeConfig> = {
    // Expert-comptable - Thème noir et blanc professionnel
    'tYKkHV3IDTWqBOViN4FS1vacN0I3': {
        background: '0 0% 0%',       // Noir
        foreground: '0 0% 100%',     // Blanc
        primary: '0 0% 0%',          // Noir
        primaryForeground: '0 0% 100%', // Blanc
        card: '0 0% 0%',            // Noir
        cardForeground: '0 0% 100%', // Blanc
        secondary: '0 0% 0%',        // Noir
        secondaryForeground: '0 0% 100%', // Blanc
        border: '0 0% 100%',         // Blanc
        muted: '0 0% 0%',           // Noir
        mutedForeground: '0 0% 80%', // Gris clair
        accent: '0 0% 0%',          // Noir
        accentForeground: '0 0% 100%' // Blanc
    },
    // Autre exemple - Thème bleu professionnel
    'eWnA3TqDBKVsd2RpViEkJPNTE753': {
      background: '210 40% 98%',     // Blanc légèrement bleuté
      foreground: '222 47% 11%',     // Bleu foncé
      primary: '222 47% 11%',        // Bleu foncé
      primaryForeground: '210 40% 98%', // Blanc
      card: '0 0% 100%',             // Blanc
      cardForeground: '222 47% 11%', // Bleu foncé
      secondary: '210 40% 96%',      // Bleu très clair
      secondaryForeground: '222 47% 11%', // Bleu foncé
      border: '214 32% 91%',         // Bleu gris clair
      muted: '210 40% 96%',          // Bleu très clair
      mutedForeground: '215 16% 47%', // Bleu gris
      accent: '210 40% 96%',         // Bleu très clair
      accentForeground: '222 47% 11%' // Bleu foncé
    },
  
    // Thème par défaut
    default: {
      background: '0 0% 100%',
      foreground: '0 0% 3.9%',
      primary: '0 0% 9%',
      primaryForeground: '0 0% 98%',
      card: '0 0% 100%',
      cardForeground: '0 0% 3.9%',
      secondary: '0 0% 96.1%',
      secondaryForeground: '0 0% 9%',
      border: '0 0% 89.8%',
      muted: '0 0% 96.1%',
      mutedForeground: '0 0% 45.1%',
      accent: '0 0% 96.1%',
      accentForeground: '0 0% 9%'
    }
  };
  
  export function getTheme(businessId: string): ThemeConfig {
    return themes[businessId] || themes.default;
  }
  
  export function applyTheme(businessId: string): void {
    const theme = getTheme(businessId);
    const root = document.documentElement;
  
    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  }