import { commands, ExtensionContext, window, workspace, extensions, env, Uri, ConfigurationTarget, MessageItem } from "vscode";
import DocumentDecorationManager from "./documentDecorationManager";

export function activate(context: ExtensionContext) {
    const isNativeBracketPairColorizationEnabled = !!workspace.getConfiguration().get<boolean>("editor.bracketPairColorization.enabled");

    const configuration = workspace.getConfiguration("bracket-pair-colorizer-2", undefined);
    let noticeKey = "depreciation-notice";
    var showNotice = configuration.get(noticeKey);
    if (showNotice) {
        const items: MessageItem[] = [{ title: "Learn more" }];
        items.push({ title: "Migrate to native colorization" });
        items.push({ title: "Don't show again" });

        window.showInformationMessage(
            "Bracket Pair Colorizer is no longer being maintained.",
            ...items
        ).then(e => {

            if (e?.title == "Learn more") {
                env.openExternal(Uri.parse('https://github.com/CoenraadS/Bracket-Pair-Colorizer-2#readme'));
            }

            if (e?.title == "Migrate to native colorization") {
                if (!isNativeBracketPairColorizationEnabled) {
                    workspace
                        .getConfiguration()
                        .update(
                            "editor.bracketPairColorization.enabled",
                            true,
                            ConfigurationTarget.Global
                        );
                    workspace
                        .getConfiguration()
                        .update(
                            "editor.guides.bracketPairs",
                            "active",
                            ConfigurationTarget.Global
                        );

                    // Disable extension, only required if `isNativeBracketPairColorizationEnabled` is not true.
                    for (const sub of context.subscriptions) {
                        sub.dispose();
                    }
                    context.subscriptions.length = 0;
                    documentDecorationManager.Dispose();
                }

                commands.executeCommand(
                    "workbench.extensions.uninstallExtension",
                    "CoenraadS.bracket-pair-colorizer-2"
                );
            }

            if (e?.title == "Don't show again") {
                configuration.update(noticeKey, false, true)
            }
        });
    }

    if (isNativeBracketPairColorizationEnabled) {
        // don't do bracket pair colorization if native colorization is already enabled.
        return;
    }

    let documentDecorationManager = new DocumentDecorationManager();

    context.subscriptions.push(
        extensions.onDidChange(() => restart()),
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
