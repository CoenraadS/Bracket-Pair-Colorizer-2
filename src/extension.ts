import { commands, ExtensionContext, window, workspace } from "vscode";
import DocumentDecorationManager from "./documentDecorationManager";
export function activate(context: ExtensionContext) {
    let documentDecorationManager = new DocumentDecorationManager();

    context.subscriptions.push(
        commands.registerCommand("bracket-pair-colorizer.expandBracketSelection", () => {
            const editor = window.activeTextEditor;
            if (!editor) { return; }
            documentDecorationManager.expandBracketSelection(editor);
        }),

        commands.registerCommand("bracket-pair-colorizer.undoBracketSelection", () => {
            const editor = window.activeTextEditor;
            if (!editor) { return; }
            documentDecorationManager.undoBracketSelection(editor);
        }),

        workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration("bracketPairColorizer") ||
                event.affectsConfiguration("editor.lineHeight") ||
                event.affectsConfiguration("editor.fontSize")

            ) {
                documentDecorationManager.Dispose();
                documentDecorationManager = new DocumentDecorationManager();
                documentDecorationManager.updateAllDocuments();
            }
        }),

        window.onDidChangeVisibleTextEditors(() => {
            documentDecorationManager.updateAllDocuments();
        }),
        workspace.onDidChangeTextDocument((event) => {
            if (event.contentChanges.length > 0) {
                documentDecorationManager.onDidChangeTextDocument(event);
            }
        }),
        workspace.onDidCloseTextDocument((event) => {
            documentDecorationManager.onDidCloseTextDocument(event);
        }),
        workspace.onDidOpenTextDocument((event) => {
            documentDecorationManager.onDidOpenTextDocument(event);
        }),
        window.onDidChangeTextEditorSelection((event) => {
            documentDecorationManager.onDidChangeSelection(event);
        }),
    );

    documentDecorationManager.updateAllDocuments();
}

// tslint:disable-next-line:no-empty
export function deactivate() {
}
