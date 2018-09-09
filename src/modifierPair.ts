export default class ModifierPair {
    public readonly openingCharacter: string;
    public counter = 0;
    public readonly closingCharacter: string;

    constructor(openingCharacter: string, closingCharacter: string, counter?: number) {
        this.openingCharacter = openingCharacter;
        this.closingCharacter = closingCharacter;

        if (counter !== undefined) {
            this.counter = counter;
        }
    }

    public Clone() {
        return new ModifierPair(this.openingCharacter, this.closingCharacter, this.counter);
    }
}
