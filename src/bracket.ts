import Token from "./token";

export default class Bracket {
    public readonly token: Token;
    public readonly colorIndex: number;
    public readonly color: string;
    constructor(token: Token, colorIndex: number, color: string) {
        this.token = token;
        this.colorIndex = colorIndex;
        this.color = color;
    }
}
