import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import '../../../main';

export interface CodeEditorHandle {
  getValue(): string;
  setValue(value: string): void;
  updateThemeFrom?(url: string | null, dark?: boolean): void;
  setEditorClass?(className: string | null): void;
}

interface CodeEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  title?: string;
  freeze?: boolean;
  frozenLines?: number[];
  className?: string;
  style?: React.CSSProperties;
  textSrc?: string;
  autoCompletionSrc?: string;
  highlightSrc?: string;
  themeSrc?: string;
}

type EditorElement = HTMLElement & CodeEditorHandle;

function createWrapper(tagName: string) {
  return forwardRef<CodeEditorHandle, CodeEditorProps>(function EditorWrapper(
    { value, onChange, title, freeze, frozenLines, className, style, textSrc, autoCompletionSrc, highlightSrc, themeSrc },
    ref
  ) {
    const innerRef = useRef<EditorElement>(null);

    useImperativeHandle(ref, () => ({
      getValue: () => innerRef.current?.getValue() ?? '',
      setValue: (v: string) => innerRef.current?.setValue(v),
      updateThemeFrom: (url: string | null, dark?: boolean) => innerRef.current?.updateThemeFrom?.(url, dark),
      setEditorClass: (className: string | null) => innerRef.current?.setEditorClass?.(className),
    }));

    // Set initial value once after mount
    useEffect(() => {
      if (innerRef.current && value !== undefined) {
        innerRef.current.setValue(value);
      }
    }, []);

    // Handle subsequent value changes
    useEffect(() => {
      if (innerRef.current && value !== undefined) {
        const current = innerRef.current.getValue();
        if (current !== value) {
          innerRef.current.setValue(value);
        }
      }
    }, [value]);

    useEffect(() => {
      const el = innerRef.current;
      if (!el || !onChange) return;
      const handler = () => onChange(el.getValue());
      el.addEventListener('change', handler);
      return () => el.removeEventListener('change', handler);
    }, [onChange]);

    // Ensure frozenLines attribute is applied after the editor is ready
    useEffect(() => {
      const el = innerRef.current as HTMLElement | null;
      if (!el || !frozenLines || frozenLines.length === 0) return;

      const handler = () => {
        el.setAttribute('frozenLines', frozenLines.join(','));
      };

      el.addEventListener('editor-ready', handler);
      return () => el.removeEventListener('editor-ready', handler);
    }, [frozenLines]);

    return React.createElement(tagName, {
      ref: innerRef,
      title,
      freeze: freeze ? '' : undefined,
      frozenLines: frozenLines && frozenLines.length > 0 ? frozenLines.join(',') : undefined,
      class: className,
      style,
      textSrc,
      autoCompletionSrc,
      highlightSrc,
      themeSrc,
    });
  });
}

export const CodeEditor = createWrapper('code-editor');
export const JavaEditor = createWrapper('java-editor');
export const JavaScriptEditor = createWrapper('javascript-editor');

CodeEditor.displayName = 'CodeEditor';
JavaEditor.displayName = 'JavaEditor';
JavaScriptEditor.displayName = 'JavaScriptEditor';
