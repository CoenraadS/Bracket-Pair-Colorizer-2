import { Position } from "vscode";
import BracketClose from "./bracketClose";
import { IStackElement, IToken } from "./IExtensionGrammar";
import LineState from "./lineState";
import ScopePair from "./scopePair";
import ScopeSingle, { ScopeType } from "./scopeSingle";

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
                token.endIndex,
                true,
            );
        }
        else if (match.type === ScopeType.Close) {
            this.addBracket(
                match.key,
                currentChar,
                token.startIndex,
                token.endIndex,
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
                        token.endIndex,
                        true,
                    );
                }
                else {
                    this.addBracket(
                        stackKey,
                        currentChar,
                        token.startIndex,
                        token.endIndex,
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
                    token.endIndex,
                    true,
                );
            }
        }
    }

    private addBracket(
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
