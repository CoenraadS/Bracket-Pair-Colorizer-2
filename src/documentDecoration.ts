import * as vscode from "vscode";
import Bracket from "./bracket";
import BracketClose from "./bracketClose";
import { IStackElement } from "./IExtensionGrammar";
import LanguageConfig from "./languageConfig";
import LineState from "./lineState";
import Settings from "./settings";
import TextLine from "./textLine";
import { ignoreBracketsInToken, LineTokens } from "./vscodeFiles";
import { TextDocumentContentChangeEvent } from "vscode";
import { createBracketOrRegExp } from "./bracketUtil";

type Match = { content: string, index: number };

export default class DocumentDecoration {
    public readonly settings: Settings;

    // This program caches lines, and will only analyze linenumbers including or above a modified line
    private lines: TextLine[] = [];
    private readonly document: vscode.TextDocument;
    private readonly languageConfig: LanguageConfig;
    private scopeDecorations: vscode.TextEditorDecorationType[] = [];
    private scopeSelectionHistory: vscode.Selection[][] = [];

    constructor(
        document: vscode.TextDocument,
        config: LanguageConfig,
        settings: Settings,
    ) {
        this.settings = settings;
        this.document = document;
        this.languageConfig = config;
    }

    public dispose() {
        this.disposeScopeDecorations();
    }

