interface ISimpleInternalBracket {
    open: string;
    close: string;
}

export function getRegexForBrackets(input: ISimpleInternalBracket[]): RegExp {
    const longestFirst = input.sort((a, b) => (b.open.length + b.close.length) - (a.open.length + a.close.length));
    const pieces: string[] = [];
    longestFirst.forEach((b) => {
        pieces.push(b.open);
        pieces.push(b.close);
    });
    return createBracketOrRegExp(pieces);
}

export function createBracketOrRegExp(pieces: string[]): RegExp {
    const regexStr = `(${pieces.map(prepareBracketForRegExp).join(")|(")})`;
    return createRegExp(regexStr, true, { global: true });
}

function prepareBracketForRegExp(str: string): string {
    // This bracket pair uses letters like e.g. "begin" - "end"
    const insertWordBoundaries = (/^[\w]+$/.test(str));
    str = escapeRegExpCharacters(str);
    return (insertWordBoundaries ? `\\b${str}\\b` : str);
}

function escapeRegExpCharacters(value: string): string {
    return value.replace(/[\-\\\{\}\*\+\?\|\^\$\.\[\]\(\)\#]/g, "\\$&");
}

function createRegExp(searchString: string, isRegex: boolean, options: RegExpOptions = {}): RegExp {
    if (!searchString) {
        throw new Error("Cannot create regex from empty string");
    }
    if (!isRegex) {
        searchString = escapeRegExpCharacters(searchString);
    }
    if (options.wholeWord) {
        if (!/\B/.test(searchString.charAt(0))) {
            searchString = "\\b" + searchString;
        }
        if (!/\B/.test(searchString.charAt(searchString.length - 1))) {
            searchString = searchString + "\\b";
        }
    }
    let modifiers = "";
    if (options.global) {
        modifiers += "g";
    }
    if (!options.matchCase) {
        modifiers += "i";
    }
    if (options.multiline) {
        modifiers += "m";
    }

    return new RegExp(searchString, modifiers);
}

// tslint:disable-next-line:interface-name
export interface RegExpOptions {
    matchCase?: boolean;
    wholeWord?: boolean;
    multiline?: boolean;
    global?: boolean;
}
