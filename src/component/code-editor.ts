import {Decoration, DecorationSet, EditorView, highlightActiveLineGutter, keymap, lineNumbers} from "@codemirror/view";
import {Annotation, Compartment, EditorState, Extension, StateField, Transaction} from "@codemirror/state";
import {autocompletion, Completion, CompletionContext, CompletionResult} from "@codemirror/autocomplete";
import {HighlightStyle, LanguageSupport, syntaxHighlighting, TagStyle} from "@codemirror/language";
import {tags} from "@lezer/highlight";
import {defaultKeymap, history, historyKeymap, indentWithTab} from "@codemirror/commands";

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
const setProgrammatic = Annotation.define<boolean>();

export default class CodeEditor extends HTMLElement {
  private readonly editorContainer: HTMLDivElement;
  private readonly header: HTMLDivElement;
  private editorView?: EditorView;
  private readonly baseThemeCompartment = new Compartment();
  private readonly dynamicThemeCompartment = new Compartment();
  private readonly frozenLinesCompartment = new Compartment();

  constructor(private labels?: Label, private language?: LanguageSupport) {
    super();

    this.header = document.createElement('div');
    this.header.setAttribute('part', 'header');
    this.header.textContent = this.getAttribute('title');
    this.header.className = 'title';

    this.editorContainer = document.createElement('div');
    this.editorContainer.className = 'code-editor';

    const shadow = this.attachShadow({mode: 'open'});
    shadow.append(this.header, this.editorContainer);
  }

  static get observedAttributes() {
    return ['title', 'editor-class', 'frozenLines'];
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
      case "frozenLines":
        if (oldValue !== newValue) {
          this.applyFrozenLines();
        }
        return;
    }
  }

  public getValue(): string {
    return this.editorView?.state.doc.toString() ?? '';
  }

  public setValue(value: string): void {
    if (!this.editorView) {
      return;
    }

    this.editorView.dispatch({
      changes: {
        from: 0,
        to: this.editorView.state.doc.length,
        insert: value
      },
      annotations: [setProgrammatic.of(true)]
    });
  }

  public setEditorClass(className: string | null): void {
    if (!className || className.trim() === '') {
      this.editorContainer.className = 'code-editor';
      return;
    }

    this.editorContainer.className = className;
  }

  public async updateThemeFrom(url: string | null, dark = false): Promise<void> {
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
    const themeExtension = this.createTheme(themeJson, dark) ?? [];

    this.editorView.dispatch({
      effects: this.dynamicThemeCompartment.reconfigure(themeExtension)
    });
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
    ]).then(contents => {
      this.createEditor(contents);
      this.dispatchEvent(new CustomEvent('editor-ready', {bubbles: true, composed: true}));
    });
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

  private applyFrozenLines(): void {
    if (!this.editorView) {
      return;
    }

    const frozenLineNumbers = this.parseFrozenLines();
    const doc = this.editorView.state.doc;
    const ext = frozenLineNumbers.length > 0
      ? this.freezeLines(frozenLineNumbers, doc.toString())
      : [];

    this.editorView.dispatch({
      effects: this.frozenLinesCompartment.reconfigure(ext)
    });
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
      this.frozenLinesCompartment.of([]),
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          this.dispatchEvent(new Event('change', {bubbles: true, composed: true}));
        }
      }),
    ];

    if (this.language) {
      extensions.push(this.language);
    }

    this.addExtension(extensions, contents[1], this.createAutoCompletion);
    this.addExtension(extensions, contents[2], this.createHighlight);
    this.addExtension(extensions, this.hasAttribute("freeze"), this.freezeEditor);

    const initContent = this.createContent(contents[0]);

    this.editorView = new EditorView({
      state: EditorState.create({
        doc: initContent,
        extensions: extensions,
      }),
      parent: this.editorContainer,
    });

    this.applyFrozenLines();
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

  private createTheme(theme?: string, dark = false) {
    if (!theme) {
      return;
    }

    return EditorView.theme(JSON.parse(theme), {dark});
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
    const initDoc = EditorState.create({doc: initContent}).doc;
    const initRanges: FrozenRange[] = [];

    for (const lineNumber of frozenLineNumbers) {
      if (lineNumber >= 1 && lineNumber <= initDoc.lines) {
        const line = initDoc.line(lineNumber);
        initRanges.push({
          from: line.from,
          to: line.to,
          lineFrom: line.from,
        });
      }
    }

    // Tracks the current character positions of every frozen line.
    // mapPos shifts them correctly whenever lines are inserted or removed.
    const frozenRangesField = StateField.define<FrozenRange[]>({
      create: () => initRanges,
      update(ranges, tr) {
        if (!tr.docChanged) return ranges;
        return ranges.map(({from, to, lineFrom}) => ({
          from: tr.changes.mapPos(from, -1),
          to: tr.changes.mapPos(to, 1),
          lineFrom: tr.changes.mapPos(lineFrom, -1),
        }));
      },
    });

    const decorationField = StateField.define<DecorationSet>({
      create(state) {
        const ranges = state.field(frozenRangesField);
        return Decoration.set(
          ranges.map(r => Decoration.line({class: FROZEN_LINE_CLASS}).range(r.lineFrom))
        );
      },
      update(deco, tr) {
        if (!tr.docChanged) return deco;
        const ranges = tr.state.field(frozenRangesField);
        return Decoration.set(
          ranges.map(r => Decoration.line({class: FROZEN_LINE_CLASS}).range(r.lineFrom))
        );
      },
      provide: f => EditorView.decorations.from(f),
    });

    // The filter reads live positions from frozenRangesField on tr.startState
    // so protection always follows the actual frozen content, even after
    // lines are inserted or removed above them.
    const filter = EditorState.transactionFilter.of((tr: Transaction) => {
      if (!tr.docChanged) return tr;
      if (tr.annotation(setProgrammatic)) return tr;

      const frozenRanges = tr.startState.field(frozenRangesField);

      let blocked = false;
      tr.changes.iterChangedRanges((fromA, toA) => {
        if (blocked) return;
        for (const range of frozenRanges) {
          if (fromA <= range.to && toA >= range.from) {
            blocked = true;
            break;
          }
        }
      });

      return blocked ? [] : tr;
    });

    return [frozenRangesField, decorationField, filter];
  }
}
