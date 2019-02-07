import { commands, ExtensionContext, window, workspace, extensions } from "vscode";
import DocumentDecorationManager from "./documentDecorationManager";
export function activate(context: ExtensionContext) {
    let documentDecorationManager = new DocumentDecorationManager();

    extensions.onDidChange(() => restart());
    
    context.subscriptions.push(
        commands.registerCommand("bracket-pair-colorizer-2.expandBracketSelection", () => {
            const editor = window.activeTextEditor;
            if (!editor) { return; }
            documentDecorationManager.expandBracketSelection(editor);
        }),

        commands.registerCommand("bracket-pair-colorizer-2.undoBracketSelection", () => {
            const editor = window.activeTextEditor;
            if (!editor) { return; }
            documentDecorationManager.undoBracketSelection(editor);
        }),

        workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration("bracket-pair-colorizer-2") ||
                event.affectsConfiguration("editor.lineHeight") ||
                event.affectsConfiguration("editor.fontSize")

            ) {
                restart();
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

    function restart() {
        documentDecorationManager.Dispose();
        documentDecorationManager = new DocumentDecorationManager();
        documentDecorationManager.updateAllDocuments();
    }
}

// tslint:disable-next-line:no-empty
export function deactivate() {
}
