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

Each rule may contain `JavaScript`, `CSS`,  `HTML` and `Files` and will be injected in following order:  

 1. `Files` (from top to bottom) 
 2. `CSS` 
 3. `HTML`
 4. `JavaScript`

Every rule will inherit the previous injected code. (same for files)  


> **Note:**  
>if a rule does not contain `JavaScript` code then it will be skipped.  
if a rule does not contain `CSS` code then it will be skipped.   
if a rule does not contain `HTML` code then it will be skipped.  
if a rule does not contain `Files` then it will be skipped.




## How to Import / Export

>**IMPORTANT :**   
Because of a security restriction the addon cannot create and save a file directly to the user system. For this reason the export is handled by using the user clipboard so that the user can save it by himself.  

You can import and export from the settings page.  

- To export press on the `export` button.  
If successful you should have in your clipboard a `JSON` describing the rules list. Paste and save it where you want.  
<small>(a message should appear to tell whether the operation to save into the clipboard is successful or not)</small>  


 - To import press on the `import` button. Navigate into your system and select a file containing a valid `Rules list JSON`  
<small>(a message should appear to tell whether the operation is successful or not)</small>  


## How to install

You can find and install this extension from the browsers store pages:

[<img title="Firefox" src="https://static.miniclipcdn.com/layout/icons/browsers/firefox_64x64.png" alt="Drawing" style="width: 64px; margin-right:10px"/>]()
[<img title="Chrome" src="https://static.miniclipcdn.com/layout/icons/browsers/chrome_64x64.png" alt="Drawing" style="width: 64px; margin-right:10px"/>]()
[<img title="Opera" src="https://static.miniclipcdn.com/layout/icons/browsers/opera_64x64.png" alt="Drawing" style="width: 64px; margin-right:10px"/>]()
[<img title="Edge" src="https://static.miniclipcdn.com/layout/icons/browsers/edge_64x64.png" alt="Drawing" style="width: 64px; margin-right:10px"/>]()
[<img title="Safari" src="https://static.miniclipcdn.com/layout/icons/browsers/safari_64x64.png" alt="Drawing" style="width: 64px; margin-right:10px"/>]()

or manually...

Firefox:

- Download or Clone the repository.
- ...
- 

Chrome:

- Download or Clone the repository.
- ...
- 

## What's next 

I would like to make it more and more easy and user friendly so that even who's new to programming can use this add-on with ease.

## Info

Web Injector is written and maintained by [L.Sabatelli](https://github.com/Lor-Saba)  
Licenze: [MIT](http://opensource.org/licenses/MIT)