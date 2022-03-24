
---

# 🎄 Christmas Notice ☃️

### This project started on 3 Dec 2016. Now 5 years later, it has become a native feature in VSCode.

### This extension has seen wilder success then I could over ever dreamed of, with over 10M+ downloads.

### However since native functionality is available, it's time to deprecate this extension

### If you enjoyed it, a coffee donation is appreciated:
### Merry Christmas and Happy New Year!

# 🎁 [Donate](https://ko-fi.com/bracketpaircolorizer) 🎁


## How to enable native bracket matching:

`settings.json`
```
{
    "editor.bracketPairColorization.enabled": true,
    "editor.guides.bracketPairs":"active"
}
```

---

## Release Notes

### 0.2.3
Deprecate extension even more
- Append [Deprecated] to extension name
- Add ability to migrate to native coloring with single click

### 0.2.2
Deprecate extension

### 0.2.1
Change activation event to `onStartupFinished` for better performance

### 0.1.5

Remove logging

### 0.1.3

Work with VSCode v1.45.0

### 0.0.29

Allow extension to work with remove development

### 0.0.28

Fix background opacity

### 0.0.27

Support VSCode Theme Colors (except in gutters)

e.g.

```
"bracket-pair-colorizer-2.scopeLineCSS": [
		"borderStyle : dotted",
		"borderWidth : 1px",
		"borderColor : activityBarBadge.background",
	]
```

### 0.0.26

Support new extensions being installed without reload

### 0.0.25

Fix regex to search for longest match first

### 0.0.24

Fix extension creating a regex that matches everything if no brackets were defined

### 0.0.23

Remove matching `<>` for all languages because too many false positives

### 0.0.22

Ensure that an extension that contributes brackets also contributes a grammar

### 0.0.21

Add unmatched bracket coloring  
Restore option to use independent color groups

### 0.0.20

Support reading language configuration json files with comments

### 0.0.19

Restore only matching bracket scopes when inside of the scope

### 0.0.18

Be more aggresive with recoloring to prevent mismatches

### 0.0.17

Fix coloring offset being wrong following a string/comment/regex

### 0.0.16

Fix nested coloring being broken

### 0.0.13

Leverage VSCode for automagical bracket support

### 0.0.12

Fix colors sometimes being incorrect after text replacement #3

### 0.0.11

Fix colors sometimes being incorrect after text replacement #2

### 0.0.10

JSON with comments support  
Go support  
Fix colors sometimes being incorrect after text replacement

### 0.0.9

C# support hotfix

### 0.0.8

Fix gutter icons showing only closing brackets

### 0.0.7

Clojure support hotfix

### 0.0.6

Clojure support

### 0.0.5

PHP support  
Fix switch statements breaking Typescript brackets

### 0.0.4

PowerShell support

### 0.0.3

Fix loading languages where file extension differs from language id

### 0.0.1

Initial release
