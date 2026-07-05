let darkThemeCache = null;

async function loadDarkTheme() {
  if (darkThemeCache !== null) {
    return darkThemeCache;
  }
  const response = await fetch('dark-theme.json');
  darkThemeCache = await response.text();
  return darkThemeCache;
}

export async function applyEditorTheme(editor) {
  const isDark = document.body.getAttribute('data-theme') === 'dark';

  const textSrc = editor.getAttribute('textSrc');
  if (textSrc === '7-theme/right.js') {
    return;
  }

  if (typeof editor.setEditorClass === 'function') {
    editor.setEditorClass(isDark ? 'code-editor contrast' : 'code-editor');
  }

  if (typeof editor.updateThemeFrom === 'function') {
    if (isDark) {
      // ensure dark theme is cached before applying
      await loadDarkTheme();
      editor.updateThemeFrom('dark-theme.json');
    } else {
      editor.updateThemeFrom(null);
    }
  }
}

export async function applyEditorThemes() {
  const editors = document.querySelectorAll('code-editor, java-editor, javascript-editor');
  // pre-fetch once so all editors get it from cache
  const isDark = document.body.getAttribute('data-theme') === 'dark';
  if (isDark) {
    await loadDarkTheme();
  }
  for (const editor of editors) {
    applyEditorTheme(editor);
  }
}
