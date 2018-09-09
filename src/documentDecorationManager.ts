import {
    TextDocument, TextDocumentChangeEvent,
    TextEditor, TextEditorSelectionChangeEvent, window,
} from "vscode";
import DocumentDecoration from "./documentDecoration";
import { IGrammar } from "./IExtensionGrammar";
import Settings from "./settings";
import { TextMateLoader } from "./textMateLoader";

export default class DocumentDecorationManager {
    private showError = true;
    private readonly documents = new Map<string, DocumentDecoration>();
    private readonly textMateLoader = new TextMateLoader();
    private readonly settings = new Settings();

    public Dispose() {
        this.documents.forEach((document, key) => {
            document.dispose();
        });
    }

    public expandBracketSelection(editor: TextEditor) {
        const documentDecoration = this.getDocumentDecorations(editor.document);
        if (documentDecoration) {
            documentDecoration.expandBracketSelection(editor);
        }
    }

    public undoBracketSelection(editor: TextEditor) {
        const documentDecoration = this.getDocumentDecorations(editor.document);
        if (documentDecoration) {
            documentDecoration.undoBracketSelection(editor);
        }
    }

    public updateDocument(document: TextDocument) {
        const documentDecoration = this.getDocumentDecorations(document);
        if (documentDecoration) {
            documentDecoration.tokenizeDocument();
        }
    }

    public onDidOpenTextDocument(document: TextDocument) {
        const documentDecoration = this.getDocumentDecorations(document);
        if (documentDecoration) {
            documentDecoration.tokenizeDocument();
        }
    }

    public onDidChangeTextDocument(event: TextDocumentChangeEvent) {
        const documentDecoration = this.getDocumentDecorations(event.document);
        if (documentDecoration) {
            documentDecoration.onDidChangeTextDocument(event.contentChanges);
        }
    }

    public onDidCloseTextDocument(closedDocument: TextDocument) {
        const uri = closedDocument.uri.toString();
        const document = this.documents.get(uri);
        if (document !== undefined) {
            document.dispose();
            this.documents.delete(closedDocument.uri.toString());
        }
    }

    public onDidChangeSelection(event: TextEditorSelectionChangeEvent) {
        const documentDecoration = this.getDocumentDecorations(event.textEditor.document);
        if (documentDecoration &&
            (documentDecoration.settings.highlightActiveScope ||
                documentDecoration.settings.showBracketsInGutter ||
                documentDecoration.settings.showVerticalScopeLine ||
                documentDecoration.settings.showHorizontalScopeLine)) {
            documentDecoration.updateScopeDecorations(event);
        }
    }

    public updateAllDocuments() {
        window.visibleTextEditors.forEach((editor) => {
            this.updateDocument(editor.document);
        });
    }

    private getDocumentDecorations(document: TextDocument): DocumentDecoration | undefined {
        if (!this.isValidDocument(document)) {
            return;
        }

        const uri = document.uri.toString();
        let documentDecorations = this.documents.get(uri);

        if (documentDecorations === undefined) {
            try {
                const tokenizer = this.tryGetTokenizer(document.languageId);
                if (!tokenizer) {
                    return;
                }

                if (tokenizer instanceof Promise) {
                    tokenizer.then(() => {
                        this.updateAllDocuments();
                    }).catch((e) => console.error(e));
                    return;
                }

                documentDecorations = new DocumentDecoration(document, tokenizer as IGrammar, this.settings);
                this.documents.set(uri, documentDecorations);
            } catch (error) {
                if (error instanceof Error) {
                    if (this.showError) {
                        window.showErrorMessage("BracketPair Settings: " + error.message);

                        // Don't spam errors
                        this.showError = false;
                        setTimeout(() => {
                            this.showError = true;
                        }, 3000);
                    }
                }
            }
        }

        return documentDecorations;
    }

    private tryGetTokenizer(languageID: string) {
        return this.textMateLoader.tryGetTokenizer(languageID);
    }

    private isValidDocument(document?: TextDocument): boolean {
        if (document === undefined || document.lineCount === 0 || document.uri.scheme === "vscode") {
            return false;
        }

        return true;
    }
}
