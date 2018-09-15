import { Position } from "vscode";
import BracketClose from "./bracketClose";
import BracketPointer from "./bracketPointer";
import Token from "./token";

interface IBracketManager {
    getPreviousIndex(type: string): number;
    setCurrent(token: Token, colorIndex: number): void;
    getCurrentLength(type: string): number;
    getCurrentColorIndex(token: Token): number | undefined;
    getClosingBracket(position: Position): BracketClose | undefined;
    getAmountOfClosedBrackets(): number;
    copyCumulativeState(): IBracketManager;
    getOpeningBracketsWhereClosingBracketsAreNotOnSameLine(): Set<BracketPointer>;
}

export default IBracketManager;
