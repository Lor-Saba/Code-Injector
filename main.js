
// list of active
var rules = [];


function each(_arr, _fn){
    if (!_arr) return;
    if (_arr.length) for(var ind = 0, ln = _arr.length; ind < ln; ind++)
        if (_fn.call(_arr[ind], ind, _arr[ind]) === false) return;
}

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
            enabled: false,
            selector: '.*',

            code: null,
            path: '/var/test.js'
            local: true
        }
    */

    var result = [];

    each(_rules, function(){
        var rule = this;
        if (rule.active.files){
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
        if (rule.active.css){
            result.push({
                type: 'css',
                enabled: rule.enabled,
                selector: rule.selector,
                code: rule.code.css 
            });
        }
        if (rule.active.html){
            result.push({
                type: 'html',
                enabled: rule.enabled,
                selector: rule.selector,
                code: rule.code.html
            });
        }
        if (rule.active.js){
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

function handleUpdated(_, _info, _tab) {

    //if (_info.status == "complete" ){
    if (_info.status == "loading" && _info.url){

        //console.log('Loading tab:', _tab);

        // ciclo per costruire la variabile code con i codici delle regole attive

        getInvolvedRules(_tab.url, function(_rules){

            //console.log('Involved Rules:', _rules);

            browser.tabs
            .executeScript(_tab.id, {code: 'var ___rules = '+JSON.stringify(_rules)+';'} )
            .then(
                function(){
                    //console.log('inject RULES - OK', arguments); // OK

                    browser.tabs
                    .executeScript(_tab.id, {file: 'inject.js'})
                    .then(
                        function(){
                            //console.log('inject SCRIPT - OK', arguments); // OK
                        },
                        function(){
                            console.log('inject SCRIPT - KO', arguments); // KO
                        }
                    );

                },
                function(){
                    console.log('inject RULES - KO', arguments); // KO
                }
            );
        })

    }

}
/*function handleActivated(_info) {
    //log('HA tab:', _info);
    browser.tabs.get(_info.tabId).then(function(_tab){
        log('Actived tab:', _tab)
    });
}*/

function handleStorageChanged(_data){

    if (_data.rules && _data.rules.newValue){
        rules.length = 0;
        rules = serializeRules(_data.rules.newValue);
        browser.storage.local.set({parsedRules: rules});
    }
}

browser.storage.local.get('parsedRules').then(function(_data){

    if (_data.parsedRules){
        rules.length = 0;
        rules = _data.parsedRules;
    }
});

browser.storage.onChanged.addListener(handleStorageChanged);
browser.tabs.onUpdated.addListener(handleUpdated);
//browser.tabs.onActivated.addListener(handleActivated);


/**/
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
 * _path    {string}
 * _local   {boolean}
 * _cb      {function}
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
};

/**//*
setTimeout(function(){

        getRelatedRules('http://demosviluppo.teammee.com.locale/Admin/?page=moldablefields', function(_res){
            log('aaaaaaaaaaaaaaaa',_res)
        });

}, 1000);
/**/
