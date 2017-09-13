
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

        code:{
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
 * @param {JSONstring} _string 
 */
function importRules(_string){
    try{
        var rulesLoaded = JSON.parse(_string);
        var newRules    = [];

        // exit if not assigned
        if (!rulesLoaded) return null;

        // exit if it's not an array
        if (rulesLoaded.constructor !== Array) return null;

        // for each element of the array check if it's a valid rule object
        each(rulesLoaded, function(){

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

        return { imported: newRules.length, total: rulesLoaded.length };
    }
    catch(ex){
        return null;
    }
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
            showcounter: el.cbShowcounter.checked
        }
    });
}

/**
 * triggle an opacity effect for the innfo message
 */
function animateInfoOpacity(_li){

    var info = _li.querySelector('.'+_li.dataset.result);
        info.style.cssText = "transition: 0s; opacity: 1;";

    setTimeout(function(){ 
        info.style.cssText = "transition: 5s; opacity: 0;";
    }, 2000);
}

// on page load
window.addEventListener('load', function(_e){

    el = {
        rulesCounter:   document.querySelector('#rules-counter'),
        fileImport:     document.querySelector('#file-import'),
        cbNightmode:    document.querySelector('input[data-name="cb-night-mode"]'),
        cbShowcounter:  document.querySelector('input[data-name="cb-show-counter"]')
    };

    updateRulesCounter();

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

            // export 
            case 'btn-export': 
                getRules(function(_rules){
                    var li  = closest(target, 'li');
                    var res = downloadText('code-injector-export-'+Date.now()+'.json', JSON.stringify(_rules));
                    //var res = copyString(JSON.stringify(_rules));

                    if (res)
                        li.dataset.result = "success";
                    else
                        li.dataset.result = "fail";

                    animateInfoOpacity(li);
                });
                break;

            // import
            case 'btn-import': 
                el.fileImport.click();
                break;

        }
    });
    window.addEventListener('change', function(_e){

        var target = _e.target;

        // the event is handled by checking the "data-name" attribute of the target element 
        switch(target.dataset.name){

            // a file as been selected
            case 'inp-file-import': 
                var li   = closest(target, 'li');
                var file = target.files[0];

                if (file){
                    
                    var reader = new FileReader();

                    reader.addEventListener("loadend", function() {
                        var res = importRules(this.result);

                        if (res && res.imported > 0)
                            li.dataset.result = "success";
                        else
                            li.dataset.result = "fail";

                        var infoStat = li.querySelector('.import-info.'+li.dataset.result+' small');
                            infoStat.textContent = res.imported +' / '+ res.total;

                        animateInfoOpacity(li);
                    });
                    reader.addEventListener("error", function() {
                        li.dataset.result = "fail";
                        animateInfoOpacity(li);
                    });

                    reader.readAsText(file);

                }

                target.value = null;
                break;

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

                /*var elW = document.querySelector('input[data-name="inp-size-width"]');
                var elH = document.querySelector('input[data-name="inp-size-height"]');

                var w = Math.max(500, elW.value|0);
                var h = Math.max(450, elH.value|0);

                updateSettings();*/
                break;
            
        }
    });
    /*window.addEventListener('input', function(_e){

        var target = _e.target;

        // the event is handled by checking the "data-name" attribute of the target element 
        switch(target.dataset.name){

            case 'inp-size-width':
            case 'inp-size-height':
                if (isNaN(target.value)){
                    _e.preventDefault();
                    _e.stopPropagation();
                    return false;
                }
                break;

        }

    });*/

    // event to check for changes to the rules list in the storage
    browser.storage.onChanged.addListener( function(_data){
        if (_data.rules && _data.rules.newValue)
            updateRulesCounter(_data.rules.newValue);
    });
    
});