import * as vscode from "vscode";
import { EndOfLine } from "vscode";
import Bracket from "./bracket";
import BracketClose from "./bracketClose";
import { IGrammar, IStackElement, IToken } from "./IExtensionGrammar";
import LineState from "./lineState";
import { TokenMatch } from "./ruleBuilder";
import Settings from "./settings";
import TextLine from "./textLine";

export default class DocumentDecoration {
    public readonly settings: Settings;

    // This program caches lines, and will only analyze linenumbers including or above a modified line
    private lines: TextLine[] = [];
    private readonly document: vscode.TextDocument;
    private readonly tokenizer: IGrammar;
    private scopeDecorations: vscode.TextEditorDecorationType[] = [];
    private scopeSelectionHistory: vscode.Selection[][] = [];
    private readonly eol: string;
    private readonly typeMap: TokenMatch[];
    private readonly suffix: string;
    constructor(document: vscode.TextDocument, textMate: IGrammar, settings: Settings) {
        this.settings = settings;
        this.document = document;
        this.tokenizer = textMate;

        this.suffix = "." + (this.tokenizer as any)._grammar.scopeName.split(".")[1];
        this.typeMap = this.settings.getRule(document.languageId) || [];
        if (this.document.eol === EndOfLine.LF) {
            this.eol = "\n";
        }
        else {
            this.eol = "\r\n";
        }
    }

    public dispose() {
        this.settings.dispose();
        this.disposeScopeDecorations();
    }

    public onDidChangeTextDocument(contentChanges: vscode.TextDocumentContentChangeEvent[]) {
        if (contentChanges.length > 1) {
            let minLineIndexToUpdate = 0;
            for (const contentChange of contentChanges) {
                minLineIndexToUpdate = Math.min(minLineIndexToUpdate, contentChange.range.start.line);
            }

            if (minLineIndexToUpdate === 0) {
                this.lines = [];
            }
            else {
                this.lines.splice(minLineIndexToUpdate);
            }
            this.tokenizeDocument();
            return;
        }

        const change = contentChanges[0];

        let recolour = false;
        const amountOfExistingLinesChanged = (change.range.end.line - change.range.start.line) + 1;
        const amountOfNewLinesChanged = change.text.split(this.eol).length;
        const amountOfRemovedLines = Math.max(0, amountOfExistingLinesChanged - amountOfNewLinesChanged);
        const amountOfLinesToReparse = amountOfExistingLinesChanged - amountOfRemovedLines;
        const amountOfInsertedLines = amountOfNewLinesChanged - amountOfLinesToReparse;
        const overLapEndIndex = amountOfLinesToReparse + change.range.start.line;

        if (amountOfInsertedLines > 0 && amountOfRemovedLines > 0) {
            throw new Error("Inserted/Removed line calculation is wrong");
        }

        if (amountOfInsertedLines < 0) {
            throw new Error("amountOfInsertedLines < 0");
        }

        if (amountOfRemovedLines < 0) {
            throw new Error("amountOfRemovedLines < 0");
        }

        for (let i = change.range.start.line; i < overLapEndIndex; i++) {
            const newLine = this.tokenizeLine(i);
            const lineBeingReplaced = this.lines[i];
            this.lines[i] = newLine;

            const lineBeingReplacedRuleStack = lineBeingReplaced.getRuleStack();
            if (!lineBeingReplacedRuleStack.equals(newLine.getRuleStack())) {
                this.lines.splice(i + 1);
                this.tokenizeDocument();
                return;
            }

            // e.g. [].map() => [].map(())
            // Shouldn't trigger full reparse because scope didn't change
            // Just recolor new brackets
            if (lineBeingReplaced.getAmountOfClosedBrackets() !== newLine.getAmountOfClosedBrackets()) {
                recolour = true;
            }

            // e.g. function(){ => function(()){
            // The { has moved, but scope not changed
            // Just update the reference, so closing brackets doesn't need to be reparsed
            this.updateMovedOpeningBracketReferences(lineBeingReplaced, newLine);
        }

        if (amountOfInsertedLines > 0 || amountOfRemovedLines > 0) {
            const existingTextLines = this.lines.splice(overLapEndIndex);
            existingTextLines.splice(0, amountOfRemovedLines);
            for (let i = 0; i < amountOfInsertedLines; i++) {
                const index = i + overLapEndIndex;
                const newLine = this.tokenizeLine(index);
                this.lines.push(newLine);
            }

            if (existingTextLines.length > 0) {
                const fakeNextLine = this.tokenizeLine(amountOfInsertedLines + overLapEndIndex).getRuleStack();
                if (existingTextLines[0].getRuleStack().equals(fakeNextLine)) {
                    this.lines.push(...existingTextLines);
                    for (let i = amountOfInsertedLines + overLapEndIndex; i < this.lines.length; i++) {
                        this.lines[i].index = i;
                    }
                }
                else {
                    this.tokenizeDocument();
                    return;
                }
            }
        }

        if (recolour) {
            this.tokenizeDocument();
        }
    }

