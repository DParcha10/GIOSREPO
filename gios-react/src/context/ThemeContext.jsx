/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return 'default';
  });

  useEffect(() => {
    localStorage.setItem('gios-theme', theme);
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const themes = [
    { id: 'default', name: 'Paper', colors: ['#a8501e', '#2a6380'] },
  ];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
};
