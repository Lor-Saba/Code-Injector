<img src="http://www.spazioseme.com/wp-content/uploads/2016/08/work_in_progress-350x345.jpg" style="width: 350px; height: 345px;">

# Web-Injector
A [WebExtensions](https://developer.mozilla.org/en-US/Add-ons/WebExtensions) based addon which let the user inject code into the websites

> This is an add-on which requires a minimum of knowledge of web programming to be able to properly use it.

## Purpose

There are several sites with invasive popups / login screens, a messy layout or some missing capabilities.  
I was usually getting around these boring stuff by opening the browser console to edit the DOM style and structure but it was starting to get tiring doing it everytime, so why not making and extension which do it by itself in background?

## Injection flow

The injection starts when the DOM content has been loaded.  
>At this point the document is loaded and parsed, and the DOM is fully constructed, but linked resources such as images, stylesheets and subframes may not yet be loaded.

The rules whose path match with the page address will be selected and queued for injection. (from top to bottom) 

Each rule may contain `JavaScript`, `CSS`,  `HTML` and `Files` and will be splitted and injected with following order:  

 1. `Files` (from top to bottom) 
 2. `CSS` 
 3. `HTML`
 4. `JavaScript`

Each rule will inherit the previous injected code. (same for files)  


## How to Import / Export

>**IMPORTANT :**   
Because of a security restriction the addon cannot create and save a file directly to the user system. For this reason the export is handled by using the user clipboard so that the user can save it by himself.  

You can import and export from the settings page.  

- To export press on the `export` button.  
If successful you should have in your clipboard a `JSON` describing the rules list. Paste and save it where you want.  
*<small>(a message should appear to tell whether the operation to save into the clipboard is successful or not)</small>*  


 - To import press on the `import` button.  
 Navigate into your system and select a file containing a valid `Rules list JSON`  
*<small>(a message should appear to tell whether the operation is successful or not)</small>*  


## How to install

You can find and install this extension from the browsers store pages:

[<img title="Firefox" src="https://static.miniclipcdn.com/layout/icons/browsers/firefox_64x64.png" alt="Drawing" style="width: 64px; margin-right:10px"/>]()
[<img title="Chrome" src="https://static.miniclipcdn.com/layout/icons/browsers/chrome_64x64.png" alt="Drawing" style="width: 64px; margin-right:10px"/>]()
[<img title="Opera" src="https://static.miniclipcdn.com/layout/icons/browsers/opera_64x64.png" alt="Drawing" style="width: 64px; margin-right:10px"/>]()
[<img title="Edge" src="https://static.miniclipcdn.com/layout/icons/browsers/edge_64x64.png" alt="Drawing" style="width: 64px; margin-right:10px"/>]()
[<img title="Safari" src="https://static.miniclipcdn.com/layout/icons/browsers/safari_64x64.png" alt="Drawing" style="width: 64px; margin-right:10px"/>]()


## What's next 

I would like to make it more and more easy and user friendly so that even who's new to programming can use this add-on with ease.

## Credits

- Code editors handled using [monaco-editor](https://github.com/Microsoft/monaco-editor).
- WebExtensions API normalized using [webextension-polyfill](https://github.com/mozilla/webextension-polyfill).
- Icons by [material-design-icons](https://github.com/google/material-design-icons).
- A thank you to [@JD342](https://github.com/JD342) for the help provided in the debugging process.

## Info

Web Injector is written and maintained by [L.Sabatelli](https://github.com/Lor-Saba)  
Licenze: [MIT](http://opensource.org/licenses/MIT)