    public expandBracketSelection(editor: vscode.TextEditor) {
        const newSelections: vscode.Selection[] = [];

        editor.selections.forEach((selection) => {
            if (this.scopeSelectionHistory.length === 0) {
                this.scopeSelectionHistory.push(editor.selections);
            }

            const nextPos = this.document.validatePosition(selection.active.translate(0, 1));
            const endBracket = this.searchScopeForwards(nextPos);
            if (!endBracket) {
                return;
            }
            const startBracket = endBracket.openBracketPointer.bracket;
            const endLineIndex = endBracket.token.line.index;
            const startLineIndex = startBracket.token.line.index;

            const startPos = new vscode.Position(startLineIndex,
                startBracket.token.beginIndex + startBracket.token.character.length);
            const endPos = new vscode.Position(endLineIndex, endBracket.token.beginIndex);
            const start = this.document.validatePosition(startPos);
            const end = this.document.validatePosition(endPos);
            newSelections.push(new vscode.Selection(start, end));
        });

        if (newSelections.length > 0) {
            this.scopeSelectionHistory.push(newSelections);

            editor.selections = newSelections;
        }
    }

    public undoBracketSelection(editor: vscode.TextEditor) {
        this.scopeSelectionHistory.pop();

        if (this.scopeSelectionHistory.length === 0) {
            return;
        }

        const scopes = this.scopeSelectionHistory[this.scopeSelectionHistory.length - 1];
        editor.selections = scopes;
    }

    // Lines are stored in an array, if line is requested outside of array bounds
    // add emptys lines until array is correctly sized
    public getLine(index: number, ruleStack: IStackElement): TextLine {
        if (index < this.lines.length) {
            return this.lines[index];
        }
        else {
            if (this.lines.length === 0) {
                this.lines.push(
                    new TextLine(ruleStack, new LineState(this.settings), 0),
                );
            }

            if (index < this.lines.length) {
                return this.lines[index];
            }

            if (index === this.lines.length) {
                const previousLine = this.lines[this.lines.length - 1];
                const newLine =
                    new TextLine(ruleStack, previousLine.cloneState(), index);

                this.lines.push(newLine);
                return newLine;
            }

            throw new Error("Cannot look more than one line ahead");
        }
    }

    public tokenizeDocument() {
        if (this.settings.isDisposed) {
            return;
        }

        // One document may be shared by multiple editors (side by side view)
        const editors: vscode.TextEditor[] =
            vscode.window.visibleTextEditors.filter((e) => this.document === e.document);

        if (editors.length === 0) {
            console.warn("No editors associated with document: " + this.document.fileName);
            return;
        }

        // console.time("tokenizeDocument");

        const lineIndex = this.lines.length;
        const lineCount = this.document.lineCount;
        if (lineIndex < lineCount) {
            console.log("Reparse from line: " + (lineIndex + 1));
            for (let i = lineIndex; i < lineCount; i++) {
                const newLine = this.tokenizeLine(i);
                this.lines.push(newLine);
            }
        }

        console.log("Coloring document");
        this.colorDecorations(editors);

        // console.timeEnd("tokenizeDocument");
    }

