import { Position, Range } from "vscode";
import Bracket from "./bracket";
import BracketClose from "./bracketClose";
import BracketPointer from "./bracketPointer";
import IBracketManager from "./IBracketManager";
import Settings from "./settings";
import Token from "./token";

export default class SingularBracketGroup implements IBracketManager {
    private allLinesOpenBracketStack: BracketPointer[] = [];
    private closedBrackets: BracketClose[] = [];
    private openBracketsWhereClosingBracketsAreNotOnSameLine: Set<BracketPointer> = new Set();
    private previousOpenBracketColorIndex: number = -1;
    private readonly settings: Settings;
    constructor(
        settings: Settings,
        previousState?: {
            currentOpenBracketColorIndexes: BracketPointer[],
            previousOpenBracketColorIndex: number,
        }) {

        this.settings = settings;

        if (previousState !== undefined) {
            this.allLinesOpenBracketStack = previousState.currentOpenBracketColorIndexes;
            this.previousOpenBracketColorIndex = previousState.previousOpenBracketColorIndex;
        }
    }

    public getOpeningBracketsWhereClosingBracketsAreNotOnSameLine(): Set<BracketPointer> {

        return this.openBracketsWhereClosingBracketsAreNotOnSameLine;
    }

    public getPreviousIndex(type: string): number {
        return this.previousOpenBracketColorIndex;
    }

    public isClosingPairForCurrentStack(type: string, depth: number): boolean {
        if (this.allLinesOpenBracketStack.length === 0) {
            return false;
        }

        const topStack = this.allLinesOpenBracketStack[this.allLinesOpenBracketStack.length - 1].bracket;

        return topStack.token.type === type && topStack.token.depth === depth;
    }

    public setCurrent(token: Token, colorIndex: number) {
        const openBracket = new Bracket(token, colorIndex, this.settings.colors[colorIndex]);
        const pointer = new BracketPointer(openBracket);
        this.allLinesOpenBracketStack.push(pointer);
        this.openBracketsWhereClosingBracketsAreNotOnSameLine.add(pointer);
        this.previousOpenBracketColorIndex = colorIndex;
    }

    public getCurrentLength(type: string): number {
        return this.allLinesOpenBracketStack.length;
    }

    public getCurrentColorIndex(token: Token): number | undefined {
        const openBracketPointer = this.allLinesOpenBracketStack.pop();
        if (openBracketPointer) {
            const closeBracket = new BracketClose(token, openBracketPointer);
            this.closedBrackets.push(closeBracket);
            this.openBracketsWhereClosingBracketsAreNotOnSameLine.delete(openBracketPointer);

            return openBracketPointer.bracket.colorIndex;
        }
    }

    public getClosingBracket(position: Position): BracketClose | undefined {
        for (const closeBracket of this.closedBrackets) {
            const openBracket = closeBracket.openBracketPointer.bracket;
            const startPosition = new Position(openBracket.token.line.index,
                openBracket.token.beginIndex + openBracket.token.character.length);
            const endPosition = new Position(closeBracket.token.line.index, closeBracket.token.beginIndex);
            const range = new Range(startPosition, endPosition);

            if (range.contains(position)) {
                return closeBracket;
            }
        }
    }

    public getAmountOfClosedBrackets() {
        return this.closedBrackets.length;
    }

    public copyCumulativeState() {
        return new SingularBracketGroup(
            this.settings,
            {
                currentOpenBracketColorIndexes: this.allLinesOpenBracketStack.slice(),
                previousOpenBracketColorIndex: this.previousOpenBracketColorIndex,
            });
    }
}
