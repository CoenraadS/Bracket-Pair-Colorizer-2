export enum ScopeType {
    Ambiguous,
    Open,
    Close,
}

export default class ScopeSingle {
    public readonly tokenName: string;
    public readonly key: string;
    public readonly type: ScopeType;

    constructor(tokenName: string, type: ScopeType, key: string) {
        this.tokenName = tokenName;
        this.type = type;
        this.key = key;
    }
}
