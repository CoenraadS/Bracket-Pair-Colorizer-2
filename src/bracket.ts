import Token from "./token";

export default class Bracket {
    public readonly token: Token;
    public readonly color: string;
    constructor(token: Token, color: string) {
        this.token = token;
        this.color = color;
    }
}
