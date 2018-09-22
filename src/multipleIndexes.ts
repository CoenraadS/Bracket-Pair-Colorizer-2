import { Position, Range } from "vscode";
import Bracket from "./bracket";
import BracketClose from "./bracketClose";
import BracketPointer from "./bracketPointer";
import IBracketManager from "./IBracketManager";
import Settings from "./settings";
import Token from "./token";

export default class MultipleBracketGroups implements IBracketManager {
    private allLinesOpenBracketStack = new Map<string, Bracket[]>();
    private allBracketsOnLine: Bracket[] = [];
    private bracketsHash = "";
    private previousOpenBracketColorIndexes = new Map<string, number>();
    private readonly settings: Settings;

    constructor(
        settings: Settings,
        previousState?: {
            currentOpenBracketColorIndexes: Map<string, Bracket[]>,
            previousOpenBracketColorIndexes: Map<string, number>,
        }) {
        this.settings = settings;

        if (previousState !== undefined) {
            this.allLinesOpenBracketStack = previousState.currentOpenBracketColorIndexes;
            this.previousOpenBracketColorIndexes = previousState.previousOpenBracketColorIndexes;
        }
    }

    public getPreviousIndex(type: string): number {
        return this.previousOpenBracketColorIndexes[type];
    }

    public setCurrent(token: Token, colorIndex: number) {
        const openBracket = new Bracket(token, colorIndex, this.settings.colors[colorIndex]);
        this.allBracketsOnLine.push(openBracket);
        this.bracketsHash += openBracket.token.character;

        const stack = this.allLinesOpenBracketStack.get(token.type);
        if (stack) {
            stack.push(openBracket);
        }
        else {
            this.allLinesOpenBracketStack.set(token.type, [openBracket]);
        }

        this.allLinesOpenBracketStack[token.type].push(openBracket);

        this.previousOpenBracketColorIndexes.set(token.type, colorIndex);
    }

    public getCurrentLength(type: string): number {
        return this.allLinesOpenBracketStack[type].length;
    }

    public setCloseBracketAndGetColor(token: Token): number | undefined {
        const openStack = this.allLinesOpenBracketStack.get(token.type);

        if (!openStack) {
            return;
        }
        const openBracket = openStack.pop();

        if (!openBracket) {
            return;
        }

        const closeBracket = new BracketClose(token, openBracket);
        this.allBracketsOnLine.push(closeBracket);
        this.bracketsHash += closeBracket.token;

        return openBracket.colorIndex;
    }

    public getClosingBracket(position: Position): BracketClose | undefined {
        for (const bracket of this.allBracketsOnLine) {
            if (!(bracket instanceof BracketClose)) {
                continue;
            }

            const closeBracket = bracket as BracketClose;

            const openBracket = closeBracket.openBracket;
            const startPosition = new Position(openBracket.token.line.index,
                openBracket.token.beginIndex + openBracket.token.character.length);
            const endPosition = new Position(closeBracket.token.line.index, closeBracket.token.beginIndex);
            const range = new Range(startPosition, endPosition);

            if (range.contains(position)) {
                return closeBracket;
            }
        }
    }

    public getHash() {
        return this.bracketsHash;
    }

    public offset(startIndex: number, amount: number) {
        for (const bracket of this.allBracketsOnLine) {
            if (bracket.token.beginIndex >= startIndex) {
                bracket.token.beginIndex += amount;
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
