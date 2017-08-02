
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
 * check if the given string is a valid rules list 
 * and then import it to the storage by appending it to the existing rules
 * 
 * @param {JSONstring} _string 
 */
function importRules(_string){
    try{
        var rulesLoaded = JSON.parse(_string);
        var newRules    = [];

        // exit if it's not an array
        if (!(rulesLoaded && rulesLoaded.constructor !== Array)) return null;

        // for each element of the array check if it's a valid rule object
        each(rulesLoaded, function(){
            var rule = {
                selector: this.selector,
                enabled: this.enabled,
                
                code:{
                    js:     this.code.js,
                    css:    this.code.css,
                    html:   this.code.html,
                    files:  this.code.files
                }
            };

            if (rule.selector === undefined) return false;
            if (rule.enabled === undefined) return false;

            if (typeof rule.code.js !== 'string') return false;
            if (typeof rule.code.css !== 'string') return false;
            if (typeof rule.code.html !== 'string') return false;

            if (!(rule.code.files && rule.code.files.constructor === Array)) return;
            
            newRules.push(rule);
        });

        // aappend the new loaded rules
        getRules(function(_rules){
            setRules(_rules.concat(newRules));
        });

        return true;
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
                if (confirm("This action will delete all the saved rules. Continue?")){

                    el.rulesCounter.textContent = '';
                    browser.storage.local.set({ rules: [] }).then(function(_data){
                        updateRulesCounter([]);
                    });
                }
                break;

            // export 
            case 'btn-export': 
                getRules(function(_rules){
                    var li  = closest(target, 'li');
                    var res = copyString(JSON.stringify(_rules));

                    if (res)
                        li.dataset.result = "success";
                    else
                        li.dataset.result = "fail";
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

                        if (res)
                            li.dataset.result = "success";
                        else
                            li.dataset.result = "fail";

                    });
                    reader.addEventListener("error", function() {
                        li.dataset.result = "fail";
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
            
        }
    });

    // event to check for changes to the rules list in the storage
    browser.storage.onChanged.addListener( function(_data){
        if (_data.rules && _data.rules.newValue)
            updateRulesCounter(_data.rules.newValue);
    });
    
});