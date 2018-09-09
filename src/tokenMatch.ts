export default class TokenMatch {
    public readonly regex: RegExp;
    public readonly suffix: string;
    public readonly depth: number;
    public readonly disabled: boolean;
    public readonly openAndCloseCharactersAreTheSame: boolean;
    constructor(
        depth: number,
        disabled: boolean,
        openAndCloseCharactersAreTheSame: boolean,
        startsWith: string,
        suffix?: string
    ) {
        this.openAndCloseCharactersAreTheSame = openAndCloseCharactersAreTheSame;
        this.depth = depth;
        this.disabled = disabled;
        const regexStart = this.escapeRegExp(startsWith);
        if (suffix) {
            const regexEnd = this.escapeRegExp(suffix);
            this.regex = new RegExp("^" + regexStart + ".*" + regexEnd + "$");
            this.suffix = suffix;
        }
        else {
            this.regex = new RegExp("^" + regexStart);
            this.suffix = "";
        }
    }
    private escapeRegExp(input: string) {
        return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
    }
}
