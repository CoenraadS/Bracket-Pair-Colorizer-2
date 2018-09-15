import DefinitionAfterInheritance from "./definitionAfterInheritance";
import LanguageDefinition from "./languageDefinition";
import ScopeDefinition from "./scopeDefinition";

export class RuleBuilder {
    private readonly start = new Map<string, LanguageDefinition>();
    private readonly intermediate = new Map<string, DefinitionAfterInheritance>();
    private readonly final = new Map<string, Map<string, ScopeDefinition>>();

    constructor(languageDefinitions: LanguageDefinition[]) {
        for (const userLanguage of languageDefinitions) {
            this.start.set(userLanguage.language, userLanguage);
        }
    }

    public get(languageId: string): Map<string, ScopeDefinition> | undefined {
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

        const scopeMap = new Map<string, ScopeDefinition>();

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

        const tokens = new Map<string, ScopeDefinition>();
        for (const scope of scopeMap.values()) {
            if (!scope.open) {
                console.error("Missing 'open' property");
                console.error(scope);
                continue;
            }

            tokens.set(scope.open, scope);

            if (scope.close) {
                if (scope.close === scope.open) {
                    console.warn("Open and close scopes are the same: " + scope.open);
                }
                tokens.set(scope.close, scope);
            }
        }
        this.final.set(languageId, tokens);
        return tokens;
    }

    private getAllScopes(
        userLanguageDefinition: LanguageDefinition,
        allScopeDefinitions: ScopeDefinition[][],
        history: Set<LanguageDefinition>): ScopeDefinition[][] {
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
