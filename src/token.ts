import TextLine from "./textLine";

export default class Token {
    public readonly type: string;
    public readonly character: string;
    public beginIndex: number;
    public line: TextLine;

    constructor(type: string, character: string, beginIndex: number, line: TextLine) {
        this.type = type;
        this.character = character;
        this.beginIndex = beginIndex;
        this.line = line;
    }
}
