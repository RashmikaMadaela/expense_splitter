import { useEffect, useState } from 'react';
import { applyTheme, getStoredTheme, storeTheme, systemTheme, type Theme } from '../lib/theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme() ?? systemTheme());

  // Until the user makes an explicit choice, track the OS setting live so the
  // icon (and the page, via the CSS media query) stays in sync if it changes.
  useEffect(() => {
    if (getStoredTheme()) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setTheme(mql.matches ? 'dark' : 'light');
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    storeTheme(next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      className="theme-toggle secondary"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
