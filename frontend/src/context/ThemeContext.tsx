import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type Theme = 'dark' | 'light' | 'midnight' | 'sand';

export const THEMES: { id: Theme; label: string; mode: 'dark' | 'light'; swatch: string; description: string }[] = [
  { id: 'dark', label: 'Dark', mode: 'dark', swatch: '#0B0F19', description: 'The original deep-navy theme with cyan/violet glow.' },
  { id: 'midnight', label: 'Midnight', mode: 'dark', swatch: '#050608', description: 'Near-black, higher contrast — easiest on the eyes in low light.' },
  { id: 'light', label: 'Light', mode: 'light', swatch: '#F1F5F9', description: 'Clean white with cool slate-gray text.' },
  { id: 'sand', label: 'Sand', mode: 'light', swatch: '#F5F1EA', description: 'Warm cream surface with soft stone-gray text.' },
];

const VALID_THEMES: Theme[] = THEMES.map((t) => t.id);

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('personalverse_theme') as Theme | null;
    return saved && VALID_THEMES.includes(saved) ? saved : 'dark';
  });

  useEffect(() => {
    localStorage.setItem('personalverse_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  // Quick-toggle (header icon) flips between the two dark/light modes, staying within whichever
  // "family" (dark: dark/midnight, light: light/sand) the user is currently in.
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const current = THEMES.find((t) => t.id === prev);
      return current?.mode === 'dark' ? 'light' : 'dark';
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