    public updateScopeDecorations(event: vscode.TextEditorSelectionChangeEvent) {

        if (this.settings.isDisposed) {
            return;
        }

        // console.time("updateScopeDecorations");

        this.disposeScopeDecorations();

        // For performance reasons we only do one selection for now.
        // Simply wrap in foreach selection for multicursor, maybe put it behind an option?
        const selection = event.textEditor.selection;

        const endBracket = this.searchScopeForwards(selection.active);
        if (!endBracket) {
            return;
        }
        const startBracket = endBracket.openBracketPointer.bracket;
        const endLineIndex = endBracket.token.line.index;
        const startLineIndex = startBracket.token.line.index;

        const beginRange = new vscode.Range(
            new vscode.Position(startLineIndex, startBracket.token.beginIndex),
            new vscode.Position(startLineIndex, startBracket.token.beginIndex + startBracket.token.character.length));
        const endRange = new vscode.Range(
            new vscode.Position(endLineIndex, endBracket.token.beginIndex),
            new vscode.Position(endLineIndex, endBracket.token.beginIndex + endBracket.token.character.length));

        if (this.settings.highlightActiveScope) {
            const decoration =
                this.settings.createScopeBracketDecorations(endBracket.color);
            event.textEditor.setDecorations(decoration, [beginRange, endRange]);
            this.scopeDecorations.push(decoration);
        }

        if (this.settings.showBracketsInGutter) {
            if (startLineIndex === endLineIndex) {
                const decoration = this.settings.createGutterBracketDecorations
                    (endBracket.color, endBracket.token.character + endBracket.token.character);
                event.textEditor.setDecorations(decoration, [beginRange, endRange]);
                this.scopeDecorations.push(decoration);
            }
            else {
                const decorationOpen =
                    this.settings.createGutterBracketDecorations(endBracket.color, endBracket.token.character);
                event.textEditor.setDecorations(decorationOpen, [beginRange]);
                this.scopeDecorations.push(decorationOpen);
                const decorationClose =
                    this.settings.createGutterBracketDecorations(endBracket.color, endBracket.token.character);
                event.textEditor.setDecorations(decorationClose, [endRange]);
                this.scopeDecorations.push(decorationClose);
            }
        }

        if (this.settings.showBracketsInRuler) {
            const decoration =
                this.settings.createRulerBracketDecorations(endBracket.color);
            event.textEditor.setDecorations(decoration, [beginRange, endRange]);
            this.scopeDecorations.push(decoration);
        }

        const lastWhiteSpaceCharacterIndex =
            this.document.lineAt(endRange.start).firstNonWhitespaceCharacterIndex;
        const lastBracketStartIndex = endRange.start.character;
        const lastBracketIsFirstCharacterOnLine = lastWhiteSpaceCharacterIndex === lastBracketStartIndex;
        let leftBorderColumn = Infinity;

        const tabSize = event.textEditor.options.tabSize as number;

        const position =
            this.settings.scopeLineRelativePosition ?
                Math.min(endRange.start.character, beginRange.start.character) : 0;

        let leftBorderIndex = position;

        const start = beginRange.start.line + 1;
        const end = endRange.start.line;

        // Start -1 because prefer draw line at current indent level
        for (let lineIndex = start - 1; lineIndex <= end; lineIndex++) {
            const line = this.document.lineAt(lineIndex);

            if (!line.isEmptyOrWhitespace) {
                const firstCharIndex = line.firstNonWhitespaceCharacterIndex;
                leftBorderIndex = Math.min(leftBorderIndex, firstCharIndex);
                leftBorderColumn = Math.min(leftBorderColumn,
                    this.calculateColumnFromCharIndex(line.text, firstCharIndex, tabSize));
            }
        }

        if (this.settings.showVerticalScopeLine) {
            const verticalLineRanges: Array<{ range: vscode.Range, valid: boolean }> = [];

            const endOffset = lastBracketIsFirstCharacterOnLine ? end - 1 : end;
            for (let lineIndex = start; lineIndex <= endOffset; lineIndex++) {
                const line = this.document.lineAt(lineIndex);
                const linePosition = new vscode.Position(lineIndex,
                    this.calculateCharIndexFromColumn(line.text, leftBorderColumn, tabSize));
                const range = new vscode.Range(linePosition, linePosition);
                const valid = line.text.length >= leftBorderIndex;
                verticalLineRanges.push({ range, valid });
            }

            const safeFallbackPosition = new vscode.Position(start - 1, leftBorderIndex);
            this.setVerticalLineDecoration(endBracket, event, safeFallbackPosition, verticalLineRanges);
        }

        if (this.settings.showHorizontalScopeLine) {
            const underlineLineRanges: vscode.Range[] = [];
            const overlineLineRanges: vscode.Range[] = [];

            if (startLineIndex === endLineIndex) {
                underlineLineRanges.push(new vscode.Range(beginRange.start, endRange.end));
            }
            else {
                const startTextLine = this.document.lineAt(startLineIndex);
                const endTextLine = this.document.lineAt(endLineIndex);

                const leftStartPos = new vscode.Position(beginRange.start.line,
                    this.calculateCharIndexFromColumn(startTextLine.text, leftBorderColumn, tabSize));
                const leftEndPos = new vscode.Position(endRange.start.line,
                    this.calculateCharIndexFromColumn(endTextLine.text, leftBorderColumn, tabSize));

                underlineLineRanges.push(new vscode.Range(leftStartPos, beginRange.end));
                if (lastBracketIsFirstCharacterOnLine) {
                    overlineLineRanges.push(new vscode.Range(leftEndPos, endRange.end));
                }
                else {
                    underlineLineRanges.push(new vscode.Range(leftEndPos, endRange.end));
                }
            }

            if (underlineLineRanges) {
                this.setUnderLineDecoration(endBracket, event, underlineLineRanges);
            }

            if (overlineLineRanges) {
                this.setOverLineDecoration(endBracket, event, overlineLineRanges);
            }
        }

        // console.timeEnd("updateScopeDecorations");
    }

