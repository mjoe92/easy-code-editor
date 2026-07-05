const prefersDark = window.matchMedia &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

const currentTheme = prefersDark ? 'dark' : 'light';

document.body.setAttribute('data-theme', currentTheme);

import { applyEditorTheme, applyEditorThemes } from './theme-applier.js';

document.addEventListener('editor-ready', (event) => {
  applyEditorTheme(event.target);
});

// Also apply to any editors that already fired editor-ready before this listener was attached
window.addEventListener('load', () => {
  applyEditorThemes();
});

document.getElementById('contrast-switcher')?.addEventListener('click', () => {
  const nextTheme = document.body.getAttribute('data-theme') === 'dark' ? '' : 'dark';
  document.body.setAttribute('data-theme', nextTheme);
  applyEditorThemes();
});
