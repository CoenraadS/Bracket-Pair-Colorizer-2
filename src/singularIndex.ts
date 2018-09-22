import { Position, Range } from "vscode";
import Bracket from "./bracket";
import BracketClose from "./bracketClose";
import IBracketManager from "./IBracketManager";
import Settings from "./settings";
import Token from "./token";

export default class SingularBracketGroup implements IBracketManager {
    private allLinesOpenBracketStack: Bracket[] = [];
    private allBracketsOnLine: Bracket[] = [];
    private bracketsHash = "";
    private previousOpenBracketColorIndex: number = -1;
    private readonly settings: Settings;
    constructor(
        settings: Settings,
        previousState?: {
            currentOpenBracketColorIndexes: Bracket[],
            previousOpenBracketColorIndex: number,
        }) {

        this.settings = settings;

        if (previousState !== undefined) {
            this.allLinesOpenBracketStack = previousState.currentOpenBracketColorIndexes;
            this.previousOpenBracketColorIndex = previousState.previousOpenBracketColorIndex;
        }
    }

    public getPreviousIndex(type: string): number {
        return this.previousOpenBracketColorIndex;
    }

    public setCurrent(token: Token, colorIndex: number) {
        const openBracket = new Bracket(token, colorIndex, this.settings.colors[colorIndex]);
        this.allLinesOpenBracketStack.push(openBracket);
        this.allBracketsOnLine.push(openBracket);
        this.bracketsHash += openBracket.token.character;
        this.previousOpenBracketColorIndex = colorIndex;
    }

    public getCurrentLength(type: string): number {
        return this.allLinesOpenBracketStack.length;
    }

    public setCloseBracketAndGetColor(token: Token): number | undefined {
        const openBracket = this.allLinesOpenBracketStack.pop();
        if (openBracket) {
            const closeBracket = new BracketClose(token, openBracket);
            this.allBracketsOnLine.push(closeBracket);
            this.bracketsHash += closeBracket.token.character;

            return openBracket.colorIndex;
        }
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

    public copyCumulativeState() {
        return new SingularBracketGroup(
            this.settings,
            {
                currentOpenBracketColorIndexes: this.allLinesOpenBracketStack.slice(),
                previousOpenBracketColorIndex: this.previousOpenBracketColorIndex,
            });
    }
}
