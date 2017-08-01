
// list of active
var rules = []; 

// settings
var settings = {};

// last activated page url 
var currentPageURL = '';


/**
 * @param {string} _string 
 */
function containsCode(_string){
    return !!_string.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*|<!--[\s\S]*?-->$/gm, '').trim();
}

/**
 * @param {array} _arr 
 * @param {function} _fn 
 */
function each(_arr, _fn){
    if (!_arr) return;
    if (_arr.length) for(var ind = 0, ln = _arr.length; ind < ln; ind++)
        if (_fn.call(_arr[ind], ind, _arr[ind]) === false) return;
}

/**
 * @param {array} _rules 
 */
function serializeRules(_rules){

    /*
        {
            type: 'js',
            enabled: true,
            selector: 'google',

            code: 'console.log(true);',
        },
        {
            type: 'js',
            enabled: true,
            selector: 'google',

            path: '/var/test.js'
            local: true
        }
    */
    
    var id = 0;
    var result = [];

    each(_rules, function(){

        // skip if the rule is not enabled
        if (!this.enabled) return;

        var rule = this;
        
        if (rule.code.files.length){
            each(rule.code.files, function(){
                var file = this;
                if (!file.ext) return;
                result.push({
                    type: file.ext,
                    enabled: rule.enabled,
                    selector: rule.selector,
                    path: file.path,
                    local: file.type === 'local'
                });
            });
        }

        if (containsCode(rule.code.css)){
            result.push({
                type: 'css',
                enabled: rule.enabled,
                selector: rule.selector,
                code: rule.code.css 
            });
        }

        if (containsCode(rule.code.html)){
            result.push({
                type: 'html',
                enabled: rule.enabled,
                selector: rule.selector,
                code: rule.code.html
            });
        }

        if (containsCode(rule.code.js)){
            result.push({
                type: 'js',
                enabled: rule.enabled,
                selector: rule.selector,
                code: rule.code.js
            });
        }

    });

    return result;

}

/**
 * @param {info} _info 
 */
function handleDOMContentLoaded(_info) {

    // console.log('handleDOMContentLoaded', arguments);

    // exit if framed
    if (_info.parentFrameId >= 0) return;

    // exit if not the principal frame
    if (_info.frameId !== 0) return;

    // get the list of rules which selector validize the current page url
    getInvolvedRules(_info.url, function(_rules){

        // first injection: set a variable "___rules" which contains the involved rules
        browser.tabs.executeScript(_info.tabId, {code: 'var ___rules = '+JSON.stringify(_rules)+';'} )
        .then(
            function(){ /* OK */

                // second injection: lanuch the injector loop
                return browser.tabs.executeScript(_info.tabId, {file: '/script/inject.js'});
            },
            function(){
                console.error('inject RULES - KO', arguments); // KO
            }
        )
        .then(
            function(){ /* OK */ },
            function(){
                console.error('inject SCRIPT - KO', arguments); // KO
            }
        );
    });

}

/**  
 * @param {info} _info 
 */
function handleActivated(_info) {
    
    browser.tabs.get(_info.tabId).then(function(_tab){

        currentPageURL = _tab.url;

        updateBrowserActionBadge(currentPageURL);
    });
}

/**
 * @param {string} _url 
 */
function updateBrowserActionBadge(_url){
    
    if (!settings.showcounter){
        return browser.browserAction.setBadgeText({ text: '' });
    }

    countInvolvedRules(_url, function(_count){

        _count = _count ? String(_count) : '';

        browser.browserAction.setBadgeText({ text: _count });
    });
}

/**
 * @param {object} _data 
 */
function handleStorageChanged(_data){

    console.log('storage changed', _data);

    if (_data.rules && _data.rules.newValue){
        rules.length = 0;
        rules = serializeRules(_data.rules.newValue);

        browser.storage.local.set({parsedRules: rules});
    }

    if (_data.settings && _data.settings.newValue){
        settings = _data.settings.newValue;
        updateBrowserActionBadge(currentPageURL);
    }
}

/**
 * 
 * @param {string} _url 
 * @param {function} _cb 
 */
function countInvolvedRules(_url, _cb){
    var counter = 0;

    browser.storage.local.get('rules').then(function(_data){
        if (!_data.rules) return;

        each(_data.rules, function(){
            var rule = this;
            if (new RegExp(rule.selector).test(_url)) counter++;
        });

        _cb(counter);
    });

}

/**
 * @param {string} _url 
 * @param {function} _cb 
 */
function getInvolvedRules(_url, _cb){

    /*
        result: [] ->

        {
            type: 'js',
            code: 'alert();',
        },
        {
            type: 'js',
            path: 'https://.../file.js',
        }
    
    */ 

    var result = [];
    var checkRule = function(_ind){

        // current rule being parsed
        var rule = rules[_ind];

        // exit if there's no value in "rules" at index "_ind" (out of length)
        if (!rule)
            return _cb(result);

        // skip the current rule if the tap url does not match with the rule one
        if (!new RegExp(rule.selector).test(_url))
            return checkRule(++_ind, _cb);

        // if 'path' exist then it's a rule of a file
        if (rule.path){

            // if it's a local file path
            if (rule.local){
                readFile(rule.path, rule.local, function(_res){

                    if (_res)
                        result.push({ type: rule.type, code: _res});

                    checkRule(++_ind, _cb);
                });
            }
            else{
                result.push({ type: rule.type, path: rule.path});
                checkRule(++_ind, _cb);
            }
        }
        else{
            result.push({ type: rule.type, code: rule.code});
            checkRule(++_ind, _cb);
        }
    };

    checkRule(0);
}


// https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
// https://developer.mozilla.org/en-US/docs/Web/API/FileReader
/**
 * @param {string} _path    
 * @param {boolean} _local  
 * @param {function} _cb    
 */
function readFile(_path, _local, _cb){

    var init = {};

    if (_local){
        _path = 'file://'+ _path;
        init.mode = 'same-origin';
    }

    fetch(_path, init)

    .then(
        function(_res) {
            return _res.blob();
        },
        function(){
            _cb(null);
        }
    )

    .then(
        function(_blob) {
            var reader = new FileReader();

            reader.addEventListener("loadend", function() {
                _cb(this.result, _path, _local);
            });
            reader.addEventListener("error", function() {
                _cb(null);
            });

            reader.readAsText(_blob);
        },
        function(){
            _cb(null);
        }
    );
}


// Init 

browser.storage.local.get().then(function(_data){

    if (_data.parsedRules){
        rules.length = 0;
        rules = _data.parsedRules;
    }

    if (_data.settings){
        settings = _data.settings;
    }
});

browser.storage.onChanged.addListener(handleStorageChanged);
browser.tabs.onActivated.addListener(handleActivated);
browser.webNavigation.onDOMContentLoaded.addListener(handleDOMContentLoaded);