    private tokenizeLine(index: number) {
        const newText = this.document.lineAt(index).text;
        const previousLineRuleStack = index > 0 ?
            this.lines[index - 1].getRuleStack() :
            undefined;
        const previousLineState = index > 0 ?
            this.lines[index - 1].cloneState() :
            new LineState(this.settings);
        const tokenized = this.tokenizer.tokenizeLine(newText, previousLineRuleStack);
        const ruleStack = tokenized.ruleStack;
        const tokens = tokenized.tokens;
        const newLine = new TextLine(ruleStack, previousLineState, index);
        this.parseTokens(tokens, newLine, newText);
        return newLine;
    }

    private setOverLineDecoration(
        bracket: Bracket,
        event: vscode.TextEditorSelectionChangeEvent,
        overlineLineRanges: vscode.Range[]) {
        const lineDecoration = this.settings.createScopeLineDecorations(bracket.color, true, false, false, false);
        event.textEditor.setDecorations(lineDecoration, overlineLineRanges);
        this.scopeDecorations.push(lineDecoration);
    }

    private setUnderLineDecoration(
        bracket: Bracket,
        event: vscode.TextEditorSelectionChangeEvent,
        underlineLineRanges: vscode.Range[]) {
        const lineDecoration = this.settings.createScopeLineDecorations(bracket.color, false, false, true, false);
        event.textEditor.setDecorations(lineDecoration, underlineLineRanges);
        this.scopeDecorations.push(lineDecoration);
    }

