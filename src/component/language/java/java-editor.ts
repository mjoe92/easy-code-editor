import CodeEditor from "../../code-editor";

import {java} from "@codemirror/lang-java";
import labels from "./java-label.json";

export default class JavaEditor extends CodeEditor {

  constructor() {
    super(labels, java());
  }
}