export default class TokenMatch {
    public readonly type: string;
    public readonly startsWith: string;
    constructor(
        startsWith: string,
        suffix?: string,
    ) {
        this.startsWith = startsWith;
        if (suffix) {
            this.type = startsWith + suffix;
        }
        else {
            this.type = startsWith;
        }
    }
}
