import JavaEditor from "./component/language/java/java-editor";
import JavascriptEditor from "./component/language/javascript/javascript-editor";
import CodeEditor from "./component/code-editor";

customElements.define("code-editor", CodeEditor);
customElements.define("java-editor", JavaEditor);
customElements.define("javascript-editor", JavascriptEditor);