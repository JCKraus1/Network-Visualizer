import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { THEMES, type ThemeName, type ThemeConfig } from '../themes';

const LS_THEME_KEY = 'hv-theme';

interface ThemeContextValue {
  themeName: ThemeName;
  theme: ThemeConfig;
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeName: 'futuristic',
  theme: THEMES.futuristic,
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>(() => {
    try {
      const s = localStorage.getItem(LS_THEME_KEY);
      if (s && s in THEMES) return s as ThemeName;
    } catch { /* ignore */ }
    return 'futuristic';
  });

  const theme = THEMES[themeName];

  // Apply CSS variables to :root on every theme change
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(theme.cssVars).forEach(([k, v]) => root.style.setProperty(k, v));
    if (theme.light) {
      root.setAttribute('data-theme-light', 'true');
    } else {
      root.removeAttribute('data-theme-light');
    }
  }, [theme]);

  const setTheme = (name: ThemeName) => {
    setThemeName(name);
    localStorage.setItem(LS_THEME_KEY, name);
  };

  return (
    <ThemeContext.Provider value={{ themeName, theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
export const useCategoryColors = () => useContext(ThemeContext).theme.categories;
export const useStatusColors  = () => useContext(ThemeContext).theme.statusColors;
