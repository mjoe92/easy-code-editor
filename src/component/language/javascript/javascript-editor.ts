import CodeEditor from "../../code-editor";

import {javascript} from "@codemirror/lang-javascript";
import labels from "./javascript-label.json";

export default class JavascriptEditor extends CodeEditor {

  constructor() {
    super(labels, javascript());
  }
}
