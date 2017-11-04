
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
            showcounter: el.cbShowcounter.checked,
            size:{
                width:  Math.max(el.txtSizeW.dataset.min|0, el.txtSizeW.value|0),
                height: Math.max(el.txtSizeH.dataset.min|0, el.txtSizeH.value|0)
            }
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
 * update the counter label in the "export modal" 
 */
function updateExportSelectedRules(){

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

                    updateExportSelectedRules();

                    document.body.dataset.modalvisible = true;
                });
                break;

            case 'btn-show-modal-import': 
                el.modalTitle.textContent = "Import";
                emptyElement(el.modalBody);

                var modalImportTmpl = getTemplate('modal-import');
                
                el.modalBody.appendChild(modalImportTmpl);

                document.body.dataset.modalvisible = true;
                break;

            case 'btn-hide-modal': 
                delete document.body.dataset.modalvisible;
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

                updateExportSelectedRules();
                break;
            
            // select or deselect the rule in the "export modal" 
            case 'cb-export-toggle': 
                updateExportSelectedRules()
                break;

            case 'sel-import-method':

                // show the selected view
                each(el.modalBody.querySelectorAll('.import-mothods > li'), function(){
                    this.dataset.active = this.dataset.for === target.value;
                });
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