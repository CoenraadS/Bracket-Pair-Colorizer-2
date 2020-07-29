import { IGrammar } from "./IExtensionGrammar";

export default class LanguageConfig {
    public readonly grammar: IGrammar;
    public readonly regex: RegExp;
    public readonly bracketToId: Map<string, { open: boolean, key: number }>;
    // Key to be used for html brackets
    public readonly htmlKey: number;
    public readonly colorHtmlBrackets: boolean;

    // ECH TODO set colorHtmlBrackets
    constructor(grammar: IGrammar, regex: RegExp, bracketToId: Map<string, { open: boolean, key: number }>) {
        this.grammar = grammar;
        this.regex = regex;
        this.bracketToId = bracketToId;
        let htmlKey = -1;
        bracketToId.forEach((value: { key: number }) => { if (value.key > htmlKey) { htmlKey = value.key } })
        this.htmlKey = htmlKey + 1;
        this.colorHtmlBrackets = true;
    }
}
