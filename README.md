# Web Code Editor

[![npm](https://img.shields.io/badge/npm-%40mjoe92%2Feasy--code--editor-blue)](https://github.com/mjoe92/easy-code-editor/packages)
[![Version](https://img.shields.io/badge/version-1.0.0-brightgreen)](package.json)
[![License](https://img.shields.io/badge/license-Proprietary-red)](#license)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](tsconfig.json)

A lightweight, extensible **Web Component** code editor built on [CodeMirror 6](https://codemirror.net/). Drop a
`<code-editor>`, `<java-editor>`, or `<javascript-editor>` tag anywhere in your HTML — no framework required.

[Playground](https://mjoe92.github.io/easy-code-editor/) for usage.

---

## Features

- **Zero-dependency usage** — plain HTML custom elements, works in any framework or vanilla HTML
- **Shadow DOM encapsulation** — styles are fully isolated, no CSS leakage
- **CodeMirror 6 powered** — line numbers, active line highlight, undo/redo history, Tab indent
- **Language support** — built-in Java and JavaScript/TypeScript language modes
- **Autocomplete** — keyword/type completion driven by JSON label files, fully customizable
- **Syntax highlighting** — configurable via external JSON theme files
- **Read-only mode** — freeze the editor with a single attribute
- **Dynamic content loading** — load initial code, autocomplete definitions, highlight rules, and themes from external
  files via URL attributes
- **Extensible** — subclass `CodeEditor` to add any CodeMirror 6 language in a few lines

---

## Installation

### npm (GitHub Packages)

```bash
npm install @mjoe92/easy-code-editor
```

Add the registry to your `.npmrc`:

```
@mjoe92:registry=https://npm.pkg.github.com/
```

Authentication is required. Add a `~/.npmrc` entry:

```
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

### CDN / UMD (browser, no bundler)

```html

<script src="https://github.com/mjoe92/easy-code-editor/releases/latest/download/easy-code-editor.umd.js"></script>
```

---

## Quick Start

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module" src="./node_modules/@mjoe92/easy-code-editor/dist/artifacts/easy-code-editor.js"></script>
</head>
<body>

<!-- Generic editor (no language mode) -->
<code-editor title="My Editor">
  // type your code here
</code-editor>

<!-- Java editor with built-in language support -->
<java-editor title="Java"></java-editor>

<!-- JavaScript editor -->
<javascript-editor title="JavaScript"></javascript-editor>

</body>
</html>
```

---

## HTML Attributes

All attributes are optional unless noted.

| Attribute           | Element | Description                                                                   |
|---------------------|---------|-------------------------------------------------------------------------------|
| `title`             | all     | Header label shown above the editor                                           |
| `editor-class`      | all     | CSS class applied to the editor container                                     |
| `textSrc`           | all     | URL to a plain text file loaded as the initial editor content                 |
| `autoCompletionSrc` | all     | URL to a JSON `Label` file that extends the built-in autocomplete definitions |
| `highlightSrc`      | all     | URL to a JSON array of `LanguageHighlightStyle` objects for syntax coloring   |
| `themeSrc`          | all     | URL to a JSON CodeMirror theme object                                         |
| `freeze`            | all     | Boolean (presence = true). Makes the editor read-only                         |

### Example: loading content and theme from files

```html

<java-editor
  title="Demo"
  textSrc="./examples/HelloWorld.java"
  themeSrc="./themes/dark.json"
  autoCompletionSrc="./completions/my-api.json"
  freeze>
</java-editor>
```

---

## JavaScript API

After the element is connected to the DOM, two methods are available:

```js
const editor = document.querySelector('java-editor');

// Get the current source code as a string
const code = editor.getValue();

// Replace the entire editor content
editor.setValue('public class Hello { }');
```

---

## Autocomplete JSON Format (`Label`)

Pass a URL to a JSON file matching this shape via `autoCompletionSrc`. The built-in language labels (e.g. Java keywords)
are merged with any additional definitions you provide.

```json
{
  "keyword": [
    "public",
    "private",
    "static",
    "void"
  ],
  "typeName": [
    "String",
    "Integer",
    "List",
    "Map"
  ],
  "class": [
    "MyService",
    "MyRepository"
  ],
  "operator": [
    "instanceof",
    "new"
  ],
  "atom": [
    "true",
    "false",
    "null"
  ]
}
```

All fields are optional arrays of strings.

---

## Highlight JSON Format (`LanguageHighlightStyle[]`)

Pass a URL to a JSON array via `highlightSrc`. Each entry maps
a [Lezer tag](https://lezer.codemirror.net/docs/ref/#highlight) name to CSS properties.

```json
[
  {
    "tag": "keyword",
    "color": "#569cd6",
    "fontWeight": "bold"
  },
  {
    "tag": "typeName",
    "color": "#4ec9b0"
  },
  {
    "tag": "string",
    "color": "#ce9178"
  },
  {
    "tag": "comment",
    "color": "#6a9955",
    "fontStyle": "italic"
  }
]
```

Nested tag functions (e.g. `definition(variableName)`) are supported using string notation:`"definition(variableName)"`.

---

## Extending — Adding a New Language

Subclass `CodeEditor` and pass a CodeMirror `LanguageSupport` instance and an optional label JSON:

```ts
import CodeEditor from '@mjoe92/easy-code-editor';
import {python} from '@codemirror/lang-python';
import labels from './python-labels.json';

export default class PythonEditor extends CodeEditor {
  constructor() {
    super(labels, python());
  }
}

customElements.define('python-editor', PythonEditor);
```

Then use it in HTML:

```html

<python-editor title="Python"></python-editor>
```

---

## Build Scripts

| Script                     | Description                                          |
|----------------------------|------------------------------------------------------|
| `npm run dev`              | Start Vite dev server with hot reload                |
| `npm run build`            | Build the demo app to `dist/`                        |
| `npm run build:artifact`   | Build the distributable library to `dist/artifacts/` |
| `npm run publish:artifact` | Publish the package to GitHub Packages               |
| `npm run publish:page`     | Deploy the demo to GitHub Pages                      |
| `npm run deploy`           | Build + publish artifact + publish page              |

---

## License

Copyright (c) 2026 Jozsef Csurgai. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, modification, or use of this
software, in whole or in part, is strictly prohibited without prior written permission from the author.
