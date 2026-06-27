import {EditorView, highlightActiveLineGutter, keymap, lineNumbers, Decoration, DecorationSet} from "@codemirror/view";
import {EditorState, Extension, Compartment, Transaction, StateField} from "@codemirror/state";
import {autocompletion, Completion, CompletionContext, CompletionResult} from "@codemirror/autocomplete";
import {HighlightStyle, LanguageSupport, syntaxHighlighting, TagStyle} from "@codemirror/language";
import {tags} from "@lezer/highlight";
import {history, defaultKeymap, historyKeymap, indentWithTab} from "@codemirror/commands";

export interface Label {
  class?: string[],
  keyword?: string[],
  typeName?: string[],
  operator?: string[],
  atom?: string[],
  punctuation?: string[]
}

export interface LanguageHighlightStyle {
  tag: string,
  [key: string]: any
}

interface FrozenRange {
  from: number;
  to: number;
  lineFrom: number;
}

const FROZEN_LINE_CLASS = 'cm-frozen-line';

export default class CodeEditor extends HTMLElement {
  private readonly editorContainer: HTMLDivElement;
  private readonly header: HTMLDivElement;
  private editorView?: EditorView;
  private readonly baseThemeCompartment = new Compartment();
  private readonly dynamicThemeCompartment = new Compartment();

  static get observedAttributes() {
    return ['title', 'editor-class'];
  }

  constructor(private labels?: Label, private language?: LanguageSupport) {
    super();

    this.header = document.createElement('div');
    this.header.setAttribute('part', 'header');
    this.header.textContent = this.getAttribute('title');
    this.header.className = 'title';

    this.editorContainer = document.createElement('div');
    this.editorContainer.className = 'code-editor';

    const shadow = this.attachShadow({ mode: 'open' });
    shadow.append(this.header, this.editorContainer);
  }

  connectedCallback(): void {
    this.initEditor();
  }

  disconnectedCallback(): void {
    if (this.editorView) {
      this.editorView.destroy();
    }
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    switch (name) {
      case "title":
        this.header.textContent = newValue;
        return;
      case "editor-class":
        this.initEditor();
        return;
    }
  }

  public getValue(): string {
    return this.editorView?.state.doc.toString() ?? '';
  }

  public setValue(value: string): void {
    if (!this.editorView) {
      this.textContent = value;
      return;
    }

    this.editorView.dispatch({
      changes: {
        from: 0,
        to: this.editorView.state.doc.length,
        insert: value
      }
    });
  }

  public setEditorClass(className: string | null): void {
    if (!className || className.trim() === '') {
      this.editorContainer.className = 'code-editor';
      return;
    }

    this.editorContainer.className = className;
  }

  private initEditor(): void {
    if (this.editorView) {
      return;
    }

    Promise.all([
      this.readFile("textSrc"),
      this.readFile("autoCompletionSrc"),
      this.readFile("highlightSrc"),
      this.readFile("themeSrc")
    ]).then(contents => this.createEditor(contents));
  }

  private readFile = async (fileSourceAttribute: string) => {
    let url = this.getAttribute(fileSourceAttribute);
    if (!url) {
      return;
    }

    const content = await fetch(url);
    const ct = content.headers.get("content-type");
    if (ct?.includes("html")) {
      throw new ReferenceError(`Wrong reference or corrupt content on attribute "${fileSourceAttribute}" while reading the file: ${url}`);
    }

    return await content.text();
  };

