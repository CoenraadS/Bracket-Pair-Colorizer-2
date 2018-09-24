import { Position } from "vscode";
import Bracket from "./bracket";
import BracketClose from "./bracketClose";
import { IStackElement, IToken, ITokenizeLineResult2 } from "./IExtensionGrammar";
import LineState from "./lineState";
import ScopeSingle, { ScopeType } from "./scopeSingle";

export default class TextLine {
    public index: number;
    private lineState: LineState;
    private readonly tokenizedLineResult: ITokenizeLineResult2;

    constructor(
        tokenizedLineResult: ITokenizeLineResult2,
        lineState: LineState,
        index: number) {
        this.lineState = lineState;
        this.tokenizedLineResult = tokenizedLineResult;
        this.index = index;
    }

    public getRuleStack(): IStackElement {
        return this.tokenizedLineResult.ruleStack;
    }

    public getCharStack() {
        return this.lineState.getCharStack();
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
        id: number,
    ) {
        const stackKey = id;
        const stack = this.getCharStack();
        if (stack.length > 0) {
            const topStack = stack[stack.length - 1];
            if ((topStack) === stackKey) {
                stack.push(stackKey);
                this.addBracket(
                    stackKey,
                    currentChar,
                    index,
                    true,
                );
            }
            else {
                this.addBracket(
                    stackKey,
                    currentChar,
                    index,
                    false,
                );
                stack.pop();
            }
        }
        else {
            stack.push(stackKey);
            this.addBracket(
                stackKey,
                currentChar,
                index,
                true,
            );
        }
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

    private addBracket(
        type: number,
        character: string,
        beginIndex: number,
        open: boolean,
    ): void {
        this.lineState.addBracket(type, character, beginIndex, this.index, open);
    }
}