    private setVerticalLineDecoration(
        bracket: Bracket,
        event: vscode.TextEditorSelectionChangeEvent,
        fallBackPosition: vscode.Position,
        verticleLineRanges: Array<{ range: vscode.Range, valid: boolean }>,
    ) {
        const offsets:
            Array<{ range: vscode.Range, downOffset: number }> = [];
        const normalDecoration = this.settings.createScopeLineDecorations(bracket.color, false, false, false, true);

        if (verticleLineRanges.length === 0) {
            return;
        }

        const normalRanges = verticleLineRanges.filter((e) => e.valid).map((e) => e.range);

        // Get first valid range, if non fall-back to opening position
        let aboveValidRange = new vscode.Range(fallBackPosition, fallBackPosition);
        for (const lineRange of verticleLineRanges) {
            if (lineRange.valid) {
                aboveValidRange = lineRange.range;
                break;
            }
        }

        /* Keep updating last valid range to keep offset distance minimum
         to prevent missing decorations when scrolling */
        for (const lineRange of verticleLineRanges) {
            if (lineRange.valid) {
                aboveValidRange = lineRange.range;
            }
            else {
                const offset = lineRange.range.start.line - aboveValidRange.start.line;
                offsets.push({ range: aboveValidRange, downOffset: offset });
            }
        }

        event.textEditor.setDecorations(normalDecoration, normalRanges);
        this.scopeDecorations.push(normalDecoration);

        offsets.forEach((offset) => {
            const decoration = this.settings.createScopeLineDecorations(
                bracket.color, false, false, false, true, offset.downOffset,
            );
            event.textEditor.setDecorations(decoration, [offset.range]);
            this.scopeDecorations.push(decoration);
        });
    }

    private disposeScopeDecorations() {
        for (const decoration of this.scopeDecorations) {
            decoration.dispose();
        }

        this.scopeDecorations = [];
    }

    private searchScopeForwards(position: vscode.Position): BracketClose | undefined {
        for (let i = position.line; i < this.lines.length; i++) {
            const endBracket = this.lines[i].getClosingBracket(position);

            if (endBracket) {
                return endBracket;
            }
        }
    }

    private parseTokens(tokens: IToken[], currentLine: TextLine, text: string) {
        const stack = currentLine.getCharStack();
        for (const token of tokens) {
            const character = text.substring(token.startIndex, token.endIndex);
            if (token.scopes.length > 1) {
                this.validateToken(token, character, stack, currentLine);
            }
        }
    }

    private validateToken(token: IToken, character: string, stack: Map<string, string[]>, currentLine: TextLine) {
        for (const tokenMatch of this.typeMap) {
            if (token.scopes.length - (tokenMatch.depth + 1) >= 0) {
                const type = token.scopes[token.scopes.length - (tokenMatch.depth + 1)];
                const typeNoLanguageSuffix = type.substring(0, type.length - this.suffix.length);
                if (tokenMatch.regex.test(typeNoLanguageSuffix)) {
                    if (tokenMatch.disabled) {
                        return;
                    }

                    const commonToken =
                        typeNoLanguageSuffix.substring(0, typeNoLanguageSuffix.length - tokenMatch.suffix.length);
                    this.manageTokenStack(character, stack, commonToken, currentLine, token, tokenMatch.openAndCloseCharactersAreTheSame);
                    return;
                }
            }
        }
    }

