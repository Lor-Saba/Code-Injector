// @import "../utils/utils.js";

var el;

/**
 * get the rules list
 * 
 * @param {function} _cb 
 */
function getRules(_cb){
    browser.storage.local
    .get('rules')
    .then(function(_data){
        _cb((_data && _data.rules) || []);
    });
}

/**
 * set the given rules to the storage
 * 
 * @param {Array} _rules 
 * @param {function} _ok - success callback
 * @param {function} _ko - fail callback
 */
function setRules(_rules, _ok, _ko){
    browser.storage.local
    .set({ rules: _rules })
    .then(_ok, _ko);
}

/**
 * Convert a rule from the old JS-Injector addon structure to the current Code-Injector one
 * 
 * @param {object} _rule 
 */
function convertRuleJSItoCI(_rule){

    var rule = {
        selector: _rule.url,
        enabled: _rule.enabled,
        onLoad: true,
        topFrameOnly: false,

        code: {
            js: _rule.code,
            css: '',
            html: '',
            files: []
        }
    };

    each(_rule.files, function(_file){
        rule.code.files.push({
            path: _file.url,
            type: isLocalURL(_file.url) ? 'local':'remote',
            ext: getPathExtension(_file.url),
        });
    });

    return rule;
}

/**
 * check if the given string is a valid rules list 
 * and then import it to the storage by appending it to the existing rules
 * 
 * @param {array} _rules 
 */
function importRules(_rules){

    // exit if not assigned
    if (!_rules) return null;

    // exit if it's not an array
    if (_rules.constructor !== Array) return null;

    // parsed rules
    var newRules = [];

    // for each element of the array check if it's a valid rule object
    each(_rules, function(){

        // the current rule to be checked and parsed
        var loadedRule = this;

        // check if the current rule comes from the old JS-Injector
        if (Object.keys(loadedRule).length === 4
        &&  typeof loadedRule.url === 'string'
        &&  typeof loadedRule.code === 'string'
        &&  typeof loadedRule.enabled === 'boolean'
        &&  typeof loadedRule.files === 'object') 
            loadedRule = convertRuleJSItoCI(loadedRule);

        var rule = {
            selector: loadedRule.selector,
            enabled: loadedRule.enabled,
            onLoad: loadedRule.onLoad,
            topFrameOnly: loadedRule.topFrameOnly,
            
            code:{
                js:     loadedRule.code.js,
                css:    loadedRule.code.css,
                html:   loadedRule.code.html,
                files:  loadedRule.code.files
            }
        };

        if (rule.selector === undefined) return;
        if (rule.enabled === undefined) return;

        if (typeof rule.code.js !== 'string') return;
        if (typeof rule.code.css !== 'string') return;
        if (typeof rule.code.html !== 'string') return;

        if (!(rule.code.files && rule.code.files.constructor === Array)) return;
        
        newRules.push(rule);
    });

    // append the new loaded rules
    getRules(function(_rules){
        setRules(_rules.concat(newRules));
    });

    return { imported: newRules.length, total: _rules.length };

}

/**
 * update the rules counter 
 * 
 * @param {Array} _rules 
 */
function updateRulesCounter(_rules){
    if (_rules){
        el.rulesCounter.textContent = _rules.length;
    }
    else{
        getRules(function(_rules){
            el.rulesCounter.textContent = _rules.length;
        });
    }
}

/**
 * update the settinge object to the storage
 */
function updateSettings(){
    browser.storage.local.set({
        settings: {
            nightmode: false, // el.cbNightmode.checked,
            showcounter: el.cbShowcounter.checked,
            size:{
                width:  Math.max(el.txtSizeW.dataset.min|0, el.txtSizeW.value|0),
                height: Math.max(el.txtSizeH.dataset.min|0, el.txtSizeH.value|0)
            }
        }
    });
}

/**
 * trigger an opacity effect for the innfo message
 */
function animateInfoOpacity(_li){

    var info = _li.querySelector('.'+_li.dataset.result);
        info.style.cssText = "transition: 0s; opacity: 1;";

    setTimeout(function(){ 
        info.style.cssText = "transition: 5s; opacity: 0;";
    }, 2000);
}

/**
 * Load the current saved settings
 */
function loadSettings(){
    browser.storage.local.get().then(function(_data){
        if (_data.settings){

            // apply defaults
            var settings = Object.assign({

                nightmode: false,
                showcounter: false,
                size: {
                    width:  500,
                    height: 500
                }

            }, _data.settings);

            el.cbShowcounter.checked = settings.showcounter,
            el.txtSizeW.value = settings.size.width;
            el.txtSizeH.value = settings.size.height;
        }
    });
}

