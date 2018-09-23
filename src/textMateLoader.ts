import { IExtensionPackage, IGrammar } from "./IExtensionGrammar";

import * as path from "path";
import * as vscode from "vscode";
import fs = require("fs");

export class TextMateLoader {
    public readonly scopeNameToLanguage = new Map<string, string>();
    private readonly scopeNameToPath = new Map<string, string>();
    private readonly languageToScopeName = new Map<string, string>();
    private languageId = 0;
    private readonly vsctm: any;
    private readonly textMateRegistry = new Map<string, IGrammar>();
    constructor() {
        this.initializeGrammars();
        this.vsctm = this.loadTextMate();
    }

    public tryGetTokenizer(languageID: string) {
        const existingTokenizer = this.textMateRegistry.get(languageID);
        if (existingTokenizer) {
            return existingTokenizer;
        }

        const scopeName = this.languageToScopeName.get(languageID);

        if (!scopeName) {
            return;
        }

        const registry = new this.vsctm.Registry({
            // tslint:disable-next-line:object-literal-shorthand
            loadGrammar: (scopeName: string) => {
                const path = this.scopeNameToPath.get(scopeName);
                if (!path) {
                    return null;
                }

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
        return (registry.loadGrammarWithConfiguration(scopeName, this.languageId++, {}) as Thenable<IGrammar | undefined | null>).then((grammar) => {
            if (grammar) {
                if (!this.textMateRegistry.has(languageID)) {
                    this.textMateRegistry.set(languageID, grammar);
                }
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

    private initializeGrammars() {
        for (const extension of vscode.extensions.all) {
            const packageJSON = extension.packageJSON as IExtensionPackage;
            if (packageJSON.contributes && packageJSON.contributes.grammars) {
                packageJSON.contributes.grammars.forEach((grammar) => {
                    if (grammar.language && grammar.scopeName && grammar.path) {
                        const fullPath = path.join(extension.extensionPath, grammar.path);
                        this.languageToScopeName.set(grammar.language, grammar.scopeName);
                        this.scopeNameToPath.set(grammar.scopeName, fullPath);
                        this.scopeNameToLanguage.set(grammar.scopeName, grammar.language);
                    }
                });
            }
        }
    }
}

export default TextMateLoader;
