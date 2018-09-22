import { Position } from "vscode";
import BracketClose from "./bracketClose";
import Token from "./token";

interface IBracketManager {
    getPreviousIndex(type: string): number;
    setCurrent(token: Token, colorIndex: number): void;
    getCurrentLength(type: string): number;
    setCloseBracketAndGetColor(token: Token): number | undefined;
    getClosingBracket(position: Position): BracketClose | undefined;
    copyCumulativeState(): IBracketManager;
    getHash(): string;
    offset(startIndex: number, amount: number): void;
}

export default IBracketManager;