/**
 * update the "export modal" 
 */
function updateExportModal(){

    var count = 0;

    each(el.modalBody.querySelectorAll('.rule input[data-name="cb-export-toggle"]'), function(){
        if (this.checked) count++;
    });

    el.modalBody.querySelector('.export-counter-selected').textContent = count;
    
    if (count)
        el.modalBody.querySelector('button[data-name="btn-export"]').removeAttribute('disabled');
    else
        el.modalBody.querySelector('button[data-name="btn-export"]').setAttribute('disabled', '');
}

/**
 * update the "import modal" 
 */
function updateImportModal(){

    var enableButton = false;
    var activePanel = el.modalBody.querySelector('.import-methods li[data-active="true"]');

    // no active tab (bug?)
    if (!activePanel)
        return;

    switch(activePanel.dataset.for){

        // from loacl file
        case '0': 
            var inp = activePanel.querySelector('input');

            if (inp.value && inp.validity.valid){
                enableButton = true;
            }
            break;

        // from remote file
        case '1': 
            var inp = activePanel.querySelector('input');

            // enable the button if the input is not empty
            if (inp.value){
                enableButton = true;
            }
            break;

        // from github 
        case '2':
            var inp = activePanel.querySelector('input');

            // enable the button if the input has loaded a valid github rule
            if (inp.dataset.validgithub === "true"){
                enableButton = true;
            }
            break;

    }

    if (enableButton)
        el.modalBody.querySelector('button[data-name="btn-import"]').removeAttribute('disabled');
    else
        el.modalBody.querySelector('button[data-name="btn-import"]').setAttribute('disabled', '');
}

/**
 * get and check the given gitub rule repository 
 * 
 * @param {string} _link - Remote link to be checked
 * @param {function} _callback - callback
 */
function getGitHubRuleInfo(_link){

    /*
    {
        name: 'Facebook auth-blocker',
        description: 'Block and hides the login popup if the user is not logged',
        author: 'L.Sabatelli',

        selector: 'facebook',
        onLoad: true,

        code:{
            js: 'dist/code.js',
            css: 'dist/code.css',
            html: 'dist/code.html',
        }
    }
    */

    // clear the previous defined timeout
    clearTimeout(getGitHubRuleInfo.checkTimeout);

    return new Promise(function(_ok, _ko){

        // check if the _link is a valid gitub rule repository after 
        // a given delay to avoid a requests spam
        getGitHubRuleInfo.checkTimeout = setTimeout(function(){
            
            // get the hostname of the given _link 
            var link = parseURL(_link);

            // exit if not a valid link
            if (!link)
                return _ko({ valid: false, error: 'INVALID_LINK' });

            // exit if not a GitHub link
            if (link.origin !== 'https://github.com')
                return _ko({ valid: false, error: 'GITHUB_ONLY' });

            // build the request url to fetch
            var requestURL = 'https://raw.githubusercontent.com' +link.pathname;

            // fetch the url
            fetch(requestURL +'/master/rule.json')

            // convert the result to json
            .then(function(_res){

                if (_res.status !== 200)
                    throw _res.status;

                return _res.json(); 
            })

            // return 
            .then(
                function(_json){ // OK
                    _ok({ valid: true, url: requestURL, json: _json });
                },
                function(_err){ // KO

                    if (_err === 404)
                        return _ko({ valid: false, error: 'NOT_FOUND' });

                    _ko({ valid: false, error: 'JSON_PARSE_FAIL' });
                }
            );

        }, 500);

    });

}

/**
 * get the remote rule from gitub 
 * 
 * @param {object} _data - object of the remote link to be checked
 */
