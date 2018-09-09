import Bracket from "./bracket";
import BracketPointer from "./bracketPointer";
import Token from "./token";

export default class BracketClose extends Bracket {
    public readonly openBracketPointer: BracketPointer;
    constructor(token: Token, openBracket: BracketPointer) {
        super(token, openBracket.bracket.colorIndex, openBracket.bracket.color);
        this.openBracketPointer = openBracket;
    }
}
