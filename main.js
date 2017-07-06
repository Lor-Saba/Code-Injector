                                                                                                                          
/**/

var localStorage = browser.storage.local;

function log(){
    if (log.enabled)
        console.log.apply(console, arguments);
}
log.enabled = true;

function handleUpdated(_, _info, _tab) {
    //log('HU tab:', _info, _tab);

    //if (_info.status == "complete" ){
    if (_info.status == "loading" && _info.url){

        log('Loading tab:', _tab);

        // ciclo per costruire la variabile code con i codici delle regole attive

        getRelatedRules(_tab.url, function(_rules){

            log(_rules);

            browser.tabs
            .executeScript(_tab.id, {code: 'var ___rules = '+JSON.stringify(_rules)+';'} )
            .then(
                function(){
                    log('inject RULES - OK', arguments); // OK

                    browser.tabs
                    .executeScript(_tab.id, {file: 'inject.js'})
                    .then(
                        function(){
                            log('inject SCRIPT - OK', arguments); // OK
                        },
                        function(){
                            log('inject SCRIPT - KO', arguments); // KO
                        }
                    );

                },
                function(){
                    log('inject RULES - KO', arguments); // KO
                }
            );
        })

    }

}
function handleActivated(_info) {
    //log('HA tab:', _info);
    browser.tabs.get(_info.tabId).then(function(_tab){
        log('Actived tab:', _tab)
    });
}


//browser.tabs.onUpdated.addListener(handleUpdated);
//browser.tabs.onActivated.addListener(handleActivated);


/**//*
function each(_arr, _fn){
    if (!_arr) return;
    if (_arr.length) for(var ind = 0, ln = _arr.length; ind < ln; ind++)
        if (_fn.call(_arr[ind], ind, _arr[ind]) === false) return;
}

/**/
function getRelatedRules(_url, _cb){

    var result = [];
    var parseRule = function(_ind){

        // current rule being parsed
        var rule = rules[_ind];

        // exit if there's no value in "rules" at index "_ind" (out of length)
        if (!rule)
            return _cb(result);

        // skip the current rule if the tap url does not match with the rule one
        if (!new RegExp(rule.name).test(_url))
            parseRule(++_ind);

        // parse the rule's files list
        var parseFile = function(_fileInd, _fileCb){

            var file = rule.files[_fileInd];
            if (file){
                if (file.local)
                    readFile(file.url, file.local, function(_res){
                        result.push({ local: true, code: _res});
                        parseFile(++_fileInd, _fileCb);
                    });
                else{
                    result.push({ local: false, url: file.url });
                    parseFile(++_fileInd, _fileCb);
                }
            }
            else _fileCb();
        };

        parseFile(0, function(){
            result.push({ local: true, code: rule.code });
            parseRule(++_ind);
        });

    };

    parseRule(0);
}


var rules = [
    /*{
        name: '.*',
        code: 'console.info("JS-INJECTOR - OK")',
        files:[
            { local: false, url: 'https://code.jquery.com/jquery-3.2.1.min.js' },
            { local: true , url: '/var/www/html/fayetest/tests/ff-webextension/first-test/blbl-test.js' },
        ]
    }*/
];

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

    .then(function(_res) {
        return _res.blob();
    })

    .then(function(_blob) {
        var reader = new FileReader();

        reader.addEventListener("loadend", function() {
            _cb(this.result, _path, _local);
        });

        reader.readAsText(_blob);
    });
};

/**//*
setTimeout(function(){

        getRelatedRules('http://demosviluppo.teammee.com.locale/Admin/?page=moldablefields', function(_res){
            log('aaaaaaaaaaaaaaaa',_res)
        });

}, 1000);
/**/