    public onDidChangeTextDocument(contentChanges: ReadonlyArray<TextDocumentContentChangeEvent>) {
        if (contentChanges.length > 1 || !contentChanges[0].range.isSingleLine || contentChanges[0].text.length > 1) {
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

        const lineNumber = change.range.start.line;
        // Parse overlapped lines with goal to see if we can avoid document reparse
        // By just moving existing brackets if the amount of brackets on a line didn't change
        const newLine = this.tokenizeLine(lineNumber);
        const currentLine = this.lines[lineNumber];

        // Current line has new brackets which need to be colored
        if (
            !currentLine.getRuleStack().equals(newLine.getRuleStack()) ||
            currentLine.getBracketHash() !== newLine.getBracketHash()
        ) {
            this.lines[lineNumber] = newLine;
            this.lines.splice(lineNumber + 1);
            this.tokenizeDocument();
            return;
        }

        const charOffset = change.text.length - change.rangeLength;
        currentLine.offset(change.range.start.character, charOffset);
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

            const start = endBracket.openBracket.token.range.start.translate(0, 1);
            const end = endBracket.token.range.end.translate(0, -1);
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
    public getLine(index: number, state: IStackElement): TextLine {
        if (index < this.lines.length) {
            return this.lines[index];
        }
        else {
            if (this.lines.length === 0) {
                this.lines.push(
                    new TextLine(state, new LineState(this.settings, this.languageConfig), 0),
                );
            }

            if (index < this.lines.length) {
                return this.lines[index];
            }

            if (index === this.lines.length) {
                const previousLine = this.lines[this.lines.length - 1];
                const newLine =
                    new TextLine(state, previousLine.cloneState(), index);

                this.lines.push(newLine);
                return newLine;
            }

            throw new Error("Cannot look more than one line ahead");
        }
    }

    public tokenizeDocument() {
        // console.log("Tokenizing " + this.document.fileName);

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
            // console.log("Reparse from line: " + (lineIndex + 1));
            for (let i = lineIndex; i < lineCount; i++) {
                const newLine = this.tokenizeLine(i);
                this.lines.push(newLine);
            }
        }

        // console.log("Coloring document");
        this.colorDecorations(editors);

        // console.timeEnd("tokenizeDocument");
    }

    public updateScopeDecorations(event: vscode.TextEditorSelectionChangeEvent) {
        // console.time("updateScopeDecorations");

        this.disposeScopeDecorations();

        // For performance reasons we only do one selection for now.
        // Simply wrap in foreach selection for multicursor, maybe put it behind an option?
        const selection = event.textEditor.selection;

        const closeBracket = this.searchScopeForwards(selection.active);
        if (!closeBracket) {
            return;
        }

        const openBracket = closeBracket.openBracket;
        const beginRange = openBracket.token.range;
        const endRange = closeBracket.token.range;
        const startLineIndex = openBracket.token.range.start.line;
        const endLineIndex = closeBracket.token.range.start.line;

        if (this.settings.highlightActiveScope) {
            const decoration =
                this.settings.createScopeBracketDecorations(closeBracket.color);
            event.textEditor.setDecorations(decoration, [beginRange, endRange]);
            this.scopeDecorations.push(decoration);
        }

        if (this.settings.showBracketsInGutter) {
            if (startLineIndex === endLineIndex) {
                const decoration = this.settings.createGutterBracketDecorations
                    (closeBracket.color, openBracket.token.character + closeBracket.token.character);
                event.textEditor.setDecorations(decoration, [beginRange, endRange]);
                this.scopeDecorations.push(decoration);
            }
            else {
                const decorationOpen =
                    this.settings.createGutterBracketDecorations(openBracket.color, openBracket.token.character);
                event.textEditor.setDecorations(decorationOpen, [beginRange]);
                this.scopeDecorations.push(decorationOpen);
                const decorationClose =
                    this.settings.createGutterBracketDecorations(closeBracket.color, closeBracket.token.character);
                event.textEditor.setDecorations(decorationClose, [endRange]);
                this.scopeDecorations.push(decorationClose);
            }
        }

        if (this.settings.showBracketsInRuler) {
            const decoration =
                this.settings.createRulerBracketDecorations(closeBracket.color);
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
            this.setVerticalLineDecoration(closeBracket, event, safeFallbackPosition, verticalLineRanges);
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
                this.setUnderLineDecoration(closeBracket, event, underlineLineRanges);
            }

            if (overlineLineRanges) {
                this.setOverLineDecoration(closeBracket, event, overlineLineRanges);
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
            new LineState(this.settings, this.languageConfig);

        const tokenized = this.languageConfig.grammar.tokenizeLine2(newText, previousLineRuleStack);
        const tokens = tokenized.tokens;
        const lineTokens = new LineTokens(tokens, newText);

        const matches = new Array<Match>();
        const htmlMatches = { open: new Array<Match>(), close: new Array<Match>(), ignore: new Array<Match>() };

        const count = lineTokens.getCount();
        for (let i = 0; i < count; i++) {
            const tokenType = lineTokens.getStandardTokenType(i);
            if (!ignoreBracketsInToken(tokenType)) {
                const searchStartOffset = tokens[i * 2];
                const searchEndOffset = i < count ? tokens[(i + 1) * 2] : newText.length;

                const currentTokenText = newText.substring(searchStartOffset, searchEndOffset);

                this.pushMatches(currentTokenText, this.languageConfig.regex, searchStartOffset, matches);
                if (this.languageConfig.colorHtmlStyleTags) {
                    this.pushMatches(
                        currentTokenText, createBracketOrRegExp(["</", "/>"]), searchStartOffset, htmlMatches.close
                    );
                    this.pushMatches(
                        currentTokenText, createBracketOrRegExp(["<"]), searchStartOffset, htmlMatches.open
                    );
                    this.pushMatches(
                        currentTokenText,
                        createBracketOrRegExp(
                            this.settings.htmlIgnoredTags.map((value: string) => { return "<" + value })
                        ), searchStartOffset, htmlMatches.ignore
                    );
                }
            }
        }

        // Filter out the overlap between the open tags and the other tags
        //      (also protects against a potential <> in languageConfig)
        const htmlCloseIgnoreIndexes = matches.concat(htmlMatches.close, htmlMatches.ignore)
            .map((value: { index: number }) => { return value.index });
        htmlMatches.open = htmlMatches.open.filter(function (value: { index: number }) {
            return htmlCloseIgnoreIndexes.indexOf(value.index) == -1
        });

        // Collate all matches
        let tokensToAdd = new Array<{ content: string, index: number, key: number, open: boolean }>();
        for (const match of matches) {
            const lookup = this.languageConfig.bracketToId.get(match.content);
            if (lookup) {
                tokensToAdd.push({ content: match.content, index: match.index, key: lookup.key, open: lookup.open });
            }
        }
        tokensToAdd = tokensToAdd.concat(
            htmlMatches.open.map((match: Match) => {
                return { content: match.content, index: match.index, key: this.languageConfig.htmlKey, open: true }
            }),
            htmlMatches.close.map((match: Match) => {
                return { content: match.content, index: match.index, key: this.languageConfig.htmlKey, open: false }
            })
        );

        // Force index order so that the bracket stack is created correctly
        tokensToAdd.sort((a, b) => a.index - b.index);

        const newLine = new TextLine(tokenized.ruleStack, previousLineState, index);
        for (const token of tokensToAdd) {
            newLine.AddToken(token.content, token.index, token.key, token.open);
        }

        return newLine;
    }

    private pushMatches(text: string, regex: RegExp, indexOffset: number, matches: Array<Match>) {
        let result: RegExpExecArray | null;
        // tslint:disable-next-line:no-conditional-assignment
        while ((result = regex.exec(text)) !== null) {
            matches.push({ content: result[0], index: result.index + indexOffset });
        }
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
        verticalLineRanges: Array<{ range: vscode.Range, valid: boolean }>,
    ) {
        const offsets:
            Array<{ range: vscode.Range, downOffset: number }> = [];
        const normalDecoration = this.settings.createScopeLineDecorations(bracket.color, false, false, false, true);

        if (verticalLineRanges.length === 0) {
            return;
        }

        const normalRanges = verticalLineRanges.filter((e) => e.valid).map((e) => e.range);

        // Get first valid range, if non fall-back to opening position
        let aboveValidRange = new vscode.Range(fallBackPosition, fallBackPosition);
        for (const lineRange of verticalLineRanges) {
            if (lineRange.valid) {
                aboveValidRange = lineRange.range;
                break;
            }
        }

        /* Keep updating last valid range to keep offset distance minimum
         to prevent missing decorations when scrolling */
        for (const lineRange of verticalLineRanges) {
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

    private colorDecorations(editors: vscode.TextEditor[]) {
        // console.time("colorDecorations");
        const colorMap = new Map<string, vscode.Range[]>();

        // Reduce all the colors/ranges of the lines into a singular map
        for (const line of this.lines) {
            {
                const brackets = line.getAllBrackets();
                for (const bracket of brackets) {
                    const existingRanges = colorMap.get(bracket.color);
                    if (existingRanges !== undefined) {

                        existingRanges.push(bracket.token.range);
                    }
                    else {

                        colorMap.set(bracket.color, [bracket.token.range]);
                    }
                }
            }
        }

        for (const [color, decoration] of this.settings.bracketDecorations) {
            if (color === "") {
                continue;
            }
            const ranges = colorMap.get(color);
            for (const editor of editors) {
                if (ranges !== undefined) {
                    editor.setDecorations(decoration, ranges);
                }
                else {
                    // We must set non-used colors to an empty array
                    // or previous decorations will not be invalidated
                    editor.setDecorations(decoration, []);
                }
            }
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
