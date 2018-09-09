import { Range } from "vscode";

export default class FoundBracket {
    public readonly range: Range;
    public readonly character: string;

    constructor(range: Range, type: string) {
        this.range = range;
        this.character = type;
    }
}
