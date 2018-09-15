import { Position } from "vscode";
import Bracket from "./bracket";
import BracketClose from "./bracketClose";
import { IStackElement } from "./IExtensionGrammar";
import LineState from "./lineState";

export default class TextLine {
    public colorRanges = new Map<string, Array<{ beginIndex: number, endIndex: number }>>();
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

    public getCharStack() {
        return this.lineState.getCharStack();
    }

    // Return a copy of the line while mantaining bracket state. colorRanges is not mantained.
    public cloneState() {
        return this.lineState.cloneState();
    }

    public getAmountOfClosedBrackets() {
        return this.lineState.getAmountOfClosedBrackets();
    }

    public addBracket(
        type: string,
        character: string,
        beginIndex: number,
        endIndex: number,
        open: boolean,
    ): void {
        const color = this.lineState.getBracketColor(type, character, beginIndex, this, open);

        const colorRanges = this.colorRanges.get(color);
        if (colorRanges !== undefined) {
            colorRanges.push({ beginIndex, endIndex });
        }
        else {
            this.colorRanges.set(color, [{ beginIndex, endIndex }]);
        }
        return;
    }

    public getClosingBracket(position: Position): BracketClose | undefined {
        return this.lineState.getClosingBracket(position);
    }

    public getOpeningBracketsWhereClosingBracketsAreNotOnSameLine() {
        return this.lineState.getOpeningBracketsWhereClosingBracketsAreNotOnSameLine();
    }
}
