import { IGrammar } from "./IExtensionGrammar";

export default class LanguageConfig {
    public readonly grammar: IGrammar;
    public readonly regex: RegExp;
    public readonly bracketToId: Map<string, { open: boolean, key: number }>;
    // Key to be used for html brackets
    public readonly htmlKey: number;
    public readonly colorHtmlStyleTags: boolean;

    constructor(
        grammar: IGrammar, regex: RegExp, bracketToId: Map<string, { open: boolean, key: number }>,
        colorHtmlStyleTags: boolean
    ) {
        this.grammar = grammar;
        this.regex = regex;
        this.bracketToId = bracketToId;
        let htmlKey = -1;
        if (colorHtmlStyleTags) {
            bracketToId.forEach((value: { key: number }) => { if (value.key > htmlKey) { htmlKey = value.key } });
            htmlKey++;
        }
        this.htmlKey = htmlKey;
        this.colorHtmlStyleTags = colorHtmlStyleTags;
    }
}