function getGitHubRule(_data){

    return new Promise(function(_ok, _ko){

        // if _data does not exist or is not an object
        if (!_data || _data.constructor !== Object) 
            _ko();

        // the online
        var remoteConfig = _data.json;

        // fallback if not assigned
        if (!remoteConfig.code)
            _ko({ error: 'NO_CODES'})

        // set the remote url paths
        var remoteUrlJS   = remoteConfig.code.js   ? _data.url +'/master/'+ remoteConfig.code.js.replace('/^\//', '')   : null;
        var remoteUrlCSS  = remoteConfig.code.css  ? _data.url +'/master/'+ remoteConfig.code.css.replace('/^\//', '')  : null;
        var remoteUrlHTML = remoteConfig.code.html ? _data.url +'/master/'+ remoteConfig.code.html.replace('/^\//', '') : null;

        // new rule object
        var newRule = {

            selector: remoteConfig.selector,
            onLoad: !!remoteConfig.onLoad,
            topFrameOnly: !!remoteConfig.topFrameOnly,
            enabled: true,

            code:{
                js:     '',
                css:    '',
                html:   '',
                files:  []
            }
        };

        // get the text content of a given request link
        var requestFile = function(_link, _type){
    
            // fetch
            return fetch(_link)
            
            // parse the request as text
            .then(function(_res){
                return _res.text();
            })
            
            // result
            .then(
                function(_code){

                    // do not set if empty
                    if (!_code) return;
                    
                    // set to the rule object
                    newRule.code[_type] = _code;
                },
                function(){
                    // failed to fetch the request
                }
            )

            // catch and stop the propagation of errors
            .catch(function(){});
        };

        // start a chain of promises
        Promise.resolve()

        // request the JavaScript file
        .then(function(){
            return requestFile(remoteUrlJS, 'js');
        })

        // request the CSS file
        .then(function(){
            return requestFile(remoteUrlCSS, 'css');
        })

        // request the HTML file
        .then(function(){
            return requestFile(remoteUrlHTML, 'html');
        })

        // import 
        .then(function(){

            var importRes = importRules([newRule]);
            
            // promise success callback
            _ok(importRes);
        })

        // catches errors
        .catch(_ko);
    });
}

/**
 * get the remote rules 
 * 
 * @param {object} _link - Remote link 
 */
function getRemoteRules(_link){

    return new Promise(function(_ok, _ko){

        // exit if the remote file is not a .json
        if (!/\.json$/.test(_link))
            return _ko();

        // fetch the result
        fetch(_link)

        // pase the result as json
        .then(function(_res){
            return _res.json();
        })

        // try to import the result json
        .then(function(_res){
            
            var importRes = importRules(_res);
            
            // promise success callback
            _ok(importRes);
        })

        .catch(_ko);
    });
}

/**
 * get the local rules 
 * 
 * @param {File} _file - Remote link to be checked
 */
function getLocalRules(_file){

    return new Promise(function(_ok, _ko){

        if (_file){
            
            var reader = new FileReader();
    
            reader.addEventListener("loadend", function() {

                try{
                    var rulesJSON = JSON.parse(this.result);
                    var importRes = importRules(rulesJSON);
    
                    // promise success callback
                    _ok(importRes);
                }
                catch(_err){
                    _ko();
                }
            });
            reader.addEventListener("error", _ko);
            reader.readAsText(_file);
        }
        else {
            _ko();
        }
        
    });
}

