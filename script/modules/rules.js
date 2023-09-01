var RuleManager = (function(){

    var data = {

        versions: {

            // Rules Structure v1, from extension's version "???" --> "0.3.2"
            "1": {
                updateFromPrevious: function(_rule){
                    return _rule;
                },
                setStructure: function(_rule){

                    if (!_rule) _rule = {};
                    if (!_rule.code) _rule.code = {};

                    var rule = { _version: '1' };

                    rule.onLoad       = _rule.onLoad       || false;
                    rule.enabled      = _rule.enabled      || false;
                    rule.selector     = _rule.selector     || '.*';
                    rule.topFrameOnly = _rule.topFrameOnly || false;
                    rule.code = {
                        js:     _rule.code.js    || '',
                        css:    _rule.code.css   || '',
                        html:   _rule.code.html  || '',
                        files:  _rule.code.files || [],
                    };

                    return rule;
                },
                check: function(_rule){

                    if (!_rule) return false;
                    if (!_rule.code) return false;
                    
                    if (typeof _rule.selector !== 'string') return false;
                    if (typeof _rule.enabled !== 'boolean') return false;

                    if (typeof _rule.code.js !== 'string') return false;
                    if (typeof _rule.code.css !== 'string') return false;
                    if (typeof _rule.code.html !== 'string') return false;

                    if (!(_rule.code.files && _rule.code.files.constructor === Array)) return false;

                    return true;
                },
                next: null
                // next: '2'
            },

            // Rules Structure v2
            "2": {
                updateFromPrevious: function(_rule){
                    
                    if (!_rule) _rule = {};
                    if (!_rule.options) _rule.options = {};

                    _rule.options = {
                        onLoad:       _rule.onLoad       || false,
                        enabled:      _rule.enabled      || false,
                        topFrameOnly: _rule.topFrameOnly || false,
                        ruleID:       generateID()
                    };

                    delete _rule.onLoad;
                    delete _rule.enabled;
                    delete _rule.topFrameOnly;

                    return _rule;
                },
                setStructure: function(_rule){

                    if (!_rule) _rule = {};
                    if (!_rule.code) _rule.code = {};
                    if (!_rule.options) _rule.options = {};

                    var rule = { _version: '2' };

                    rule.description = '';
                    rule.selector    = _rule.selector || '.*';
                    rule.code = {
                        js:     _rule.code.js    || '',
                        css:    _rule.code.css   || '',
                        html:   _rule.code.html  || '',
                        files:  _rule.code.files || [],
                    };
                    rule.options = {
                        onLoad:       _rule.options.onLoad       || false,
                        enabled:      _rule.options.enabled      || false,
                        topFrameOnly: _rule.options.topFrameOnly || false,
                        ruleID:       _rule.options.ruleID       || generateID(),
                    };

                    return rule;
                },
                check: function(_rule){

                    if (!_rule) return false;
                    if (!_rule.code) return false;
                    if (!_rule.options) return false;
                    
                    if (typeof _rule.selector !== 'string') return false;
                    if (typeof _rule.description !== 'string') return false;

                    if (typeof _rule.options.onLoad !== 'boolean') return false;
                    if (typeof _rule.options.enabled !== 'boolean') return false;
                    if (typeof _rule.options.topFrameOnly !== 'boolean') return false;
                    if (typeof _rule.options.ruleID !== 'string') return false;

                    if (typeof _rule.code.js !== 'string') return false;
                    if (typeof _rule.code.css !== 'string') return false;
                    if (typeof _rule.code.html !== 'string') return false;

                    if (!(_rule.code.files && _rule.code.files.constructor === Array)) return false;

                    return true;
                },
                next: null
            },
        },

        create: function(_rule){

            var rule = _rule || {};
            var ruleVersion = _rule._version || '1'; // <- fallback to '1' as the default rule structure '_version'
            var checkStructure = function(_ruleVersion, _updateFromPrevious){

                // return if the rule is not an object
                if (!(rule && rule.constructor === Object)) return null;

                // get the rule's version object 
                var version = data.versions[_ruleVersion];

                // if exist
                if (version){

                    // update from the previous structure
                    if (_updateFromPrevious){
                        rule = version.updateFromPrevious(rule);
                    }

                    // apply the version structure and call the next one if referenced
                    rule = version.setStructure(rule);
                    rule = checkStructure(version.next, true);
                }
                
                // return the rule object
                return rule;                
            };

            return checkStructure(ruleVersion);
        },
        check: function(_rule){

            var ruleVersion = _rule._version || '1'; // <- fallback to '1' as the default rule structure '_version'

            // get the rule's version object 
            var version = data.versions[ruleVersion];

            // if exist
            if (version){
                return version.check(_rule);
            } else {
                return false;
            }
        }
    };

    return  {
        create: function(_rule){
            return data.create(_rule);
        },
        check: function(_rule){
            return data.check(_rule);
        }
    };
}());

