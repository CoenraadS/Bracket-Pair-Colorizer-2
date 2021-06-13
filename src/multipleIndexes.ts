import { Position, Range } from "vscode";
import Bracket from "./bracket";
import BracketClose from "./bracketClose";
import IBracketManager from "./IBracketManager";
import LanguageConfig from "./languageConfig";
import Settings from "./settings";
import Token from "./token";

export default class MultipleBracketGroups implements IBracketManager {
    private allLinesOpenBracketStack: Bracket[][] = [];
    private allBracketsOnLine: Bracket[] = [];
    private bracketsHash = "";
    private previousOpenBracketColorIndexes: number[] = [];
    private readonly settings: Settings;
    private readonly languageConfig: LanguageConfig;

    constructor(
        settings: Settings,
        languageConfig: LanguageConfig,
        previousState?: {
            currentOpenBracketColorIndexes: Bracket[][],
            previousOpenBracketColorIndexes: number[],
        }) {
        this.settings = settings;
        this.languageConfig = languageConfig;
        if (previousState !== undefined) {
            this.allLinesOpenBracketStack = previousState.currentOpenBracketColorIndexes;
            this.previousOpenBracketColorIndexes = previousState.previousOpenBracketColorIndexes;
        }
        else {
            for (const value of languageConfig.bracketToId.values()) {
                this.allLinesOpenBracketStack[value.key] = [];
                this.previousOpenBracketColorIndexes[value.key] = 0;
            }
            if (languageConfig.colorHtmlStyleTags) {
                this.allLinesOpenBracketStack[languageConfig.htmlKey] = [];
                this.previousOpenBracketColorIndexes[languageConfig.htmlKey] = 0;
            }
        }
    }

    public getPreviousIndex(type: number): number {
        return this.previousOpenBracketColorIndexes[type];
    }

    public addOpenBracket(token: Token, colorIndex: number) {
        const openBracket = new Bracket(token, this.settings.colors[colorIndex]);
        this.allBracketsOnLine.push(openBracket);
        this.bracketsHash += openBracket.token.character;

        this.allLinesOpenBracketStack[token.type].push(openBracket);
        this.previousOpenBracketColorIndexes[token.type] = colorIndex;
    }

    public GetAmountOfOpenBrackets(type: number): number {
        return this.allLinesOpenBracketStack[type].length;
    }

    public addCloseBracket(token: Token): number | undefined {
        const openStack = this.allLinesOpenBracketStack[token.type];

        if (openStack.length > 0) {
            if (openStack[openStack.length - 1].token.type === token.type) {
                const openBracket = openStack.pop();
                const closeBracket = new BracketClose(token, openBracket!);
                this.allBracketsOnLine.push(closeBracket);
                this.bracketsHash += closeBracket.token.character;
                return;
            }
        }

        const orphan = new Bracket(token, this.settings.unmatchedScopeColor);
        this.allBracketsOnLine.push(orphan);
        this.bracketsHash += orphan.token.character;
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

    public getAllBrackets(): Bracket[] {
        return this.allBracketsOnLine;
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

    public copyCumulativeState(): IBracketManager {
        const clone: Bracket[][] = [];

        for (const value of this.allLinesOpenBracketStack) {
            clone.push(value.slice());
        }

        return new MultipleBracketGroups(
            this.settings,
            this.languageConfig,
            {
                currentOpenBracketColorIndexes: clone,
                previousOpenBracketColorIndexes: this.previousOpenBracketColorIndexes.slice(),
            });
    }
}
