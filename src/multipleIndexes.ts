import { Position, Range } from "vscode";
import Bracket from "./bracket";
import BracketClose from "./bracketClose";
import BracketPointer from "./bracketPointer";
import IBracketManager from "./IBracketManager";
import Settings from "./settings";
import Token from "./token";

export default class MultipleBracketGroups implements IBracketManager {
    private allLinesOpenBracketStack = new Map<string, BracketPointer[]>();
    private openBracketsWhereClosingBracketIsNotOnTheSameLine: Set<BracketPointer> = new Set();
    private closedBrackets: BracketClose[] = [];
    private previousOpenBracketColorIndexes = new Map<string, number>();
    private readonly settings: Settings;

    constructor(
        settings: Settings,
        previousState?: {
            currentOpenBracketColorIndexes: Map<string, BracketPointer[]>,
            previousOpenBracketColorIndexes: Map<string, number>,
        }) {
        this.settings = settings;

        if (previousState !== undefined) {
            this.allLinesOpenBracketStack = previousState.currentOpenBracketColorIndexes;
            this.previousOpenBracketColorIndexes = previousState.previousOpenBracketColorIndexes;
        }
    }

    public getOpeningBracketsWhereClosingBracketsAreNotOnSameLine(): Set<BracketPointer> {
        return this.openBracketsWhereClosingBracketIsNotOnTheSameLine;
    }

    public getPreviousIndex(type: string): number {
        return this.previousOpenBracketColorIndexes[type];
    }

    public getAmountOfClosedBrackets(){
        return this.closedBrackets.length;
    }

    public isClosingPairForCurrentStack(type: string, depth: number): boolean {
        const bracketStack = this.allLinesOpenBracketStack.get(type);

        if (bracketStack && bracketStack.length > 0) {
            const topStack = bracketStack[bracketStack.length - 1].bracket;
            return topStack.token.depth === depth;
        }
        else {
            return false;
        }
    }

    public setCurrent(token: Token, colorIndex: number) {
        const openBracket = new Bracket(token, colorIndex, this.settings.colors[colorIndex]);
        const pointer = new BracketPointer(openBracket);
        this.openBracketsWhereClosingBracketIsNotOnTheSameLine.add(pointer);
        const stack = this.allLinesOpenBracketStack.get(token.type);
        if (stack) {
            stack.push(pointer);
        }
        else {
            this.allLinesOpenBracketStack.set(token.type, [pointer]);
        }

        this.allLinesOpenBracketStack[token.type].push(openBracket);

        this.previousOpenBracketColorIndexes.set(token.type, colorIndex);
    }

    public getCurrentLength(type: string): number {
        return this.allLinesOpenBracketStack[type].length;
    }

    public getCurrentColorIndex(token: Token): number | undefined {
        const openStack = this.allLinesOpenBracketStack.get(token.type);

        if (!openStack) {
            return;
        }
        const openBracketPointer = openStack.pop();

        if (!openBracketPointer) {
            return;
        }

        const closeBracket = new BracketClose(token, openBracketPointer);
        this.openBracketsWhereClosingBracketIsNotOnTheSameLine.delete(openBracketPointer);
        this.closedBrackets.push(closeBracket);

        return openBracketPointer.bracket.colorIndex;
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

    public copyCumulativeState(): IBracketManager {
        return new MultipleBracketGroups(
            this.settings,
            {
                currentOpenBracketColorIndexes: new Map(this.allLinesOpenBracketStack),
                previousOpenBracketColorIndexes: new Map(this.previousOpenBracketColorIndexes),
            });
    }
}
