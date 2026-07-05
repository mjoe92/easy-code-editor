import { defineComponent, h, onMounted, onUnmounted, ref, watch, PropType } from 'vue';
import '../../../main';

type EditorElement = HTMLElement & {
  getValue(): string;
  setValue(value: string): void;
};

function createWrapper(tagName: string, displayName: string) {
  return defineComponent({
    name: displayName,
    props: {
      modelValue: { type: String as PropType<string>, default: '' },
      title: { type: String as PropType<string>, default: '' },
      freeze: { type: Boolean as PropType<boolean>, default: false },
      editorClass: { type: String as PropType<string>, default: undefined },
      textSrc: { type: String as PropType<string>, default: undefined },
      autoCompletionSrc: { type: String as PropType<string>, default: undefined },
      highlightSrc: { type: String as PropType<string>, default: undefined },
      themeSrc: { type: String as PropType<string>, default: undefined },
      frozenLines: { type: Array as PropType<number[]>, default: () => [] },
    },
    emits: ['update:modelValue'],
    setup(props, { emit, expose }) {
      const elRef = ref<EditorElement | null>(null);

      // Sync modelValue -> editor
      watch(
        () => props.modelValue,
        (val) => {
          if (elRef.value && elRef.value.getValue() !== val) {
            elRef.value.setValue(val);
          }
        }
      );

      // Wire native change event -> emit update:modelValue
      const changeHandler = () => {
        if (elRef.value) emit('update:modelValue', elRef.value.getValue());
      };

      onMounted(() => {
        if (elRef.value) {
          if (props.modelValue) elRef.value.setValue(props.modelValue);
          elRef.value.addEventListener('change', changeHandler);
        }
      });

      onUnmounted(() => {
        elRef.value?.removeEventListener('change', changeHandler);
      });

      expose({
        getValue: () => elRef.value?.getValue() ?? '',
        setValue: (v: string) => elRef.value?.setValue(v),
      });

      return () =>
        h(tagName, {
          ref: elRef,
          title: props.title,
          freeze: props.freeze ? '' : undefined,
          'editor-class': props.editorClass,
          textSrc: props.textSrc,
          autoCompletionSrc: props.autoCompletionSrc,
          highlightSrc: props.highlightSrc,
          themeSrc: props.themeSrc,
          frozenLines: props.frozenLines && props.frozenLines.length > 0 ? props.frozenLines.join(',') : undefined,
        });
    },
  });
}

export const CodeEditor = createWrapper('code-editor', 'CodeEditor');
export const JavaEditor = createWrapper('java-editor', 'JavaEditor');
export const JavaScriptEditor = createWrapper('javascript-editor', 'JavaScriptEditor');
