import * as vscode from "vscode";
import ColorMode from "./colorMode";
import Colors from "./colors";
import GutterIconManager from "./gutterIconManager";
import TextMateLoader from "./textMateLoader";

export default class Settings {
    public readonly TextMateLoader = new TextMateLoader();
    public readonly bracketDecorations: Map<string, vscode.TextEditorDecorationType>;
    public readonly colorMode: ColorMode;
    public readonly contextualParsing: boolean;
    public readonly forceIterationColorCycle: boolean;
    public readonly forceUniqueOpeningColor: boolean;
    public readonly regexNonExact: RegExp;
    public readonly timeOutLength: number;
    public readonly highlightActiveScope: boolean;
    public readonly showVerticalScopeLine: boolean;
    public readonly showHorizontalScopeLine: boolean;
    public readonly showBracketsInGutter: boolean;
    public readonly showBracketsInRuler: boolean;
    public readonly scopeLineRelativePosition: boolean;
    public readonly colors: string[];
    public readonly unmatchedScopeColor: string;
    public readonly excludedLanguages: Set<string>;
    public isDisposed = false;
    private readonly gutterIcons: GutterIconManager;
    private readonly activeBracketCSSElements: string[][];
    private readonly activeScopeLineCSSElements: string[][];
    private readonly activeScopeLineCSSBorder: string;
    private readonly rulerPosition: string;
    constructor(
    ) {
        this.gutterIcons = new GutterIconManager();

        const configuration = vscode.workspace.getConfiguration("bracket-pair-colorizer-2", undefined);
        const activeScopeCSS = configuration.get("activeScopeCSS") as string[];

        if (!Array.isArray(activeScopeCSS)) {
            throw new Error("activeScopeCSS is not an array");
        }

        this.activeBracketCSSElements = activeScopeCSS.map((e) =>
            [e.substring(0, e.indexOf(":")).trim(),
            e.substring(e.indexOf(":") + 1).trim()]);

        const scopeLineCSS = configuration.get("scopeLineCSS") as string[];

        if (!Array.isArray(scopeLineCSS)) {
            throw new Error("scopeLineCSS is not an array");
        }

        this.activeScopeLineCSSElements = scopeLineCSS.map((e) =>
            [e.substring(0, e.indexOf(":")).trim(),
            e.substring(e.indexOf(":") + 1).trim()]);

        const borderStyle = this.activeScopeLineCSSElements.filter((e) => e[0] === "borderStyle");
        if (borderStyle && borderStyle[0].length === 2) {
            this.activeScopeLineCSSBorder = borderStyle[0][1];
        }
        else {
            this.activeScopeLineCSSBorder = "none";
        }

        this.highlightActiveScope = configuration.get("highlightActiveScope") as boolean;

        if (typeof this.highlightActiveScope !== "boolean") {
            throw new Error("alwaysHighlightActiveScope is not a boolean");
        }

        this.showVerticalScopeLine = configuration.get("showVerticalScopeLine") as boolean;

        if (typeof this.showVerticalScopeLine !== "boolean") {
            throw new Error("showVerticalScopeLine is not a boolean");
        }

        this.showHorizontalScopeLine = configuration.get("showHorizontalScopeLine") as boolean;

        if (typeof this.showHorizontalScopeLine !== "boolean") {
            throw new Error("showHorizontalScopeLine is not a boolean");
        }

        this.scopeLineRelativePosition = configuration.get("scopeLineRelativePosition") as boolean;

        if (typeof this.scopeLineRelativePosition !== "boolean") {
            throw new Error("scopeLineRelativePosition is not a boolean");
        }

        this.showBracketsInGutter = configuration.get("showBracketsInGutter") as boolean;

        if (typeof this.showBracketsInGutter !== "boolean") {
            throw new Error("showBracketsInGutter is not a boolean");
        }

        this.showBracketsInRuler = configuration.get("showBracketsInRuler") as boolean;

        if (typeof this.showBracketsInRuler !== "boolean") {
            throw new Error("showBracketsInRuler is not a boolean");
        }

        this.rulerPosition = configuration.get("rulerPosition") as string;

        if (typeof this.rulerPosition !== "string") {
            throw new Error("rulerPosition is not a string");
        }

        this.unmatchedScopeColor = configuration.get("unmatchedScopeColor") as string;

        if (typeof this.unmatchedScopeColor !== "string") {
            throw new Error("unmatchedScopeColor is not a string");
        }

        this.forceUniqueOpeningColor = configuration.get("forceUniqueOpeningColor") as boolean;

        if (typeof this.forceUniqueOpeningColor !== "boolean") {
            throw new Error("forceUniqueOpeningColor is not a boolean");
        }

        this.forceIterationColorCycle = configuration.get("forceIterationColorCycle") as boolean;

        if (typeof this.forceIterationColorCycle !== "boolean") {
            throw new Error("forceIterationColorCycle is not a boolean");
        }

        this.colorMode = (ColorMode as any)[configuration.get("colorMode") as string];

        if (typeof this.colorMode !== "number") {
            throw new Error("colorMode enum could not be parsed");
        }

        this.colors = configuration.get("colors") as string[];
        if (!Array.isArray(this.colors)) {
            throw new Error("colors is not an array");
        }

        this.bracketDecorations = this.createBracketDecorations();

        const excludedLanguages = configuration.get("excludedLanguages") as string[];

        if (!Array.isArray(excludedLanguages)) {
            throw new Error("excludedLanguages is not an array");
        }

        this.excludedLanguages = new Set(excludedLanguages);
    }

