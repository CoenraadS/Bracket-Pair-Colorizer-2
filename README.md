# Bracket Pair Colorizer

This extension allows matching brackets to be identified with colours. The user can define which tokens to match, and which colours to use.

Screenshot:  
![Screenshot](images/example.png "Bracket Pair Colorizer")

-----------------------------------------------------------------------------------------------------------
## [Release Notes](CHANGELOG.md)

## Settings

> `"bracketPairColorizer.forceUniqueOpeningColor"`  
![Disabled](images/forceUniqueOpeningColorDisabled.png "forceUniqueOpeningColor Disabled")
![Enabled](images/forceUniqueOpeningColorEnabled.png "forceUniqueOpeningColor Enabled")

> `"bracketPairColorizer.forceIterationColorCycle"`  
![Enabled](images/forceIterationColorCycleEnabled.png "forceIterationColorCycle Enabled")

<!-- >`"bracketPairColorizer.colorMode"`  
Consecutive brackets share a color pool for all bracket types  
Independent brackets allow each bracket type to use its own color pool  
![Consecutive](images/consecutiveExample.png "Consecutive Example")
![Independent](images/independentExample.png "Independent Example") -->

> `"bracketPairColorizer.highlightActiveScope"`  
Should the currently scoped brackets always be highlighted?

> `"bracketPairColorizer.activeScopeCSS"`  
Choose a border style to highlight the active scope. Use `{color}` to match the existing bracket color  
It is recommended to disable the inbuilt `editor.matchBrackets` setting if using this feature  
![BorderStyle](images/activeScopeBorder.png "Active Scope Border Example")  
>Tip: Add the value `"backgroundColor : {color}"` to increase visibility  
![BorderBackground](images/activeScopeBackground.png "Active Scope Background Example")

> `"bracketPairColorizer.showBracketsInGutter"`  
> Show active scope brackets in the gutter  
![Gutter](images/gutter.png "Gutter Brackets Example") 

> `"bracketPairColorizer.showBracketsInRuler"`  
> Show active scope brackets in the ruler  

> `"bracketPairColorizer.rulerPosition"`  
> Decoration position in the ruler

>`"bracketPairColorizer.showVerticalScopeLine"`  
Show a vertical line between the brackets?  Enabled by default   
![Scope Line](images/no-extra.png "Gutter Brackets Example")  

>`"bracketPairColorizer.showHorizontalScopeLine"`  
Show a horizontal line between the brackets? Enabled by default   
![Scope Line](images/extra.png "Gutter Brackets Example")  

>`"bracketPairColorizer.scopeLineRelativePosition"`  
Disable this to show the vertical line in column 0  
![Scope Line](images/no-relative.png "Gutter Brackets Example")  
  
>`"bracketPairColorizer.scopeLineCSS"`  
Choose a border style to highlight the active scope. Use `{color}` to match the existing bracket color 

### Commands

These commands will expand/undo the cursor selection to the next scope

`"bracket-pair-colorizer.expandBracketSelection"`  
`"bracket-pair-colorizer.undoBracketSelection"`

Quick-start:

```
{
    "key": "shift+alt+right",
    "command": "bracket-pair-colorizer.expandBracketSelection",
    "when": "editorTextFocus"
},
{
    "key": "shift+alt+left",
    "command": "bracket-pair-colorizer.undoBracketSelection",
    "when": "editorTextFocus"
}
```