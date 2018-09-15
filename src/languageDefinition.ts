import ScopeDefinition from "./scopeDefinition";

export default class LanguageDefinition {
    public readonly language: string;
    public readonly extends?: string;
    public readonly scopes?: ScopeDefinition[];
}
