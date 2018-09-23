import { Position } from "vscode";
import Bracket from "./bracket";
import BracketClose from "./bracketClose";
import ColorMode from "./colorMode";
import IBracketManager from "./IBracketManager";
import MultipleBracketGroups from "./multipleIndexes";
import Settings from "./settings";
import SingularBracketGroup from "./singularIndex";
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

    public getCharStack() {
        return this.charStack;
    }

    public getBracketHash() {
        return this.bracketManager.getHash();
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

    public offset(startIndex: number, amount: number) {
        this.bracketManager.offset(startIndex, amount);
    }

    public addBracket(
        type: string,
        character: string,
        beginIndex: number,
        lineIndex: number,
        open: boolean,
    ) {
        const token = new Token(type, character, beginIndex, lineIndex);
        if (open) {
            this.addOpenBracket(token);
        }
        else {
            this.addCloseBracket(token);
        }
    }

    public getAllBrackets(): Bracket[] {
        return this.bracketManager.getAllBrackets();
    }

    private cloneCharStack() {
        const clone = new Map<string, string[]>();
        this.charStack.forEach((value, key) => {
            clone.set(key, value.slice());
        });
        return clone;
    }

    private addOpenBracket(token: Token) {
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
        this.bracketManager.addOpenBracket(token, colorIndex);
    };

    private addCloseBracket(token: Token) {
        this.bracketManager.addCloseBracket(token);
    }
}
