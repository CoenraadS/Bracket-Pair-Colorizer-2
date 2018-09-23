import { Position } from "vscode";
import Bracket from "./bracket";
import BracketClose from "./bracketClose";
import { IStackElement, IToken } from "./IExtensionGrammar";
import LineState from "./lineState";
import ScopeSingle, { ScopeType } from "./scopeSingle";

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

    public getCharStack() {
        return this.lineState.getCharStack();
    }

    // Return a copy of the line while mantaining bracket state. colorRanges is not mantained.
    public cloneState() {
        return this.lineState.cloneState();
    }

    public getBracketHash()
    {
        return this.lineState.getBracketHash();
    }

    public AddToken(
        currentChar: string,
        match: ScopeSingle,
        token: IToken,
    ) {
        if (match.type === ScopeType.Open) {
            this.addBracket(
                match.key,
                currentChar,
                token.startIndex,
                true,
            );
        }
        else if (match.type === ScopeType.Close) {
            this.addBracket(
                match.key,
                currentChar,
                token.startIndex,
                false,
            );
        }
        else {
            const stackKey = match.key;
            const stackMap = this.getCharStack();
            const stack = stackMap.get(stackKey);
            if (stack && stack.length > 0) {
                const topStack = stack[stack.length - 1];
                if ((topStack) === currentChar) {
                    stack.push(currentChar);
                    this.addBracket(
                        stackKey,
                        currentChar,
                        token.startIndex,
                        true,
                    );
                }
                else {
                    this.addBracket(
                        stackKey,
                        currentChar,
                        token.startIndex,
                        false,
                    );
                    stack.pop();
                }
            }
            else {
                const newStack = [currentChar];
                stackMap.set(stackKey, newStack);
                this.addBracket(
                    stackKey,
                    currentChar,
                    token.startIndex,
                    true,
                );
            }
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
        type: string,
        character: string,
        beginIndex: number,
        open: boolean,
    ): void {
        this.lineState.addBracket(type, character, beginIndex, this.index, open);
    }
}
