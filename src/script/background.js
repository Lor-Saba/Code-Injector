
// list of active
var rules = []; 

// settings
var settings = {};

// last activated page url 
var currentPageURL = '';

// the current active tab
var activeTab = null;

// the current number of injected rules
var activeRulesCounter = 0;


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
            topFrameOnly: rule.topFrameOnly,

            code: 'alert(true);',
        },
        {
            type: 'js',
            enabled: true,
            selector: 'google',
            topFrameOnly: rule.topFrameOnly,

            path: '/var/test.js'
            local: true
        }
    */
    
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
                    topFrameOnly: rule.topFrameOnly,
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
                topFrameOnly: rule.topFrameOnly,
                code: rule.code.css,
                onLoad: rule.onLoad
            });
        }

        if (containsCode(rule.code.html)){
            result.push({
                type: 'html',
                enabled: rule.enabled,
                selector: rule.selector,
                topFrameOnly: rule.topFrameOnly,
                code: rule.code.html,
                onLoad: rule.onLoad
            });
        }

        if (containsCode(rule.code.js)){
            result.push({
                type: 'js',
                enabled: rule.enabled,
                selector: rule.selector,
                topFrameOnly: rule.topFrameOnly,
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
 * @param {array} _injectionObject 
 */
function injectRules(_injectionObject){

    // exit if there are no rules listed to be injected
    if (_injectionObject.rules.onLoad.length === 0
    &&  _injectionObject.rules.onCommit.length === 0)
        return Promise.reject({message: 'No rules to be injected'});

    // FIXME: the current tab info has not been saved 
    if (!_injectionObject.info)
        return Promise.reject({message: 'Unknown tab info.'});

    // inject the "injector" script
    return browser.tabs
    .executeScript(_injectionObject.info.tabId, {file: '/script/inject.js', runAt: 'document_start', frameId: _injectionObject.info.frameId})
    .then(function(_res){ 
                
        // send the list of rules
        return browser.tabs.sendMessage(_injectionObject.info.tabId, _injectionObject.rules, {frameId: _injectionObject.info.frameId});
    });
}

/**
 * @param {info} _info 
 */
function handleWebNavigation(_info) {

    // exit if framed
    // if (_info.parentFrameId >= 0) return;

    // exit if not the principal frame
    // if (_info.frameId !== 0) return;
    
    // save globally the tab info
    activeTab = _info;

    // set or remove the badge number 
    updateBrowserActionBadge(_info.url);

    // get the list of rules which selector validize the current page url
    getInvolvedRules(_info, rules)

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
                var injectionObject = splitRulesByInjectionType({rules: rules, info: _tab});

                injectRules(injectionObject)
                
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

    // reset the counter if it's the top-level frame 
    if (activeTab.parentFrameId === -1){
        activeRulesCounter = 0;
    }
    
    if (!settings.showcounter){
        return browser.browserAction.setBadgeText({ text: '' });
    }

    countInvolvedRules(_url, function(_count){

        // add to the global counter 
        activeRulesCounter += _count;

        var count = activeRulesCounter ? String(activeRulesCounter) : '';

        browser.browserAction.setBadgeText({ text: count });
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
function splitRulesByInjectionType(_injectionObject){

    var splittedRules = { onLoad: [], onCommit: [] };

    each(_injectionObject.rules, function(){
        splittedRules[this.onLoad ? 'onLoad':'onCommit'].push(this);
    });

    _injectionObject.rules = splittedRules;
    
    return _injectionObject;
}

/**
 * @param {object} _info 
 * @param {array} _rules 
 */
function getInvolvedRules(_info, _rules){

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
                return _ok({rules: result, info: _info});
    
            // skip the current rule if not enabled
            if (!rule.enabled)
                return checkRule(_ind+1);
    
            // skip if the current rule can only be injected to the top-level frame 
            if (rule.topFrameOnly && _info.parentFrameId !== -1)
                return checkRule(_ind+1);

            // skip the current rule if the tap url does not match with the rule one
            if (!new RegExp(rule.selector).test(_info.url))
                return checkRule(_ind+1);

            // if 'path' exist then it's a rule of a file
            if (rule.path){
    
                // if it's a local file path
                if (rule.local){
                    readFile(rule.path, function(_res){
    
                        if (_res.success)
                            result.push({ type: rule.type, onLoad: rule.onLoad , code: _res.response });
                        else if (_res.message)
                            result.push({ type: 'js', onLoad: rule.onLoad , code: 'console.error(\'Code-Injector [ERROR]:\', \''+_res.message.replace(/\\/g, '\\\\')+'\')' });
    
                        checkRule(_ind+1);
                    });
                }
                else{
                    result.push({ type: rule.type, onLoad: rule.onLoad, path: rule.path});
                    checkRule(_ind+1);
                }
            }
            else{
                result.push({ type: rule.type, onLoad: rule.onLoad, code: rule.code});
                checkRule(_ind+1);
            }
        };
    
        // start to check rules
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