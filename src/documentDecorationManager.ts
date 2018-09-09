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
        this.settings.dispose();
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
        // console.log("updateDocument");
        const documentDecoration = this.getDocumentDecorations(document);
        if (documentDecoration) {
            documentDecoration.tokenizeDocument();
        }
    }

    public onDidOpenTextDocument(document: TextDocument) {
        // console.log("onDidOpenTextDocument");
        const documentDecoration = this.getDocumentDecorations(document);
        if (documentDecoration) {
            documentDecoration.tokenizeDocument();
        }
    }

    public onDidChangeTextDocument(event: TextDocumentChangeEvent) {
        // console.log("onDidChangeTextDocument");
        const documentDecoration = this.getDocumentDecorations(event.document);
        if (documentDecoration) {
            documentDecoration.onDidChangeTextDocument(event.contentChanges);
        }
    }

    public onDidCloseTextDocument(closedDocument: TextDocument) {
        // console.log("onDidCloseTextDocument");
        const uri = closedDocument.uri.toString();
        const document = this.documents.get(uri);
        if (document !== undefined) {
            // console.log("Disposing " + uri);
            document.dispose();
            this.documents.delete(uri);
        }
    }

    public onDidChangeSelection(event: TextEditorSelectionChangeEvent) {
        // console.log("onDidChangeSelection");
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
        // console.log("updateAllDocuments");
        window.visibleTextEditors.forEach((editor) => {
            this.updateDocument(editor.document);
        });
    }

    private getDocumentDecorations(document: TextDocument): DocumentDecoration | undefined {
        if (!this.isValidDocument(document)) {
            return;
        }

        const uri = document.uri.toString();
        // console.log("Looking for " + uri + " from cache");
        let documentDecorations = this.documents.get(uri);

        if (documentDecorations === undefined) {
            try {
                const tokenizer = this.tryGetTokenizer(document.languageId);
                if (!tokenizer) {
                    // console.log("Could not find tokenizer for " + uri);
                    return;
                }

                if (tokenizer instanceof Promise) {
                    // console.log("Found Tokenizer promise for " + uri);
                    tokenizer.then(() => {
                        this.updateDocument(document);
                    }).catch((e) => console.error(e));
                    return;
                }

                // console.log("Found Tokenizer for " + uri);

                documentDecorations = new DocumentDecoration(document, tokenizer as IGrammar, this.settings);
                // console.log("Adding " + uri + " to cache");
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

        // console.log("Retrieved " + uri + " from cache");
        return documentDecorations;
    }

    private tryGetTokenizer(languageID: string) {
        return this.textMateLoader.tryGetTokenizer(languageID);
    }

    private isValidDocument(document?: TextDocument): boolean {
        if (document === undefined) {
            console.warn("Ignoring undefined document");
            return false;
        }

        if (document.lineCount === 0) {
            console.warn("Ignoring document with 0 line counter");
            return false;
        }

        if (document.uri.scheme === "vscode") {
            // console.log("Ignoring document with 'vscode' uri");
            return false;
        }

        if (this.settings.excludedLanguages.has(document.languageId)) {
            // console.log("Ignoring document because language id was ignored in settings");
            return false;
        }

        return true;
    }
}