    public dispose() {
        if (!this.isDisposed) {
            this.bracketDecorations.forEach((decoration) => {
                decoration.dispose();
            });
            this.bracketDecorations.clear();
            this.gutterIcons.Dispose();
            this.isDisposed = true;
        }
    }

    public createGutterBracketDecorations(color: string, bracket: string) {
        const gutterIcon = this.gutterIcons.GetIconUri(bracket, color);
        const decorationSettings: vscode.DecorationRenderOptions = {
            gutterIconPath: gutterIcon,
        };
        const decoration = vscode.window.createTextEditorDecorationType(decorationSettings);
        return decoration;
    }

    public createRulerBracketDecorations(color: string) {
        const decorationSettings: vscode.DecorationRenderOptions = {
            overviewRulerColor: color,
            overviewRulerLane: vscode.OverviewRulerLane[this.rulerPosition],
        };
        const decoration = vscode.window.createTextEditorDecorationType(decorationSettings);
        return decoration;
    }

    public createScopeBracketDecorations(color: string) {
        const decorationSettings: vscode.DecorationRenderOptions = {
            rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
        };

        this.activeBracketCSSElements.forEach((element) => {
            decorationSettings[element[0]] = element[1].replace("{color}", color);
        });

        const decoration = vscode.window.createTextEditorDecorationType(decorationSettings);
        return decoration;
    }

    public createScopeLineDecorations(
        color: string, top = true, right = true, bottom = true, left = true, yOffset?: number) {
        const decorationSettings: vscode.DecorationRenderOptions = {
            rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
        };

        const none = "none";
        const topBorder = top ? this.activeScopeLineCSSBorder : none;
        const rightBorder = right ? this.activeScopeLineCSSBorder : none;
        const botBorder = bottom ? this.activeScopeLineCSSBorder : none;
        const leftBorder = left ? this.activeScopeLineCSSBorder : none;

        for (const element of this.activeScopeLineCSSElements) {
            if (element[0].includes("Color")) {
                const colorElement = element[1].replace("{color}", color);
                if (!colorElement.includes("rgb") && colorElement.includes("opacity")) {
                    const colorSplit = colorElement.split(";");
                    const opacitySplit = colorSplit[1].split(":");
                    if (colorSplit[0].includes("#")) {
                        const rgb = Colors.hex2rgb(colorSplit[0]);
                        if (rgb) {
                            const rbgaString = `rgba(${rgb.r},${rgb.g},${rgb.b},${opacitySplit[1]});`;
                            decorationSettings[element[0]] = rbgaString;
                        }
                    }
                    else { // Assume css color
                        const rgb = Colors.name2rgb(colorSplit[0]);
                        if (rgb) {
                            const rbgaString = `rgba(${rgb.r},${rgb.g},${rgb.b},${opacitySplit[1]});`;
                            decorationSettings[element[0]] = rbgaString;
                        }
                    }
                }
                else {
                    decorationSettings[element[0]] = colorElement;
                }
            }
            else {
                decorationSettings[element[0]] = element[1];
            }
        }

        let borderStyle = `${topBorder} ${rightBorder} ${botBorder} ${leftBorder}`;

        if (yOffset !== undefined && yOffset !== 0) {
            borderStyle += "; transform: translateY(" + yOffset * 100 + "%); z-index: 1;";
        }

        // tslint:disable-next-line:no-string-literal
        decorationSettings["borderStyle"] = borderStyle;

        const decoration = vscode.window.createTextEditorDecorationType(decorationSettings);
        return decoration;
    }

    private createBracketDecorations(): Map<string, vscode.TextEditorDecorationType> {
        const decorations = new Map<string, vscode.TextEditorDecorationType>();

        for (const color of this.colors) {
            const decoration = vscode.window.createTextEditorDecorationType({
                color, rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
            });
            decorations.set(color, decoration);
        }

        const unmatchedDecoration = vscode.window.createTextEditorDecorationType({
            color: this.unmatchedScopeColor, rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
        });
        decorations.set(this.unmatchedScopeColor, unmatchedDecoration);

        return decorations;
    }
}
