import ScopePair from "./scopePair";

export default class DefinitionAfterInheritance {
    public readonly language: string;
    public readonly scopes: Map<string, ScopePair>;
    constructor(language: string, scopes: Map<string, ScopePair>) {
        this.language = language;
        this.scopes = scopes;
    }
}
