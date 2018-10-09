import { Position } from "vscode";
import Bracket from "./bracket";
import BracketClose from "./bracketClose";
import { IStackElement } from "./IExtensionGrammar";
import LineState from "./lineState";

export default class TextLine {
    public index: number;
    private lineState: LineState;
    private readonly ruleStack: IStackElement;

    constructor(
        ruleStack: IStackElement,
        lineState: LineState,
        index: number) {
        this.lineState = lineState;
        this.ruleStack = ruleStack;
        this.index = index;
    }

    public getRuleStack(): IStackElement {
        return this.ruleStack;
    }

    // Return a copy of the line while mantaining bracket state. colorRanges is not mantained.
    public cloneState() {
        return this.lineState.cloneState();
    }

    public getBracketHash() {
        return this.lineState.getBracketHash();
    }

    public AddToken(
        currentChar: string,
        index: number,
        key: number,
        open: boolean,
    ) {
        this.lineState.addBracket(key, currentChar, index, this.index, open);
    }

    public getClosingBracket(position: Position): BracketClose | undefined {
        return this.lineState.getClosingBracket(position);
    }

    public offset(startIndex: number, amount: number) {
        this.lineState.offset(startIndex, amount);
    }

    public getAllBrackets(): Bracket[] {
        return this.lineState.getAllBrackets();
    }
}
