import * as path from "path";
import * as vscode from "vscode";
import { IExtensionPackage, IGrammar } from "./IExtensionGrammar";
import fs = require("fs");
import { getRegexForBrackets } from "./bracketUtil";
import JSON5 = require("json5");
import LanguageConfig from "./languageConfig";

export class TextMateLoader {
    public readonly scopeNameToLanguage = new Map<string, string>();
    private readonly scopeNameToPath = new Map<string, string>();
    private readonly languageToScopeName = new Map<string, string>();
    private readonly languageToConfigPath = new Map<string, string>();
    private languageId = 1;
    private readonly vsctm: any;
    private readonly languageConfigs = new Map<string, LanguageConfig>();
    constructor() {
        this.initializeGrammars();
        this.vsctm = this.loadTextMate();
    }

    public tryGetLanguageConfig(languageID: string) {
        const existingTokenizer = this.languageConfigs.get(languageID);
        if (existingTokenizer) {
            return existingTokenizer;
        }

        const scopeName = this.languageToScopeName.get(languageID);

        if (!scopeName) {
            return;
        }

        const configPath = this.languageToConfigPath.get(languageID);
        if (!configPath) {
            return;
        }

        return new Promise((resolve, reject) => {
            fs.readFile(configPath, (error, content) => {
                if (error) {
                    reject(error);
                } else {
                    const config = JSON5.parse(content.toString());
                    const brackets = (config as any).brackets as [string[]];
                    resolve(brackets);
                }
            });
        }).then((brackets: [string[]]) => {
            if (!brackets) {
                return null;
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
                    if (!this.languageConfigs.has(languageID)) {
                        const mappedBrackets = brackets.map((b) => ({ open: b[0], close: b[1] }))
                            .filter(e => e.open !== "<" && e.close !== ">");

                        const bracketToId = new Map<string, { open: boolean, key: number }>();
                        for (let i = 0; i < brackets.length; i++) {
                            const bracket = brackets[i];
                            bracketToId.set(bracket[0], { open: true, key: i });
                            bracketToId.set(bracket[1], { open: false, key: i });
                        }

                        let maxBracketLength = 0;
                        for (const bracket of mappedBrackets) {
                            maxBracketLength = Math.max(maxBracketLength, bracket.open.length);
                            maxBracketLength = Math.max(maxBracketLength, bracket.close.length);
                        }

                        const regex = getRegexForBrackets(mappedBrackets);
                        this.languageConfigs.set(languageID, new LanguageConfig(grammar, regex, bracketToId));
                    }
                }
                return grammar;
            });
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
            if (packageJSON.contributes) {
                if (packageJSON.contributes.grammars && packageJSON.contributes.languages) {
                    for (const grammar of packageJSON.contributes.grammars) {
                        if (grammar.language && grammar.scopeName && grammar.path) {
                            const fullPath = path.join(extension.extensionPath, grammar.path);
                            this.languageToScopeName.set(grammar.language, grammar.scopeName);
                            this.scopeNameToPath.set(grammar.scopeName, fullPath);
                            this.scopeNameToLanguage.set(grammar.scopeName, grammar.language);
                        }
                    }

                    for (const language of packageJSON.contributes.languages) {
                        if (language.configuration) {
                            const configPath = path.join(extension.extensionPath, language.configuration);
                            this.languageToConfigPath.set(language.id, configPath);
                        }
                    }
                }
            }
        }
    }
}

export default TextMateLoader;