// on page load
window.addEventListener('load', function(_e){

    el = {
        rulesCounter:   document.querySelector('#rules-counter'),
        fileImport:     document.querySelector('#file-import'),
        cbNightmode:    document.querySelector('input[data-name="cb-night-mode"]'),
        cbShowcounter:  document.querySelector('input[data-name="cb-show-counter"]'),
        txtSizeW:       document.querySelector('input[data-name="inp-size-width"]'),
        txtSizeH:       document.querySelector('input[data-name="inp-size-height"]'),
        modal:          document.querySelector('#modal'),
        modalBody:      document.querySelector('#modal .m-body'),
        modalTitle:     document.querySelector('#modal .m-head .m-title'),
    };

    updateRulesCounter();
    loadSettings();

    // events
    window.addEventListener('click', function(_e){

        var target = _e.target;

        // the event is handled by checking the "data-name" attribute of the target element 
        switch(target.dataset.name){

            // remove the rules list
            case 'btn-clear-rules': 

                if (target.dataset.confirm === 'true'){
                    delete target.dataset.confirm;
                    el.rulesCounter.textContent = '';
                    browser.storage.local.set({ rules: [] }).then(function(_data){
                        updateRulesCounter([]);
                    });
                }
                else{
                    target.dataset.confirm = 'true';
                    target.onmouseleave = function(){
                        target.onmouseleave = null;
                        delete target.dataset.confirm;
                    };
                }
                break;

            // show the export modal
            case 'btn-show-modal-export': 

                getRules(function(_rules){

                    el.modalTitle.textContent = "Export";
                    emptyElement(el.modalBody);

                    var modalExportTmpl = getTemplate('modal-export');

                    el.modalBody.appendChild(modalExportTmpl);
                    el.modalBody.querySelector('span.export-counter-max').textContent = _rules.length;

                    var elRulesList = el.modalBody.querySelector('.export-rulesList');

                    each(_rules, function(){
                        var ruleTmpl = getTemplate('modal-export-rule');
                            ruleTmpl.querySelector('.r-name').textContent = this.selector;
                            ruleTmpl.querySelector('.r-name').setAttribute('title', this.selector);
                            ruleTmpl.querySelector('.r-json').value = JSON.stringify(this);

                        elRulesList.appendChild(ruleTmpl);
                    });

                    updateExportModal();

                    document.body.dataset.modalvisible = true;
                });
                break;

            // show the import modal
            case 'btn-show-modal-import': 

                el.modalTitle.textContent = "Import";
                emptyElement(el.modalBody);

                var modalImportTmpl = getTemplate('modal-import');
                
                el.modalBody.appendChild(modalImportTmpl);

                updateImportModal();

                document.body.dataset.modalvisible = true;
                break;


            // hide / close the modal
            case 'btn-hide-modal': 
                delete document.body.dataset.modalvisible;
                break;

            // export 
            case 'btn-export': 
            
                var li = document.querySelector('.opt-export-import li.opt-ei-export');
                var selectedRules = [];
            
                // get the rule json for each selected rule
                each(el.modalBody.querySelectorAll('.rule'), function(){
                    if (this.querySelector('input[type="checkbox"]').checked)
                        selectedRules.push(this.querySelector('.r-json').value);
                });

                // exit if there's no rule selected to export
                if (!selectedRules.length) return;

                // put together the stringified json to export
                var rulesJSON = '['+selectedRules.join(',')+']';
                
                try{
                    // check if it's a valid JSON 
                    var test = JSON.parse(rulesJSON);
                    var res = downloadText('code-injector-export-'+Date.now()+'.json', rulesJSON);

                    if (res)
                        li.dataset.result = "success";
                    else
                        li.dataset.result = "fail";
                }
                catch(_err){
                    li.dataset.result = "fail";
                }

                // opacity animation
                animateInfoOpacity(li);

                // close the modal 
                delete document.body.dataset.modalvisible;
                break;

            // import
            case 'btn-import': 

                var activePanel = el.modalBody.querySelector('.import-methods li[data-active="true"]');
                var li          = document.querySelector('.opt-export-import li.opt-ei-import');
                var p           = null;
                
                // no active tab (bug?)
                if (!activePanel)
                    return;
                
                // 
                switch(activePanel.dataset.for){

                    // case of local JSON file
                    case '0': 
                        var inp = activePanel.querySelector('input[data-name="inp-import-file"]');
                        p = getLocalRules(inp.files[0]); 
                        break;

                    // case of remote JSON file
                    case '1': 
                        var inp = activePanel.querySelector('input[data-name="inp-import-remote"]');
                        p = getRemoteRules(inp.value); 
                        break;
                        
                    // case of remote GitHub repository
                    case '2': 
                        var txtarea = activePanel.querySelector('.import-github-info textarea');
                        p = getGitHubRule(JSON.parse(txtarea.value)); 
                        break;

                    // default fail case (bug?)
                    default: 
                        p = Promise.reject();

                }

                // handle the promise result
                p.then(
                    function(_res){ // OK
                        
                        // choose to show the "success" or "failed" message (in case of 0 rules imported)
                        if (_res && _res.imported > 0)
                            li.dataset.result = "success";
                        else
                            li.dataset.result = "fail";

                        // se the number of imported rules
                        var infoStat = li.querySelector('.import-info.'+li.dataset.result+' small');
                            infoStat.textContent = _res.imported +' / '+ _res.total;
                    },
                    function(){ // KO

                        // choose the "failed" message
                        li.dataset.result = "fail";

                        // set the default "failed" message text
                        var infoStat = li.querySelector('.import-info.'+li.dataset.result+' small');
                            infoStat.textContent = 'Failed';
                    }
                )
                .then(function(){

                    // fade animation
                    animateInfoOpacity(li);

                    // close modal
                    delete document.body.dataset.modalvisible;
                });
                break;

        }
    });
    window.addEventListener('change', function(_e){

        var target = _e.target;

        // the event is handled by checking the "data-name" attribute of the target element 
        switch(target.dataset.name){

            // TODO (maybe in future)
            case 'cb-night-mode': 
                updateSettings();
                break;

            // active or disable the badge to the icon
            case 'cb-show-counter': 
                updateSettings();
                break;

            // save the custom size
            case 'inp-size-width':
            case 'inp-size-height':

                if (target.value)
                    target.value = Math.max(target.dataset.min|0, target.value|0);

                updateSettings();
                break;
            
            // select or deselect all the rules in the "export modal"
            case 'cb-export-toggle-all': 

                // set the same check state for each rule checkbox
                each(el.modalBody.querySelectorAll('.rule input[data-name="cb-export-toggle"]'), function(){
                    this.checked = target.checked;
                });

                updateExportModal();
                break;
            
            // select or deselect the rule in the "export modal" 
            case 'cb-export-toggle': 
                updateExportModal()
                break;

            // change import method panel
            case 'sel-import-method':

                // reset the method panel values
                el.modalBody.querySelector('input[data-name="inp-import-file"]').value = '';
                el.modalBody.querySelector('input[data-name="inp-import-remote"]').value = '';
                el.modalBody.querySelector('input[data-name="inp-import-github"]').value = '';
                el.modalBody.querySelector('input[data-name="inp-import-github"]').dataset.validgithub = false;
                emptyElement(el.modalBody.querySelector('.import-github-info'));

                // show the selected view
                each(el.modalBody.querySelectorAll('.import-methods > li'), function(){
                    this.dataset.active = this.dataset.for === target.value;

                    if (this.dataset.active == "true")
                        this.querySelector('input').focus();
                });

                updateImportModal();
                break;

            // a file has been selected
            case 'inp-import-file': 
                updateImportModal();
                break;
        }
    });
    window.addEventListener('input', function(_e){

        var target = _e.target;

        // the event is handled by checking the "data-name" attribute of the target element 
        switch(target.dataset.name){

            case 'inp-size-width':
            case 'inp-size-height':

                if (target.value)
                    target.value = target.value.replace(/\D/g, '');

                break;

            // on remote file path change
            case 'inp-import-remote': 
                updateImportModal();
                break;

            // check the github link
            case 'inp-import-github':

                // set to false the validity of the new link
                // waiting for the result of the new input
                target.dataset.validgithub = false;
                emptyElement(el.modalBody.querySelector('.import-github-info'));
                updateImportModal();

                // check the new input
                getGitHubRuleInfo(target.value)
                .then(function(_res){
                    
                    // get the info container
                    var githubElementInfo = el.modalBody.querySelector('.import-github-info');

                    // exit if element not found
                    if (githubElementInfo === null)
                        return;

                    // parse infos
                    var ruleName        = stripHTMLFromString(_res.json.name).trim()        || 'Unnamed Remote Rule';
                    var ruleAuthor      = stripHTMLFromString(_res.json.author).trim()      || _res.url.split('/')[3];
                    var ruleDescription = stripHTMLFromString(_res.json.description).trim() || '';
                    var ruleIcon        = _res.json.icon && String(_res.json.icon).trim();
                    var ruleHasJS       = _res.json.code && !!_res.json.code.js;
                    var ruleHasCSS      = _res.json.code && !!_res.json.code.css;
                    var ruleHasHTML     = _res.json.code && !!_res.json.code.html;

                    // empty the github info container
                    emptyElement(el.modalBody.querySelector('.import-github-info'));

                    // append the info
                    githubElementInfo.appendChild(

                        // get and parse the template
                        getTemplate('modal-import-github', function(_fragment){

                            // set description
                            if (ruleDescription)
                                _fragment.querySelector('table').setAttribute('title', ruleDescription);

                            // set name
                            if (ruleName)
                                _fragment.querySelector('.import-gh-name').textContent = ruleName;

                            // set author
                            if (ruleAuthor)
                                _fragment.querySelector('.import-gh-author').textContent = ruleAuthor;

                            // set icon
                            if (ruleIcon)
                                _fragment.querySelector('.import-gh-icon').style.backgroundImage = 'url(' +ruleIcon+ ')';

                            // save the rule.json
                            _fragment.querySelector('textarea').value = JSON.stringify(_res);

                            // check for codes
                            _fragment.querySelector('.color-js').dataset.active = ruleHasJS;
                            _fragment.querySelector('.color-css').dataset.active = ruleHasCSS;
                            _fragment.querySelector('.color-html').dataset.active = ruleHasHTML;

                        })
                        
                    );

                    // set an attribute to define if the 
                    target.dataset.validgithub = _res.valid;
                    updateImportModal();
                })
                .catch(function(_res){
                    // _res.error 
                });   
                break;

        }
    });

    // event to check for changes to the rules list in the storage
    browser.storage.onChanged.addListener( function(_data){
        if (_data.rules && _data.rules.newValue)
            updateRulesCounter(_data.rules.newValue);

        // close the modal 
        delete document.body.dataset.modalvisible;
    });
    
});