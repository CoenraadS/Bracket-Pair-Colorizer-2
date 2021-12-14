
---

# 🎄 Christmas Notice ☃️

This project started on 3 Dec 2016. Now 5 years later, it has become a [native feature](https://code.visualstudio.com/blogs/2021/09/29/bracket-pair-colorization) in VSCode. The feature can be enabled by adding the setting `"editor.bracketPairColorization.enabled": true`.

This extension has seen wilder success then I could over ever dreamed of, with over 10M+ downloads.

I'm glad so many people found it useful, however it no longer has a purpose entering 2022 so development will no longer continue.

If you enjoyed it, a coffee donation is appreciated: 

🎁 [Donate](https://ko-fi.com/bracketpaircolorizer) 🎁

Merry Christmas and Happy New Year!

---

## How to enable native bracket matching:

`settings.json`
```
{
    "editor.bracketPairColorization.enabled": true,
    "editor.guides.bracketPairs":"active"
}
```

---

# Bracket Pair Colorizer 2

This extension allows matching brackets to be identified with colours. The user can define which tokens to match, and which colours to use.

Screenshot:  
![Screenshot](images/example.png "Bracket Pair Colorizer")

---

### F.A.Q. 

- Differences between v1 and v2?
    - v2 Uses the same bracket parsing engine as VSCode, greatly increasing speed and accuracy. A new version was released because settings were cleaned up, breaking backwards compatibility.

---

### [Release Notes](CHANGELOG.md)

---

## Settings

> `"bracket-pair-colorizer-2.colors"`  
Define the colors used to colorize brackets. Accepts valid color names, hex codes, and `rgba()` values.
```json
"bracket-pair-colorizer-2.colors": [
    "Gold",
    "Orchid",
    "LightSkyBlue"
]
```

> `"bracket-pair-colorizer-2.forceUniqueOpeningColor"`  
![Disabled](images/forceUniqueOpeningColorDisabled.png "forceUniqueOpeningColor Disabled")
![Enabled](images/forceUniqueOpeningColorEnabled.png "forceUniqueOpeningColor Enabled")

> `"bracket-pair-colorizer-2.forceIterationColorCycle"`  
![Enabled](images/forceIterationColorCycleEnabled.png "forceIterationColorCycle Enabled")

>`"bracket-pair-colorizer-2.colorMode"`  
Consecutive brackets share a color pool for all bracket types  
Independent brackets allow each bracket type to use its own color pool  
![Consecutive](images/consecutiveExample.png "Consecutive Example")
![Independent](images/independentExample.png "Independent Example")

> `"bracket-pair-colorizer-2.highlightActiveScope"`  
Should the currently scoped brackets always be highlighted?

> `"bracket-pair-colorizer-2.activeScopeCSS"`  
Choose a border style to highlight the active scope. Use `{color}` to match the existing bracket color  
It is recommended to disable the inbuilt `editor.matchBrackets` setting if using this feature  
![BorderStyle](images/activeScopeBorder.png "Active Scope Border Example")  

```json
"bracket-pair-colorizer-2.activeScopeCSS": [
    "borderStyle : solid",
    "borderWidth : 1px",
    "borderColor : {color}",
    "opacity: 0.5"
]
```

> `"bracket-pair-colorizer-2.showBracketsInGutter"`  
> Show active scope brackets in the gutter  
![Gutter](images/gutter.png "Gutter Brackets Example") 

> `"bracket-pair-colorizer-2.showBracketsInRuler"`  
> Show active scope brackets in the ruler  

> `"bracket-pair-colorizer-2.rulerPosition"`  
> Decoration position in the ruler

>`"bracket-pair-colorizer-2.showVerticalScopeLine"`  
Show a vertical line between the brackets?  Enabled by default   
![Scope Line](images/no-extra.png "Gutter Brackets Example")  

>`"bracket-pair-colorizer-2.showHorizontalScopeLine"`  
Show a horizontal line between the brackets? Enabled by default   
![Scope Line](images/extra.png "Gutter Brackets Example")  

>`"bracket-pair-colorizer-2.scopeLineRelativePosition"`  
Disable this to show the vertical line in column 0  
![Scope Line](images/no-relative.png "Gutter Brackets Example")  
  
>`"bracket-pair-colorizer-2.scopeLineCSS"`  
Choose a border style to highlight the active scope. Use `{color}` to match the existing bracket color 

```json
"bracket-pair-colorizer-2.scopeLineCSS": [
    "borderStyle : solid",
    "borderWidth : 1px",
    "borderColor : {color}",
    "opacity: 0.5"
]
```

>`"bracket-pair-colorizer-2.excludedLanguages"`  
Exclude a language from being colorized

### Commands

These commands will expand/undo the cursor selection to the next scope

`"bracket-pair-colorizer-2.expandBracketSelection"`  
`"bracket-pair-colorizer-2.undoBracketSelection"`

Quick-start:

```
{
    "key": "shift+alt+right",
    "command": "bracket-pair-colorizer-2.expandBracketSelection",
    "when": "editorTextFocus"
},
{
    "key": "shift+alt+left",
    "command": "bracket-pair-colorizer-2.undoBracketSelection",
    "when": "editorTextFocus"
}
```
