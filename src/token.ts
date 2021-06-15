import { Position, Range } from "vscode";

export default class Token {
    public readonly type: number;
    public readonly pairsWith: Array<number>;
    public readonly character: string;
    public range: Range;

    constructor(type: number, character: string, beginIndex: number, lineIndex: number, pairsWith: Array<number>) {
        this.type = type;
        this.pairsWith = pairsWith;
        this.character = character;
        const startPos = new Position(lineIndex, beginIndex);
        const endPos = startPos.translate(0, character.length);
        this.range = new Range(startPos, endPos);
    }

    public offset(amount: number) {
        this.range = new Range(this.range.start.translate(0, amount), this.range.end.translate(0, amount));
    }
}
