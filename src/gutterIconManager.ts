import { workspace } from "vscode";
import Uri from "vscode-uri/lib/umd";

export default class GutterIconManager {
    private escape = require("escape-html");

    private iconDict = new Map<string, Map<string, Uri>>();
    // tslint:disable-next-line:callable-types
    private disposables = new Array<{ (): void }>();
    private lineHeight: number;
    private fontSize: number;
    private readonly fontFamily: string;

    constructor() {
        this.fontFamily = workspace.getConfiguration("editor").fontFamily;
        this.readEditorLineHeight();
    }

    public Dispose() {
        this.disposables.forEach((callback) => {
            callback();
        });

        this.disposables = [];
    }

    public GetIconUri(bracket: string, color: string): Uri {
        const colorDict = this.iconDict.get(bracket);

        if (colorDict) {
            const uri = colorDict.get(color);
            if (uri) {
                return uri;
            }
            else {
                const newUri = this.createIcon(color, bracket);
                colorDict.set(color, newUri);
                return newUri;
            }
        }
        else {
            const newUri = this.createIcon(color, bracket);
            const dict = new Map<string, Uri>();
            dict.set(color, newUri);
            this.iconDict.set(bracket, dict);
            return newUri;
        }
    }

    private createIcon(color: string, bracket: string): Uri {
        const svg =
            `<svg xmlns="http://www.w3.org/2000/svg" height="${this.lineHeight}" width="${this.lineHeight}">` +
            `<text x="50%" y="50%" fill="${color}" font-family="${this.fontFamily}" font-size="${this.fontSize}" ` +
            `text-anchor="middle" dominant-baseline="middle">` +
            `${this.escape(bracket)}` +
            `</text>` +
            `</svg>`;

        const encodedSVG = encodeURIComponent(svg);

        const URI = "data:image/svg+xml;utf8," + encodedSVG;

        return Uri.parse(URI);
    }

    private readEditorLineHeight() {
        const MINIMUM_LINE_HEIGHT = 8;
        const MAXIMUM_LINE_HEIGHT = 150;
        const GOLDEN_LINE_HEIGHT_RATIO = (process.platform === "darwin") ? 1.5 : 1.35;

        const editorConfig = workspace.getConfiguration("editor", null);
        const fontSize = editorConfig.get("fontSize") as number;
        const configuredLineHeight = editorConfig.get("lineHeight") as number;

        function clamp(n: number, min: number, max: number) {
            if (n < min) {
                return min;
            }
            if (n > max) {
                return max;
            }
            return n;
        }

        function safeParseInt(n: number | string, defaultValue: number) {
            if (typeof n === "number") {
                return Math.round(n);
            }
            const r = parseInt(n, 10);
            if (isNaN(r)) {
                return defaultValue;
            }
            return r;
        }

        let lineHeight = safeParseInt(configuredLineHeight, 0);
        lineHeight = clamp(lineHeight, 0, MAXIMUM_LINE_HEIGHT);
        if (lineHeight === 0) {
            lineHeight = Math.round(GOLDEN_LINE_HEIGHT_RATIO * fontSize);
        } else if (lineHeight < MINIMUM_LINE_HEIGHT) {
            lineHeight = MINIMUM_LINE_HEIGHT;
        }
        this.lineHeight = lineHeight;
        this.fontSize = Math.ceil(fontSize * (2/3));
    }
}
