<img src="http://www.spazioseme.com/wp-content/uploads/2016/08/work_in_progress-350x345.jpg" style="width: 350px; height: 345px;">

# Web-Injector
A [WebExtensions](https://developer.mozilla.org/en-US/Add-ons/WebExtensions) based addon which let the user inject code into the websites

> This is an add-on which requires a minimum of knowledge of web programming to be able to properly use it.

## Purpose

There are several sites with invasive popups / login screens, a messy layout or some missing capabilities.  
I was usually getting around these boring stuff by opening the browser console to edit the DOM style and structure but it was starting to get tiring doing it everytime, so why not making and extension which do it by itself in background?

## Injection flow

When the browser load a page the extension will select the rules whose path will match with the page address (from top to bottom).

Each rule may contain `JavaScript`, `CSS`,  `HTML` and `Files` and they will be injected as follow:  

 1. `Files` (from top to bottom) 
 2. `CSS` 
 3. `HTML`
 4. `JavaScript`

 #### Note: 

if the rule does not contain `JavaScript` code then it will be skipped.  
if the rule does not contain `CSS` code then it will be skipped.   
if the rule does not contain `HTML` code then it will be skipped.  
if the rule does not contain `Files` then it will be skipped.

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
- 
- 

Chrome:

- Download or Clone the repository.
- 
- 

## What's next 

I would like to make it more and more easy and user friendly so that even who's new to programming can use this add-on with ease.

## Info

Web Injector is written and maintained by [L.Sabatelli](https://github.com/Lor-Saba)  
Licenze: [MIT](http://opensource.org/licenses/MIT)