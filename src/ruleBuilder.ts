import DefinitionAfterInheritance from "./definitionAfterInheritance";
import LanguageDefinition from "./languageDefinition";
import ScopePair from "./scopePair";
import ScopeSingle, { ScopeType } from "./scopeSingle";

export class RuleBuilder {
    private readonly start = new Map<string, LanguageDefinition>();
    private readonly intermediate = new Map<string, DefinitionAfterInheritance>();
    private readonly final = new Map<string, Map<string, ScopeSingle>>();

    constructor(languageDefinitions: LanguageDefinition[]) {
        for (const userLanguage of languageDefinitions) {
            this.start.set(userLanguage.language, userLanguage);
        }
    }

    public get(languageId: string): Map<string, ScopeSingle> | undefined {
        const stackResult = this.final.get(languageId);
        if (stackResult) {
            return stackResult;
        }

        const baseLanguage = this.start.get(languageId);

        if (!baseLanguage) {
            return;
        }

        const history = new Set<LanguageDefinition>();
        const scopesThisToBase = this.getAllScopes(baseLanguage, [], history);

        const scopeMap = new Map<string, ScopePair>();

        // Set base map first then let extended languages overwrite
        for (let i = scopesThisToBase.length; i-- > 0;) {
            for (const scope of scopesThisToBase[i]) {
                if (!scope.open) {
                    console.error("Missing 'open' property");
                    console.error(scope);
                    continue;
                }

                scopeMap.set(scope.open, scope);
            }
        }

        const extendedLanguage = new DefinitionAfterInheritance(baseLanguage.language, scopeMap);

        this.intermediate.set(extendedLanguage.language, extendedLanguage);

        const tokens = new Map<string, ScopeSingle>();
        for (const scope of scopeMap.values()) {
            if (!scope.open) {
                console.error("Missing 'open' property");
                console.error(scope);
                continue;
            }

            if (scope.open && scope.close) {
                if (scope.close === scope.open) {
                    throw new Error("Open and close scopes are the same: " + scope.open);
                }

                const open = new ScopeSingle(scope.open, ScopeType.Open, scope.open);
                tokens.set(open.tokenName, open);

                const close = new ScopeSingle(scope.close, ScopeType.Close, scope.open);
                tokens.set(close.tokenName, close);
            }
            else {
                const ambiguous = new ScopeSingle(scope.open, ScopeType.Ambiguous, scope.open);
                tokens.set(ambiguous.tokenName, ambiguous);
            }
        }

        this.final.set(languageId, tokens);
        return tokens;
    }

    private getAllScopes(
        userLanguageDefinition: LanguageDefinition,
        allScopeDefinitions: ScopePair[][],
        history: Set<LanguageDefinition>): ScopePair[][] {
        if (history.has(userLanguageDefinition)) {
            console.error("Cycle detected while parsing user languages: " +
                userLanguageDefinition.language + " => " +
                [...history.values()]);
            return allScopeDefinitions;
        }

        history.add(userLanguageDefinition);

        if (userLanguageDefinition.scopes) {
            allScopeDefinitions.push(userLanguageDefinition.scopes);
        }

        if (userLanguageDefinition.extends) {
            const parsedLanguage = this.intermediate.get(userLanguageDefinition.extends);

            if (parsedLanguage) {
                allScopeDefinitions.push([...parsedLanguage.scopes.values()]);
                return allScopeDefinitions;
            }

            const unParsedLanguage = this.start.get(userLanguageDefinition.extends);
            if (unParsedLanguage) {
                this.getAllScopes(unParsedLanguage, allScopeDefinitions, history);
            }
            else {
                console.error("Could not find user defined language: " + userLanguageDefinition.extends);
            }
        }

        return allScopeDefinitions;
    }
}
