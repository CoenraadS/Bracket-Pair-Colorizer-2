export interface IExtensionGrammar {
    language?: string;
    scopeName?: string;
    path?: string;
}

export interface IExtensionPackage {
    contributes?: {
        // tslint:disable-next-line:array-type
        languages?: {
            id: string;
            configuration: string;
        }[];
        grammars?: IExtensionGrammar[];
    };
}

export interface IGrammar {
    /**
     * Tokenize `lineText` using previous line state `prevState`.
     */
    tokenizeLine(lineText: string, prevState?: IStackElement): ITokenizeLineResult;
    tokenizeLine2(lineText: string, prevState?: IStackElement): ITokenizeLineResult2;
}

export interface ITokenizeLineResult2 {
    /**
     * The tokens in binary format. Each token occupies two array indices. For token i:
     *  - at offset 2*i => startIndex
     *  - at offset 2*i + 1 => metadata
     *
     */
    readonly tokens: Uint32Array;
    /**
     * The `prevState` to be passed on to the next line tokenization.
     */
    readonly ruleStack: IStackElement;
}

export interface IStackElement {
    _stackElementBrand: void;
    readonly depth: number;
    clone(): IStackElement;
    equals(other: IStackElement): boolean;
}

export interface ITokenizeLineResult {
    readonly tokens: IToken[];
    /**
     * The `prevState` to be passed on to the next line tokenization.
     */
    readonly ruleStack: IStackElement;
}

export interface IToken {
    startIndex: number;
    readonly endIndex: number;
    readonly scopes: string[];
}
