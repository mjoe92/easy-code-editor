export function applyEditorThemes() {
  const isDark = document.body.getAttribute('data-theme') === 'dark';

  let editors = document.querySelectorAll('code-editor, java-editor, javascript-editor');
  for (const editor of editors) {
    const textSrc = editor.getAttribute('textSrc');
    const isConstantThemeExample = textSrc === '7-theme/right.js';
    if (isConstantThemeExample) {
      continue;
    }

    const path = isDark ? 'dark-theme.json' : null;
    editor.updateThemeFrom && editor.updateThemeFrom(path);
  }
}