/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('gios-theme') || 'default';
  });

  useEffect(() => {
    localStorage.setItem('gios-theme', theme);
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const themes = [
    { id: 'default', name: 'Neon Emerald', colors: ['var(--color-primary)', 'var(--color-secondary)'] },
    { id: 'cyberpunk', name: 'Cyberpunk Void', colors: ['#ff00ff', '#00ffff'] },
    { id: 'ocean', name: 'Deep Ocean', colors: ['#00bbff', '#00ffcc'] },
    { id: 'crimson', name: 'Crimson Protocol', colors: ['#ff3333', '#ffaa00'] },
  ];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
};
