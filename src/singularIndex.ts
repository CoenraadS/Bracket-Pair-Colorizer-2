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

    public getPreviousIndex(type: number): number {
        return this.previousOpenBracketColorIndex;
    }

    public getAllBrackets(): Bracket[] {
        return this.allBracketsOnLine;
    }

    public addOpenBracket(token: Token, colorIndex: number) {
        const openBracket = new Bracket(token, this.settings.colors[colorIndex]);
        this.allLinesOpenBracketStack.push(openBracket);
        this.allBracketsOnLine.push(openBracket);
        this.bracketsHash += openBracket.token.character;
        this.previousOpenBracketColorIndex = colorIndex;
    }

    public getCurrentLength(type: number): number {
        return this.allLinesOpenBracketStack.length;
    }

    public addCloseBracket(token: Token) {
        const openBracket = this.allLinesOpenBracketStack.pop();
        if (openBracket) {
            const closeBracket = new BracketClose(token, openBracket);
            this.allBracketsOnLine.push(closeBracket);
            this.bracketsHash += closeBracket.token.character;
        }
    }

    public getClosingBracket(position: Position): BracketClose | undefined {
        for (const bracket of this.allBracketsOnLine) {
            if (!(bracket instanceof BracketClose)) {
                continue;
            }

            const closeBracket = bracket as BracketClose;
            const openBracket = closeBracket.openBracket;
            const range =
                new Range(openBracket.token.range.start.translate(0, 1), closeBracket.token.range.end.translate(0, -1));

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
            if (bracket.token.range.start.character >= startIndex) {
                bracket.token.offset(amount);
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
