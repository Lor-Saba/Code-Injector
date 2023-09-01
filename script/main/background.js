//=require ../modules/utils.js
//=require ../modules/rules.js
//=require ../modules/settings.js

// the currently active tabs data
var activeTabsData = {};

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
    Rules.getInvolvedRules(_info)

    // divide the array of rules by injection type (on load / on commit)
    .then(splitRulesByInjectionType)

    // inject the result
    .then(injectRules) 

    // errors
    .catch(err => {}); 
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
        browser.tabs.get(_info.tabId)
        .then(function(_tab){
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
                var rules = Rules.serializeRules([_mex.rule]);
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
                browser.runtime.sendMessage({
                    action: _mex.action, 
                    data: cloneJSON(_activeTabData) 
                });
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
    if (!Settings.getItem('showcounter')){
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
 * @param {object} _tabData 
 */
function countInvolvedRules(_tabData, _cb){
    
    if (!_tabData) return;

    clearTimeout(countInvolvedRules.intCounter);

    // wrapped in a timeout to reduce useless spam
    countInvolvedRules.intCounter = setTimeout(function(){

        // reset the counters
        _tabData.top = 0;
        _tabData.inner = 0;

        each(Rules.getRules(), function(){
            
            var rule = this;
            var ruleRX = new RegExp(rule.selector);

            if (ruleRX.test(_tabData.topURL)) {
                _tabData.top++;
            } else {
                if (rule.topFrameOnly) return;

                each(_tabData.innerURLs, function(){
                    if (ruleRX.test(this)){
                        _tabData.inner++;
                        return false;
                    }
                });
            }
        });

        _cb();
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
 *  Initialization
 */
function initialize(){

    Rules.init();
    Settings.init();
}

browser.tabs.onActivated.addListener(handleActivated);
browser.webNavigation.onCommitted.addListener(handleWebNavigationOnCommitted);
browser.runtime.onMessage.addListener(handleOnMessage);

// start ->
initialize();