import { IGrammar, IExtensionPackage } from "./IExtensionGrammar";

import * as path from "path";
import * as vscode from "vscode";
import fs = require("fs");

export class TextMateLoader {
    private readonly grammarPaths: Map<string, { scopeName: string; path: string; }>;
    private readonly vsctm: any;
    private readonly textMateRegistry = new Map<string, IGrammar>();
    constructor() {
        this.grammarPaths = this.getGrammarPaths();
        this.vsctm = this.loadTextMate();
    }

    public tryGetTokenizer(languageID: string) {
        const existingTokenizer = this.textMateRegistry.get(languageID);
        if (existingTokenizer) {
            return existingTokenizer;
        }

        const paths = this.grammarPaths.get(languageID);

        if (!paths) {
            return;
        }

        const registry = new this.vsctm.Registry({
            // tslint:disable-next-line:object-literal-shorthand
            loadGrammar: (scopeName: string) => {
                const path = paths.path;
                return new Promise((resolve, reject) => {
                    fs.readFile(path, (error, content) => {
                        if (error) {
                            reject(error);
                        } else {
                            const text = content.toString();
                            const rawGrammar = this.vsctm.parseRawGrammar(text, path);
                            resolve(rawGrammar);
                        }
                    });
                });
            },
        });

        // Load the JavaScript grammar and any other grammars included by it async.
        return (registry.loadGrammar(paths.scopeName) as Thenable<IGrammar | undefined | null>).then((grammar) => {
            if (grammar) {
                this.textMateRegistry.set(languageID, grammar);
            }
            return grammar;
        });
    }

    private getNodeModule(moduleName: string) {
        return require(`${vscode.env.appRoot}/node_modules.asar/${moduleName}`);
    }

    private loadTextMate(): any {
        return this.getNodeModule("vscode-textmate");
    }

    private getGrammarPaths() {
        const dict = new Map<string, { scopeName: string, path: string }>();
        vscode.extensions.all.forEach((extension) => {
            const packageJSON = extension.packageJSON as IExtensionPackage;
            if (packageJSON.contributes && packageJSON.contributes.grammars) {
                packageJSON.contributes.grammars.forEach((grammar) => {
                    if (grammar.language && grammar.scopeName && grammar.path) {
                        const fullPath = path.join(extension.extensionPath, grammar.path);
                        dict.set(grammar.language, { scopeName: grammar.scopeName, path: fullPath });
                    }
                });
            }
        });

        return dict;
    }
}

export default TextMateLoader;