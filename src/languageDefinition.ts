import ScopePair from "./scopePair";

export default class LanguageDefinition {
    public readonly language: string;
    public readonly extends?: string;
    public readonly scopes?: ScopePair[];
}
