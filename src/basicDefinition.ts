import ScopeDefinition from "./scopeDefinition";

export default class BasicDefinition {
    public readonly language: string;
    public readonly extends?: string;
    public readonly scopes?: ScopeDefinition[];
}