    private updateMovedOpeningBracketReferences(lineBeingReplaced: TextLine, newLine: TextLine) {
        const oldOpenBracketPointers = lineBeingReplaced.getOpeningBracketsWhereClosingBracketsAreNotOnSameLine();
        const currentOpenBracketPointers = newLine.getOpeningBracketsWhereClosingBracketsAreNotOnSameLine();
        if (oldOpenBracketPointers.size === currentOpenBracketPointers.size) {
            const oldIterator = oldOpenBracketPointers.values();
            const currentIterator = currentOpenBracketPointers.values();
            for (let iterator = 0; iterator < oldOpenBracketPointers.size; iterator++) {
                const old = oldIterator.next();
                const current = currentIterator.next();
                if (old.value.bracket.token.type !== current.value.bracket.token.type) {
                    console.warn("Bracket order not the same?");
                    return;
                }
                const currentBeginIndex = current.value.bracket.token.beginIndex;
                const currentLine = current.value.bracket.token.line;
                current.value.bracket = old.value.bracket;
                current.value.bracket.token.line = currentLine;
                current.value.bracket.token.beginIndex = currentBeginIndex;
            }
        }
    }

    private manageTokenStack(
        currentChar: string,
        stackMap: Map<string, string[]>,
        type: string,
        currentLine: TextLine,
        token: IToken,
        openAndCloseCharactersAreTheSame: boolean,
    ) {
        const stackKey = openAndCloseCharactersAreTheSame ? currentChar : type + token.scopes.length;
        const stack = stackMap.get(stackKey);
        if (stack && stack.length > 0) {
            const topStack = stack[stack.length - 1];
            if ((topStack) === currentChar) {
                stack.push(currentChar);
                currentLine.addBracket(
                    type,
                    currentChar,
                    stack.length + token.scopes.length,
                    token.startIndex,
                    token.endIndex,
                );
            }
            else {
                currentLine.addBracket(
                    type,
                    currentChar,
                    stack.length + token.scopes.length,
                    token.startIndex,
                    token.endIndex,
                );
                stack.pop();
            }
        }
        else {
            const newStack = [currentChar];
            stackMap.set(stackKey, newStack);
            currentLine.addBracket(
                type,
                currentChar,
                newStack.length + token.scopes.length,
                token.startIndex,
                token.endIndex,
            );
        }
    }

    private colorDecorations(editors: vscode.TextEditor[]) {
        // console.time("colorDecorations");
        const colorMap = new Map<string, vscode.Range[]>();

        // Reduce all the colors/ranges of the lines into a singular map
        for (let i = 0; i < this.lines.length; i++) {
            {
                for (const [color, indexes] of this.lines[i].colorRanges) {
                    const existingRanges = colorMap.get(color);

                    const ranges = indexes.map((index) => {
                        const start = new vscode.Position(i, index.beginIndex);
                        const end = new vscode.Position(i, index.endIndex);
                        return new vscode.Range(start, end);
                    });

                    if (existingRanges !== undefined) {

                        existingRanges.push(...ranges);
                    }
                    else {

                        colorMap.set(color, ranges);
                    }
                }
            }
        }

        for (const [color, decoration] of this.settings.bracketDecorations) {
            if (color === "") {
                continue;
            }
            const ranges = colorMap.get(color);
            editors.forEach((editor) => {
                if (ranges !== undefined) {
                    editor.setDecorations(decoration, ranges);
                }
                else {
                    // We must set non-used colors to an empty array
                    // or previous decorations will not be invalidated
                    editor.setDecorations(decoration, []);
                }
            });
        }

        // console.timeEnd("colorDecorations");
    }

    private calculateColumnFromCharIndex(lineText: string, charIndex: number, tabSize: number): number {
        let spacing = 0;
        for (let index = 0; index < charIndex; index++) {
            if (lineText.charAt(index) === "\t") {
                spacing += tabSize - spacing % tabSize;
            }
            else {
                spacing++;
            }
        }
        return spacing;
    }

    private calculateCharIndexFromColumn(lineText: string, column: number, tabSize: number): number {
        let spacing = 0;
        for (let index = 0; index <= column; index++) {
            if (spacing >= column) {
                return index;
            }
            if (lineText.charAt(index) === "\t") {
                spacing += tabSize - spacing % tabSize;
            }
            else { spacing++; }
        }
        return spacing;
    }
}
