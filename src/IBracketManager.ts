import { Position } from "vscode";
import Bracket from "./bracket";
import BracketClose from "./bracketClose";
import Token from "./token";

interface IBracketManager {
    getPreviousIndex(type: string): number;
    addOpenBracket(token: Token, color: number): void;
    getCurrentLength(type: string): number;
    addCloseBracket(token: Token): void;
    getClosingBracket(position: Position): BracketClose | undefined;
    copyCumulativeState(): IBracketManager;
    getHash(): string;
    offset(startIndex: number, amount: number): void;
    getAllBrackets(): Bracket[];
}

export default IBracketManager;
