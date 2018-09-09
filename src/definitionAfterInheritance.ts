import ScopeDefinition from "./scopeDefinition";

export default class DefinitionAfterInheritance {
    public readonly language: string;
    public readonly scopes: Map<string, ScopeDefinition>;
    constructor(language: string, scopes: Map<string, ScopeDefinition>) {
        this.language = language;
        this.scopes = scopes;
    }
}
