
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

            code: 'alert(true);',
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
                    local: file.type === 'local',
                    onLoad: rule.onLoad
                });
            });
        }

        if (containsCode(rule.code.css)){
            result.push({
                type: 'css',
                enabled: rule.enabled,
                selector: rule.selector,
                code: rule.code.css,
                onLoad: rule.onLoad
            });
        }

        if (containsCode(rule.code.html)){
            result.push({
                type: 'html',
                enabled: rule.enabled,
                selector: rule.selector,
                code: rule.code.html,
                onLoad: rule.onLoad
            });
        }

        if (containsCode(rule.code.js)){
            result.push({
                type: 'js',
                enabled: rule.enabled,
                selector: rule.selector,
                code: rule.code.js,
                onLoad: rule.onLoad
            });
        }

    });

    return result;
}

/**
 * @param {info} _info 
 */
function handleWebNavigation(_info) {

    // exit if framed
    if (_info.parentFrameId >= 0) return;

    // exit if not the principal frame
    if (_info.frameId !== 0) return;

    // set or remove the badge number 
    updateBrowserActionBadge(_info.url);

    // get the list of rules which selector validize the current page url
    getInvolvedRules(_info.url, function(_rules){

        // first injection: set a variable "___rules" which contains the involved rules
        /*browser.tabs.executeScript(_info.tabId, {code: 'var ___rules = '+JSON.stringify(_rules)+';', runAt: 'document_start'} )
        .then(
            function(){ // OK 

                // second injection: lanuch the injector loop
                return browser.tabs.executeScript(_info.tabId, {file: '/script/inject.js', runAt: 'document_start'});
            },
            function(){
                // console.error('inject RULES - KO', arguments); // KO
            }
        )
        .then(
            function(){},
            function(){
                // console.error('inject SCRIPT - KO', arguments); // KO
            }
        );*/

        // inject the "injector" script
        browser.tabs.executeScript(_info.tabId, {file: '/script/inject.js', runAt: 'document_start'})
        .then(
            function(){ 
                
                // send the list of rules
                return browser.tabs.sendMessage(_info.tabId, _rules);
            },
            function(){
                // console.error('inject SCRIPT - KO', arguments); // KO
            }
        );
    });

}

/**  
 * @param {info} _info 
 */
function handleActivated(_info) {
    
    browser.tabs.get(_info.tabId).then(function(_tab){
        updateBrowserActionBadge(_tab.url);
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
        result: { onLoad: [], onCommit: [] } ->

        {
            type: 'js',
            code: 'alert();',
        },
        {
            type: 'js',
            path: 'https://.../file.js',
        }
    
    */ 

    var result = { onLoad: [], onCommit: [] };
    var checkRule = function(_ind){ 

        // current rule being parsed
        var rule = rules[_ind];

        // exit if there's no value in "rules" at index "_ind" (out of length)
        if (!rule)
            return _cb(result);

        // skip the current rule if the tap url does not match with the rule one
        if (!new RegExp(rule.selector).test(_url))
            return checkRule(_ind+1);

        // if 'path' exist then it's a rule of a file
        if (rule.path){

            // if it's a local file path
            if (rule.local){
                readFile(rule.path, function(_res){

                    if (_res.success)
                        result[rule.onLoad ? 'onLoad':'onCommit'].push({ type: rule.type, code: _res.response});
                    else if (_res.message)
                        result[rule.onLoad ? 'onLoad':'onCommit'].push({ type: 'js', code: 'console.error(\'Code-Injector [ERROR]:\', \''+_res.message+'\')' });

                    checkRule(_ind+1);
                });
            }
            else{
                result[rule.onLoad ? 'onLoad':'onCommit'].push({ type: rule.type, path: rule.path});
                checkRule(_ind+1);
            }
        }
        else{
            result[rule.onLoad ? 'onLoad':'onCommit'].push({ type: rule.type, code: rule.code});
            checkRule(_ind+1);
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
function readFile(_path, _cb){

    _path = 'file://'+ _path;

    try{
        
        fetch(_path, { mode: 'same-origin' })
    
        .then(
            function(_res) {
                return _res.blob();
            },
            function(){

                // fallback to XMLHttpRequest
                var xhr = new XMLHttpRequest();

                xhr.onload = function() {
                    _cb({ success: true, path: _path, response: xhr.response });
                };
                xhr.onerror = function(error) {
                    _cb({ success: false, path: _path, response: null, message: 'The browser can not load the file "'+_path+'".' });
                };

                xhr.open('GET', _path);
                xhr.send();

                throw "FALLBACK";
            }
        )
    
        .then(
            function(_blob) {

                if (!_blob) return _cb({ success: false, path: _path, response: null, message: '' });

                var reader = new FileReader();
    
                reader.addEventListener("loadend", function() {
                    _cb({ success: true, path: _path, response: this.result });
                });
                reader.addEventListener("error", function() {
                    _cb({ success: false, path: _path, response: null, message: 'Unable to read the file "'+_path+'".' });
                });
    
                reader.readAsText(_blob);
            },
            function(_ex){
                if (_ex !== "FALLBACK")
                    _cb({ success: false, path: _path, response: null, message: 'The browser can not load the file "'+_path+'".' });
            }
        );
    }
    catch(ex){
        _cb({ success: false, path: _path, response: null, message: 'En error occurred while loading the file "'+_path+'".' });
    }
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
browser.webNavigation.onCommitted.addListener(handleWebNavigation);

/*
browser.webNavigation.onCommitted.addListener(function(_info){
    if (_info.frameId === 0)
        console.log('onCommitted', _info);
});

browser.webNavigation.onDOMContentLoaded.addListener(function(_info){
    if (_info.frameId === 0)
        console.log('onDOMContentLoaded', _info);
});
*/