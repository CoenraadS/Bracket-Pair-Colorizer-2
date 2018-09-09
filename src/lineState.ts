import { Position } from "vscode";
import BracketClose from "./bracketClose";
import ColorMode from "./colorMode";
import IBracketManager from "./IBracketManager";
import MultipleBracketGroups from "./multipleIndexes";
import Settings from "./settings";
import SingularBracketGroup from "./singularIndex";
import TextLine from "./textLine";
import Token from "./token";

export default class LineState {
    private readonly bracketManager: IBracketManager;
    private previousBracketColor: string;
    private readonly settings: Settings;
    private readonly charStack: Map<string, string[]>;

    constructor(settings: Settings, previousState?:
        {
            readonly colorIndexes: IBracketManager;
            readonly previousBracketColor: string;
            readonly charStack: Map<string, string[]>;
        }) {
        this.settings = settings;

        if (previousState !== undefined) {
            this.bracketManager = previousState.colorIndexes;
            this.previousBracketColor = previousState.previousBracketColor;
            this.charStack = previousState.charStack;
        }
        else {
            this.charStack = new Map<string, string[]>();
            switch (settings.colorMode) {
                case ColorMode.Consecutive: this.bracketManager = new SingularBracketGroup(settings);
                    break;
                case ColorMode.Independent: this.bracketManager = new MultipleBracketGroups(settings);
                    break;
                default: throw new RangeError("Not implemented enum value");
            }
        }
    }

    public getOpeningBracketsWhereClosingBracketsAreNotOnSameLine() {
        return this.bracketManager.getOpeningBracketsWhereClosingBracketsAreNotOnSameLine();
    }

    public getCharStack() {
        return this.charStack;
    }

    public getAmountOfClosedBrackets(){
        return this.bracketManager.getAmountOfClosedBrackets();
    }

    public cloneState(): LineState {
        const clone =
        {
            charStack: this.cloneCharStack(),
            colorIndexes: this.bracketManager.copyCumulativeState(),
            previousBracketColor: this.previousBracketColor,
        };

        return new LineState(this.settings, clone);
    }

    public getClosingBracket(position: Position): BracketClose | undefined {
        return this.bracketManager.getClosingBracket(position);
    }

    public getBracketColor(
        type: string,
        character: string,
        depth: number,
        beginIndex: number,
        line: TextLine,
    ): string {
        const token = new Token(type, character, depth, beginIndex, line);
        if (this.bracketManager.isClosingPairForCurrentStack(type, depth)) {
            return this.getCloseBracketColor(token);
        }
        return this.getOpenBracketColor(token);
    }

    private cloneCharStack() {
        const clone = new Map<string, string[]>();
        this.charStack.forEach((value, key) => {
            clone.set(key, value.slice());
        });
        return clone;
    }

    private getOpenBracketColor(token: Token): string {
        let colorIndex: number;

        if (this.settings.forceIterationColorCycle) {
            colorIndex = (this.bracketManager.getPreviousIndex(token.type) + 1) % this.settings.colors.length;
        }
        else {
            colorIndex = this.bracketManager.getCurrentLength(token.type) % this.settings.colors.length;
        }

        let color = this.settings.colors[colorIndex];

        if (this.settings.forceUniqueOpeningColor && color === this.previousBracketColor) {
            colorIndex = (colorIndex + 1) % this.settings.colors.length;
            color = this.settings.colors[colorIndex];
        }

        this.previousBracketColor = color;
        this.bracketManager.setCurrent(token, colorIndex);

        return color;
    };

    private getCloseBracketColor(token: Token): string {
        const colorIndex = this.bracketManager.getCurrentColorIndex(token);
        let color: string;
        if (colorIndex !== undefined) {
            color = this.settings.colors[colorIndex];
            return color;
        }

        throw new Error("Could not get closing bracket color");
    }
}
