// @import "../utils/utils.js";

// list of active
var rules = []; 

// settings
var settings = {};

// the currently active tabs data
var activeTabsData = {};

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
function handleWebNavigationOnCommitted(_info) {

    // set or remove the badge number 
    updateActiveTabsData(_info);

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

    // if the current tab data has been stored
    if (activeTabsData[_info.tabId]) {
        // update the active rules counter 
        setBadgeCounter(activeTabsData[_info.tabId]);
    } else {
        // get the current tab and create a tabData
        browser.tabs.get(_info.tabId).then(function(_tab){
            updateActiveTabsData({
                parentFrameId: -1,
                tabId: _tab.id,
                url: _tab.url,
            });
        });    
    }
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

                if (!_tab) throw "Failed to get the current active tab.";

                var tab = { tabId: _tab.id, frameId: 0 };
                var rules = serializeRules([_mex.rule]);
                var injectionObject = splitRulesByInjectionType({rules: rules, info: tab});

                injectRules(injectionObject)
                
                .then(function(){
                    browser.runtime.sendMessage({action: _mex.action, success: true});
                })
                .catch(function(_err){
                    browser.runtime.sendMessage({action: _mex.action, success: false, error: _err});
                });
            });
        
            break;
        
        case 'get-current-tab-data': 

            var activeTabData = activeTabsData[_mex.tabId];
            var sendData = function(_activeTabData){
                var tabData = JSON.parse(JSON.stringify(_activeTabData || {}));

                browser.runtime.sendMessage({action: _mex.action, data: tabData });
            };

            if (activeTabData && activeTabData.topURL) {
                sendData(activeTabData);
            } else {

                // recreate the tab data
                getActiveTab()
                .then(function(_tab){ 
                    _tab = _tab || {};

                    // create a new tab data
                    var tabData = createNewTabData({
                        parentFrameId: -1,
                        tabId: _tab.id || -1,
                        url: _tab.url || '',
                    }, true);

                    // update the tabData "top" and "inner" counters
                    countInvolvedRules(tabData, function(){
                        sendData(tabData);
                    });
                });
            }

            break;
    }

    // callback call
    _callback();
    return true;
}

/**
 * @param {object} _tabData 
 */
function setBadgeCounter(_tabData) {

    var text = '';

    // Get the total
    if (_tabData){
        text = _tabData.getTotal();
        text = text ? String(text) : '';
    }

    // Empty the text if the counter badge has been turned off in the settings
    if (!settings.showcounter){
        text = '';
    }

    // Update the badge text
    browser.browserAction.setBadgeText({ text: text });
}

/**
 * create a new tabData of the given tab if does not exist
 * @param {object} _info 
 */
function createNewTabData(_info, _reassign){

    // exit if the tabData already exist
    if (activeTabsData[_info.tabId] && _reassign !== true) return;

    // create a new ruleCounter of the given tab if does not exist
    var tabData = {
        id: _info.tabId,
        top: 0,
        inner: 0,
        topURL: '',
        innerURLs: [],

        getTotal: function(){
            return this.top + this.inner;
        },
        reset: function(){
            this.top = 0;
            this.topURL = '';
            this.inner = 0;
            this.innerURLs.length = 0;
        }
    };

    if (_info.parentFrameId === -1){
        tabData.topURL = _info.url;
    }     
    
    activeTabsData[_info.tabId] = tabData;

    return tabData;
}

/**
 * @param {object} _info 
 */
function updateActiveTabsData(_info){

    // create a new tabData of the given tab if does not exist
    createNewTabData(_info);

    // get the tabData of the given tab
    var tabData = activeTabsData[_info.tabId];

    // (reset the counters if it's the top-level frame)
    if (_info.parentFrameId === -1){
        tabData.reset();
        tabData.topURL = _info.url;
    } else {
        tabData.innerURLs.push(_info.url);
    }

    // update the tabData "top" and "inner" counters
    countInvolvedRules(tabData, function(){

        // update the badge
        setBadgeCounter(tabData);
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

        // getActiveTab()
        // .then(function(_tab){
        // 
        //     setBadgeCounter(activeTabsData[_tab.id]);
        // });
    }
}

/**
 * @param {object} _tabData 
 */
function countInvolvedRules(_tabData, _cb){
    
    if (!_tabData) return;

    clearTimeout(countInvolvedRules.intCounter);

    // wrapped in a timeout to reduce useless spam
    countInvolvedRules.intCounter = setTimeout(function(){
        browser.storage.local.get('rules').then(function(_data){

            if (!_data.rules) return;

            // reset the counters
            _tabData.top = 0;
            _tabData.inner = 0;

            each(_data.rules, function(){
                var rule = this;

                if (new RegExp(rule.selector).test(_tabData.topURL)) {
                    if (rule.enabled) {
                        _tabData.top++;
                    }                    
                } else {
                    if (rule.topFrameOnly) return;

                    each(_tabData.innerURLs, function(){
                        if (new RegExp(rule.selector).test(this)){
                            if (rule.enabled) {
                                _tabData.inner++;
                            }
                            return false;
                        }
                    });
                }
            });

            _cb();
        });
    }, 250);

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
}

browser.storage.onChanged.addListener(handleStorageChanged);
browser.tabs.onActivated.addListener(handleActivated);
browser.webNavigation.onCommitted.addListener(handleWebNavigationOnCommitted);
browser.runtime.onMessage.addListener(handleOnMessage);

// start ->
initialize();