var Rules = (function(){

    var data = {
        rules: [],
        serializedRules: [],

        ignoreStorageChange: false,
        events: {
            onInit: function(){},
            onChange: function(){}
        },

        add: function(_rule){
            
            // create a new rule with the given object _rule
            var rule = RuleManager.create(_rule);

            // push to list if it's a valid rule
            if (RuleManager.check(rule)) {
                data.rules.push(rule);
                data.serializedRules = data.serialize(data.rules);

                return rule;
            } else {
                return null;
            }
        },
        setRules: function(_rules, _force){

            var rules = [];

            // parse and check the given rules (if not forced)
            if (_force === true) {
                rules = _rules;
            } else {
                    
                // parse the list of given rules
                each(_rules, function(){
                    var rule = RuleManager.create(this);

                    if (RuleManager.check(rule)) {
                        rules.push(rule);
                    }
                });
            }

            // empty the current rules list and assign the new one
            data.rules.length = 0;
            data.rules = rules;
            data.serializedRules = data.serialize(data.rules);
        },
        serialize: function(_rules){

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
            var createSerializedData = function(_type, _ruleData, _fileData){

                var serializedData = {
                    type: _type,
                    enabled: _ruleData.enabled,
                    selector: _ruleData.selector,
                    topFrameOnly: _ruleData.topFrameOnly,
                    onLoad: _ruleData.onLoad
                };

                if (_fileData) {
                    serializedData.path = _fileData.path;
                    serializedData.local = _fileData.type === 'local';
                } else {
                    serializedData.code = _ruleData.code[_type];
                }

                return serializedData;
            }
        
            each(_rules, function(){
        
                // skip if the rule is not enabled
                if (!this.enabled) { return; }
        
                var rule = this;
                
                if (rule.code.files.length){
                    each(rule.code.files, function(){
                        var file = this;

                        if (!file.ext) { return; }

                        result.push(createSerializedData(file.ext, rule, file));
                    });
                }
        
                if (containsCode(rule.code.css)){
                    result.push(createSerializedData('css', rule));
                }
        
                if (containsCode(rule.code.html)){
                    result.push(createSerializedData('html', rule));
                }
        
                if (containsCode(rule.code.js)){
                    result.push(createSerializedData('js', rule));
                }
        
            });
        
            return result;
        },
        getInvolvedRules: function(_info){

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
                    var rule = data.serializedRules[_ind];
            
                    // exit if there's no value in "data.serializedRules" at index "_ind" (out of length)
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
        },
        loadFromStorage: function(){
            
            // get the rules list to the storage
            return browser.storage.local.get()
            .then(function(_data){
                
                if (_data.rules){
                    data.setRules(_data.rules);
                }
            });
        },
        saveToStorage: function(_ignoreStorageChange){

            // ignore the next storage change
            data.ignoreStorageChange = _ignoreStorageChange === undefined ? true : _ignoreStorageChange;
            
            // save the new rules list to the storage
            return browser.storage.local.set({ rules: data.rules });
        },
        init: function(){
            return new Promise(function(_ok){

                data.loadFromStorage()
                .then(function(){
                    browser.storage.onChanged.addListener(function(_data){
            
                        if (_data.rules && _data.rules.newValue && data.ignoreStorageChange === false){
                            data.setRules(_data.rules.newValue, true);
                            data.events.onChange();
                        }
                            
                        data.ignoreStorageChange = false;
                    });

                    data.events.onInit();
                    _ok();
                });

            });
        }
    };

    return {
        init: function(){
            return data.init();
        },
        add: function(_rule){
            return data.add(_rule);
        },
        set: function(_rules){
            return data.setRules(_rules, false);
        },
        empty: function(){
            return data.setRules([], true);
        },
        serialize: function(_rules){
            return data.serialize(_rules);
        },
        loadFromStorage: function(){
            return data.loadFromStorage();
        },
        saveToStorage: function(){
            return data.saveToStorage();
        },
        getRules: function(){
            return data.rules.slice(0);
        },
        getSerializedRules: function(){
            return data.serializedRules.slice(0);
        },
        getInvolvedRules: function(_info){
            return data.getInvolvedRules(_info);
        },
        onChanged: function(_callback) {
            if (typeof _callback === 'function') {
                data.onChange = _callback;
            }
        },
        onInit: function(_callback) {
            if (typeof _callback === 'function') {
                data.onInit = _callback;
            }
        }
    };
}());