
// list of active
var rules = []; 

// settings
var settings = {};

// last activated page url 
var currentPageURL = '';

// the current active tab
var activeTab = null;



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

/** Inject the given set of rules
 * (must be parsed)
 * 
 * @param {array} _rules 
 */
function injectRules(_rules){

    // exit if there are no rules listed to be injected
    if (_rules.onLoad.length   === 0
    &&  _rules.onCommit.length === 0)
        return Promise.reject({message: 'No rules to be injected'});

    // FIXME: the current tab info has not been saved 
    if (!activeTab)
        return Promise.reject({message: 'Unknown tab info.'});

    // inject the "injector" script
    return browser.tabs
    .executeScript(activeTab.tabId, {file: '/script/inject.js', runAt: 'document_start'})
    .then(function(_res){ 
                
        // send the list of rules
        return browser.tabs.sendMessage(activeTab.tabId, _rules);
    });
}

/**
 * @param {info} _info 
 */
function handleWebNavigation(_info) {

    // exit if framed
    if (_info.parentFrameId >= 0) return;

    // exit if not the principal frame
    if (_info.frameId !== 0) return;
    
    // save globally the tab info
    activeTab = _info;

    // set or remove the badge number 
    updateBrowserActionBadge(_info.url);

    // get the list of rules which selector validize the current page url
    getInvolvedRules(_info.url, rules)

    // divide the array of rules by injection type (on load / on commit)
    .then(splitRulesByInjectionType)

    // inject the result
    .then(injectRules);
}

/**  
 * @param {info} _info 
 */
function handleActivated(_info) {

    // save globally the tab info
    activeTab = _info;
    
    browser.tabs.get(_info.tabId).then(function(_tab){
        updateBrowserActionBadge(_tab.url);
    });
}

/**  
 * @param {object} _mex 
 */
function handleOnMessage(_mex, _sender, _callback){

    // fallback
    _callback = typeof _callback === 'function' ? _callback : function(){};

    // split by action 
    switch(_mex.action){

        case 'inject': 

            getActiveTab()
            .then(function(_tab){

                activeTab = { tabId: _tab.id };

                var rules = serializeRules([_mex.rule]);
                    rules = splitRulesByInjectionType(rules);

                injectRules(rules)
                
                .then(function(){
                    browser.runtime.sendMessage({action: _mex.action, success: true});
                })
                .catch(function(_err){
                    browser.runtime.sendMessage({action: _mex.action, success: false, error: _err});
                });
            });
        
            break;

        default: _callback();
    }

    // callback call
    _callback();
    return true;
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
 * return (in promise) the current active tab info
 */
function getActiveTab(){
   
    return browser.tabs.query({ active:true, currentWindow: true})
    .then(function(_info){
        return _info[0];
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
 * @param {array} _rules 
 */
function splitRulesByInjectionType(_rules){

    var result = { onLoad: [], onCommit: [] };

    each(_rules, function(){
        result[this.onLoad ? 'onLoad':'onCommit'].push(this);
    });
    
    return result;
}

/**
 * @param {string} _url 
 * @param {array} _rules 
 */
function getInvolvedRules(_url, _rules){

    /*
        result = [
            {
                type: 'js',
                code: 'alert();',
            },
            {
                type: 'js',
                path: 'https://.../file.js',
            },
            ...
        ]
    */ 

    return new Promise(function(_ok, _ko){

        var result = [];
        var checkRule = function(_ind){ 
    
            // current rule being parsed
            var rule = _rules[_ind];
    
            // exit if there's no value in "rules" at index "_ind" (out of length)
            if (!rule)
                return _ok(result);
    
            // skip the current rule if the tap url does not match with the rule one
            if (!new RegExp(rule.selector).test(_url))
                return checkRule(_ind+1);
    
            // if 'path' exist then it's a rule of a file
            if (rule.path){
    
                // if it's a local file path
                if (rule.local){
                    readFile(rule.path, function(_res){
    
                        if (_res.success)
                            result.push({ type: rule.type, code: _res.response});
                        else if (_res.message)
                            result.push({ type: 'js', code: 'console.error(\'Code-Injector [ERROR]:\', \''+_res.message.replace(/\\/g, '\\\\')+'\')' });
    
                        checkRule(_ind+1);
                    });
                }
                else{
                    result.push({ type: rule.type, path: rule.path});
                    checkRule(_ind+1);
                }
            }
            else{
                result.push({ type: rule.type, code: rule.code});
                checkRule(_ind+1);
            }
        };
    
        checkRule(0);

    });
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
            function(_ex){

                // fallback to XMLHttpRequest
                var xhr = new XMLHttpRequest();

                xhr.onload = function() {
                    _cb({ success: true, path: _path, response: xhr.response });
                };
                xhr.onerror = function(error) {
                    _cb({ success: false, path: _path, response: null, message: 'The browser can not load the file "'+_path+'". Check that the path is correct or for file access permissions.' });
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

/**
 *  Initialization
 */
function initialize(){

    browser.storage.local.get()
    .then(function(_data){
        
        if (_data.parsedRules){
            rules.length = 0;
            rules = _data.parsedRules;
        }
    
        if (_data.settings){
            settings = _data.settings;
        }
    });
    
    browser.tabs.query({ active:true, currentWindow: true})
    .then(function(_info){

        // save globally the tab info
        activeTab = { tabId: _info[0].id };
    });
}

browser.storage.onChanged.addListener(handleStorageChanged);
browser.tabs.onActivated.addListener(handleActivated);
browser.webNavigation.onCommitted.addListener(handleWebNavigation);
browser.runtime.onMessage.addListener(handleOnMessage);

// start ->
initialize();