  private parseFrozenLines(): number[] {
    const attr = this.getAttribute('frozenLines');
    if (!attr) {
      return [];
    }

    return attr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);
  }

  private createEditor(contents: (string | undefined)[]) {
    const baseThemeExtension = this.createTheme(contents[3]);

    const extensions: Extension[] = [
      lineNumbers(),
      highlightActiveLineGutter(),
      history(),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        indentWithTab
      ]),
      this.baseThemeCompartment.of(baseThemeExtension ?? []),
      this.dynamicThemeCompartment.of([]),
    ];

    if (this.language) {
      extensions.push(this.language);
    }

    this.addExtension(extensions, contents[1], this.createAutoCompletion);
    this.addExtension(extensions, contents[2], this.createHighlight);
    this.addExtension(extensions, this.hasAttribute("freeze"), this.freezeEditor);

    const frozenLineNumbers = this.parseFrozenLines();
    const initContent = this.createContent(contents[0]);

    if (frozenLineNumbers.length > 0) {
      const freezeLinesExt = this.freezeLines(frozenLineNumbers, initContent);
      extensions.push(freezeLinesExt);
    }

    this.editorView = new EditorView({
      state: EditorState.create({
        doc: initContent,
        extensions: extensions,
      }),
      parent: this.editorContainer,
    });
  }

  public async updateThemeFrom(url: string | null): Promise<void> {
    if (!this.editorView) {
      return;
    }

    if (!url) {
      this.editorView.dispatch({
        effects: this.dynamicThemeCompartment.reconfigure([])
      });
      return;
    }

    const content = await fetch(url);
    const ct = content.headers.get("content-type");
    if (ct?.includes("html")) {
      throw new ReferenceError(`Wrong theme reference or corrupt content while reading the file: ${url}`);
    }

    const themeJson = await content.text();
    const themeExtension = this.createTheme(themeJson) ?? [];

    this.editorView.dispatch({
      effects: this.dynamicThemeCompartment.reconfigure(themeExtension)
    });
  }

  private createAutoCompletion(completeDefinition?: string): Extension {
    const convertedCompleteDefinition: Label = completeDefinition ? JSON.parse(completeDefinition) : this.labels;

    let completionDefinition = this.labels ? this.definitionComplete(this.labels) : [];
    if (convertedCompleteDefinition) {
      const definition = this.definitionComplete(convertedCompleteDefinition);
      completionDefinition = completionDefinition.concat(definition);
    }

    return autocompletion({
      override: [context => this.autoComplete(context, completionDefinition)],
    });
  }

  private definitionComplete = (label: Label) => Object.entries(label)
    .flatMap(([type, labels]) => labels.map((label: string) => ({label, type})));

  private createHighlight(highlightStyles?: string): Extension | undefined {
    if (!highlightStyles) {
      return;
    }

    const styles: LanguageHighlightStyle[] = JSON.parse(highlightStyles);
    const mappedStyles: TagStyle[] = styles.map(({tag, ...style}) => ({
      tag: this.resolveTag(tag),
      ...style
    }));

    return syntaxHighlighting(HighlightStyle.define(mappedStyles));
  }

  private resolveTag(tagString: string): any {
    const nested = tagString.match(/^(\w+)\((.+)\)$/);
    if (nested) {
      const outer = nested[1];
      const inner = nested[2];
      return (tags as any)[outer](this.resolveTag(inner));
    }
    return (tags as any)[tagString];
  }

  private createTheme(theme?: string) {
    if (!theme) {
      return;
    }

    return EditorView.theme(JSON.parse(theme));
  }

  private async autoComplete(context: CompletionContext, autoCompletionOptions: Completion[]): Promise<CompletionResult> {
    const before = context.matchBefore(/\w+/);
    return {
      from: before ? before.from : context.pos,
      options: autoCompletionOptions,
      validFor: /^\w*$/,
    };
  }

  private addExtension<T>(extensions: Extension[], contentElement: T | undefined,
                          extensionFunction: (completeDefinition: T | undefined) => Extension | undefined) {
    const apply = extensionFunction.call(this, contentElement);
    if (apply) {
      extensions.push(apply);
    }
  }

  private createContent(content?: string): string {
    if (!content) {
      content = this.innerHTML;
      this.innerHTML = "";
    }

    return content;
  }

  private freezeEditor(freeze?: boolean) {
    return EditorView.editable.of(!freeze);
  }

  private freezeLines(frozenLineNumbers: number[], initContent: string): Extension {
    const initDoc = EditorState.create({ doc: initContent }).doc;
    const initRanges: FrozenRange[] = [];

    for (let lineNumber of frozenLineNumbers) {
      if (lineNumber >= 1 && lineNumber <= initDoc.lines) {
        const line = initDoc.line(lineNumber);

        initRanges.push({
          from:     line.from,
          to:       line.to,
          lineFrom: line.from,
        });
      }
    }

    const frozenRangesField = StateField.define<FrozenRange[]>({
      create: () => initRanges,
      update(ranges, tr) {
        if (!tr.docChanged) {
          return ranges;
        }

        return ranges.map(({ from, to, lineFrom }) => ({
          from:     tr.changes.mapPos(from,     -1),
          to:       tr.changes.mapPos(to,        1),
          lineFrom: tr.changes.mapPos(lineFrom, -1),
        }));
      },
    });

    const decorationField = StateField.define<DecorationSet>({
      create(state) {
        const ranges = state.field(frozenRangesField);

        return Decoration.set(
          ranges.map(r => Decoration.line({ class: FROZEN_LINE_CLASS }).range(r.lineFrom))
        );
      },
      update(deco, tr) {
        if (!tr.docChanged) {
          return deco;
        }

        const ranges = tr.state.field(frozenRangesField);

        return Decoration.set(
          ranges.map(r => Decoration.line({ class: FROZEN_LINE_CLASS }).range(r.lineFrom))
        );
      },
      provide: f => EditorView.decorations.from(f),
    });

    const filter = EditorState.transactionFilter.of((tr: Transaction) => {
      if (!tr.docChanged) {
        return tr;
      }

      const frozenRanges = tr.startState.field(frozenRangesField);
      let blocked = false;

      tr.changes.iterChangedRanges((fromA, toA) => {
        if (blocked) {
          return;
        }

        for (const range of frozenRanges) {
          const extendedFrom = range.from - 1;
          const extendedTo   = range.to + 1;

          const overlapsExtended = fromA < extendedTo && toA > extendedFrom;

          if (overlapsExtended) {
            blocked = true;
            break;
          }
        }
      });

      if (blocked) {
        return [];
      }

      return tr;
    });

    return [frozenRangesField, decorationField, filter];
  }
}
