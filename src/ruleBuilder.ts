import BasicDefinition from "./basicDefinition";
import DefinitionAfterInheritance from "./definitionAfterInheritance";
import ScopeDefinition from "./scopeDefinition";
import TokenMatch from "./tokenMatch";

export class RuleBuilder {
    private readonly start = new Map<string, BasicDefinition>();
    private readonly intermediate = new Map<string, DefinitionAfterInheritance>();
    private readonly final = new Map<string, TokenMatch[]>();

    constructor(languageDefinitions: BasicDefinition[]) {
        for (const userLanguage of languageDefinitions) {
            this.start.set(userLanguage.language, userLanguage);
        }
    }

    public get(languageId: string) {
        const stackResult = this.final.get(languageId);
        if (stackResult) {
            return stackResult;
        }

        const baseLanguage = this.start.get(languageId);

        if (baseLanguage) {
            const history = new Set<BasicDefinition>();
            const scopesThisToBase = this.getAllScopes(baseLanguage, [], history);

            const scopeMap = new Map<string, ScopeDefinition>();

            // Set base map first then let extended languages overwrite
            for (let i = scopesThisToBase.length; i-- > 0;) {
                for (const scope of scopesThisToBase[i]) {
                    if (!scope.startsWith) {
                        console.error("Missing 'startsWith' property");
                        console.error(scope);
                        continue;
                    }

                    scopeMap.set(scope.startsWith, scope);
                }
            }

            const extendedLanguage = new DefinitionAfterInheritance(baseLanguage.language, scopeMap);

            this.intermediate.set(extendedLanguage.language, extendedLanguage);

            const tokens: TokenMatch[] = [];
            for (const scope of scopeMap.values()) {
                if (!scope.startsWith) {
                    console.error("Missing 'startsWith' property");
                    console.error(scope);
                    continue;
                }

                const depth = scope.depth || 0;
                if (scope.openSuffix && scope.closeSuffix) {
                    tokens.push(
                        new TokenMatch(
                            depth,
                            !!scope.disabled,
                            !!scope.openAndCloseCharactersAreTheSame,
                            scope.startsWith,
                            scope.openSuffix,
                        ),
                        new TokenMatch(
                            depth,
                            !!scope.disabled,
                            !!scope.openAndCloseCharactersAreTheSame,
                            scope.startsWith,
                            scope.closeSuffix,
                        ),
                    );
                }
                else {
                    tokens.push(
                        new TokenMatch(
                            depth,
                            !!scope.disabled,
                            !!scope.openAndCloseCharactersAreTheSame,
                            scope.startsWith,
                        ),
                    );
                }
            }

            this.final.set(languageId, tokens);
            return tokens;
        }

        return this.final.get("default");
    }

    private getAllScopes(
        userLanguageDefinition: BasicDefinition,
        allScopeDefinitions: ScopeDefinition[][],
        history: Set<BasicDefinition>): ScopeDefinition[][] {
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
