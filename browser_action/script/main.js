
// 
var unsavedChangesTimeout = null;

var currentPageURL = '';
var rulesCounter = 0;

// monaco editor object for each language block
var editorJS    = null;
var editorCSS   = null;
var editorHTML  = null;

// monaco editor config
var editorConfig = {
    cursorBlinking: "phase",
    fontSize: 11,
    folding: true,
    renderIndentGuides: true,
    renderLineHighlight: 'none',
    scrollbar: {
        verticalScrollbarSize: '0px'
    },
    minimap: {
        enabled: true,
        renderCharacters: false,
        showSlider: "always"
    }
};

// on load
window.addEventListener('load', function(){

    // DOM elements references
    var el = {
        body:           document.querySelector('#body'),
        rulesList:      document.querySelector('#rules .rules-list'),
        editor:         document.querySelector('#editor'),
        editorSelector: document.querySelector('#editor .editor-selector [data-name="txt-editor-selector"]'),
        editorSaveBtn:  document.querySelector('#editor [data-name="btn-editor-save"]'),
        tab:            document.querySelector('#editor .tab'),
        filesList:      document.querySelector('#editor .files-list'),
        fileImport:     document.querySelector('#file-import')
    };

    // request the rules list from storage (if already exist)
    browser.tabs.query({active: true, currentWindow: true}).then(function(_tabs){
        currentPageURL = _tabs[0].url;
        loadRules();
    });


    // require monaco editor and initialize them
    require.config({ paths: { 'vs': 'script/vs' }});
    require(['vs/editor/editor.main'], function() {
        editorJS    = monaco.editor.create(document.getElementById('editor-js')    , Object.assign(editorConfig, {language: 'javascript'})  );
        editorCSS   = monaco.editor.create(document.getElementById('editor-css')   , Object.assign(editorConfig, {language: 'css'})         );
        editorHTML  = monaco.editor.create(document.getElementById('editor-html')  , Object.assign(editorConfig, {language: 'html'})        );
    
        var onFocus = function(){
            el.tab.dataset.focus = true;
        };
        var onBlur = function(){
            el.tab.dataset.focus = false;
        };

        editorJS.onDidFocusEditor(onFocus);
        editorCSS.onDidFocusEditor(onFocus);
        editorHTML.onDidFocusEditor(onFocus);

        editorJS.onDidBlurEditor(onBlur);
        editorCSS.onDidBlurEditor(onBlur);
        editorHTML.onDidBlurEditor(onBlur);

        delete document.body.dataset.loading;
        
        // check for a previous unsaved session
        browser.storage.local.get('lastSession').then(function(_data){
            if (_data.lastSession) {
                setEditorPanelData(_data.lastSession);
                el.body.dataset.editing = true;
            }
        });

    });

    // set the last istance while the editor panel is visible
    function setLastSession(){

        // stop the previous timeout if not fired yet
        clearTimeout(unsavedChangesTimeout);

        // exit if not in edit mode
        if (!el.body.dataset.editing) return;

        unsavedChangesTimeout = setTimeout(function(){
            if (el.body.dataset.editing){
                browser.storage.local.set({
                    lastSession: getEditorPanelData()
                });
            }
        }, 750);
    }

    // get the rule's data from a rule DOM Element 
    function getRuleData(_el){

        if (!_el) return null;
        if ( _el.className !== 'rule') return null;

        var ruleData = {

            enabled:    _el.dataset.enabled === 'true',
            selector:   _el.querySelector('.r-name').textContent.trim(),

            code:{
                js:     _el.querySelector('.d-js').value,
                css:    _el.querySelector('.d-css').value,
                html:   _el.querySelector('.d-html').value,
                files:  JSON.parse(_el.querySelector('.d-files').value)
            }

        };

        return ruleData;

    }

    // set a rule's data to a rule DOM Element 
    function setRuleData(_el, _data){

        if (!_el) return null;
        if ( _el.className !== 'rule') return null;

        _el.querySelector('.r-name').innerHTML = _data.selector;

        _el.querySelector('.color-js').dataset.active = containsCode(_data.code.js);
        _el.querySelector('.color-css').dataset.active = containsCode(_data.code.css);
        _el.querySelector('.color-html').dataset.active = containsCode(_data.code.html);
        _el.querySelector('.color-files').dataset.active = _data.code.files.length > 0;

        _el.querySelector('.r-data .d-js').value = _data.code.js;
        _el.querySelector('.r-data .d-css').value = _data.code.css;
        _el.querySelector('.r-data .d-html').value = _data.code.html;
        _el.querySelector('.r-data .d-files').value = JSON.stringify(_data.code.files);

        _el.dataset.enabled = _data.enabled;
        _el.dataset.active = new RegExp(_data.selector.trim()).test(currentPageURL);

    }

    // set a rule's data to the editor panel 
    function setEditorPanelData(_data){

        var data = {
            target:     _data.target     || 'NEW',
            enabled:    _data.enabled    || false,
            selector:   _data.selector   || '',

            code:{
                js:     _data.code.js    || '',
                css:    _data.code.css   || '',
                html:   _data.code.html  || '',
                files:  _data.code.files || [],
            },
        };

        var activeTab = '';
             if (containsCode(data.code.js)) activeTab = 'js';
        else if (containsCode(data.code.css)) activeTab = 'css';
        else if (containsCode(data.code.html)) activeTab = 'html';
        else if (data.code.files.length) activeTab = 'files';
        else activeTab = 'js';

        editorJS.setValue(data.code.js);
        editorCSS.setValue(data.code.css);
        editorHTML.setValue(data.code.html);

        el.filesList.innerHTML = '';
        data.code.files.push({type:'', path:''});
        each(data.code.files, function(){
            el.filesList.appendChild( 
                stringToElement(getTemplate('file', {type:this.type, value:this.path, ext:this.ext })) 
            );
        });

        el.tab.dataset.selected = activeTab;
        el.editorSelector.value = data.selector.trim();
        el.editorSelector.dataset.active = data.selector.trim() ? new RegExp(data.selector.trim()).test(currentPageURL) : false;
        el.editorSelector.dataset.error = false;
        el.editor.dataset.target = data.target;
        el.editor.querySelector('[data-name="cb-editor-enabled"]').checked = data.enabled;

        setTimeout(function(){
            el.editorSelector.focus();
        }, 400);
    }

    // get the rule's data from the editor panel 
    function getEditorPanelData(){ 

        var data = {

            target:     el.editor.dataset.target,
            enabled:    el.editor.querySelector('[data-name="cb-editor-enabled"]').checked,
            selector:   el.editorSelector.value.trim(),

            code:{
                js:     editorJS.getValue(),
                css:    editorCSS.getValue(),
                html:   editorHTML.getValue(),
                files:  []
            }

        };

        each(el.filesList.children, function(){
            var  path = this.querySelector('input').value.trim();
            if (!path) return;
            
            data.code.files.push({
                path: path,
                type: this.dataset.type,
                ext:  this.dataset.ext
            });
        });

        try{
            var testSelector = new RegExp(data.selector).test(currentPageURL);
        }
        catch(ex){
            data.selector = '';
        }

        return data;
    }

    // load the previous saved rules from the storage (on page load)
    function loadRules(){
        browser.storage.local
        .get('rules')
        .then(function(_res){
            each(_res.rules, function(){

                var rule    = this;
                var ruleEl  = stringToElement(getTemplate('rule'));
                    ruleEl.dataset.id = rulesCounter++;

                setRuleData(ruleEl, rule);

                el.rulesList.appendChild(ruleEl);
            });
        });
    }

    // convert and return a JSON of the current rules list from the rules elements
    function getRulesJSON(){

        var result = [];

        each(el.rulesList.children, function(){
            result.push(getRuleData(this));
        });

        return result;
    }

    // save the rules JSON in the storage
    function saveRules(){
        browser.storage.local.set({
            rules: getRulesJSON()
        });
    }

    // global events
    window.addEventListener('keydown', function(_e){

        /*
            S: 83
            esc: 27
            ins: 45 
            tab: 9
            arrow_up: 38
            arrow_down: 40
            canc: 46
            enter: 13
        */
        
        switch(_e.keyCode){

            case 83:  // S
                if (el.body.dataset.editing == 'true'){
                    
                    if (_e.ctrlKey === false) return;

                    el.editorSaveBtn.click();

                    _e.preventDefault();
                    _e.stopPropagation();
                    return false;
                }
                break;

        }

        // possible changes in a current editing process
        if (el.body.dataset.editing)
            setLastSession();

    });
    window.addEventListener('click', function(_e){

        var target = _e.target;

        switch(target.dataset.name){

            case 'btn-rule-delete': 
                if (target.dataset.confirm){
                    closest(target, '.rule').remove();
                    saveRules();
                }
                else{
                    target.dataset.confirm = true;
                    target.onmouseleave = function(){ 
                        delete target.dataset.confirm;
                        target.onmouseleave = null;
                    };
                }
                break;

            case 'btn-rule-edit':
                var rule = closest(target, '.rule');
                if (rule === null) return;

                setEditorPanelData({
                    target: rule.dataset.id,
                    enabled: rule.dataset.enabled === "true",
                    selector: rule.querySelector('.r-name').textContent.trim(),
                    code:{
                        js: rule.querySelector('.r-data .d-js').value,
                        css: rule.querySelector('.r-data .d-css').value,
                        html: rule.querySelector('.r-data .d-html').value,
                        files: JSON.parse(rule.querySelector('.r-data .d-files').value),
                    }
                });

                el.body.dataset.editing = true;
                break;

            case 'btn-tab': 
                el.tab.dataset.selected = target.dataset.for;
                break;

            case 'btn-editor-cancel': 
                delete el.body.dataset.editing;
                browser.storage.local.remove('lastSession');
                break;

            case 'btn-rules-add': 

                setEditorPanelData({
                    target: 'NEW',
                    enabled: true,
                    activeTab: 'js',
                    selector: '',
                    code:{
                        js: '// Type your JavaScript code here.\n\n',
                        css: '/* Type your CSS code here. */\n\n',
                        html: '<!-- Type your HTML code here. -->\n\n',
                        files: []
                    }
                });

                el.body.dataset.editing = true;
                break;

            case 'btn-editor-save': 

                var editorData = getEditorPanelData();
                var isNewRule = editorData.target === "NEW";
                var rule = null;

                if (!editorData.selector){
                    el.editorSelector.dataset.error = true;
                    return;
                }

                if (isNewRule)
                    rule = stringToElement(getTemplate('rule'));
                else
                    rule = el.rulesList.querySelector('.rule[data-id="'+el.editor.dataset.target+'"]');

                setRuleData(rule, editorData);

                if (isNewRule){
                    rule.dataset.id = rulesCounter++;
                    el.rulesList.appendChild(rule);
                }

                delete el.body.dataset.editing;

                saveRules();
                browser.storage.local.remove('lastSession');

                break;

            case 'btn-file-delete': 
                var file = closest(target, '.file');
                if (file && el.filesList.children.length > 1)
                    file.remove();
                break;

            case 'btn-file-toggle-type':
                var file = closest(target, '.file');
                if (file.dataset.type)
                    file.dataset.type = target.dataset.for === 'local' ? 'remote':'local';
                break;

            case 'btn-editor-gethost': 
                el.editorSelector.value = currentPageURL;
                el.editorSelector.dataset.active = true;
                break;
            
            case 'btn-info-show': 
                el.body.dataset.info = true;
                break;
            
            case 'btn-info-hide': 
                delete el.body.dataset.info;
                break;
        }

        // possible changes in a current editing process
        if (el.body.dataset.editing)
            setLastSession();
        
    });
    window.addEventListener('mousedown', function(_e){

        var target = _e.target;

        switch(target.dataset.name){

            case 'do-grip': 
                var el = closest(target, 'li');
                var ghost = stringToElement('<li class="ghost"></li>');
                var parent = el.parentElement;

                var elClass = el.className;
                var ruleIndex = getElementIndex(el);
                var Y = _e.screenY;

                var evMM = function(_e){
                    el.style.transform = 'translateY('+(_e.screenY-Y)+'px)';

                    var targetEl = closest(_e.target, function(_el){ return _el.parentElement === parent; });
                    if (targetEl === null) return;

                    var ghostIndex      = getElementIndex(ghost);
                    var targetRuleIndex = getElementIndex(targetEl);

                    if (targetRuleIndex < ghostIndex)
                        targetEl.parentElement.insertBefore(ghost, targetEl);
                    else
                        targetEl.parentElement.insertBefore(ghost, targetEl.nextElementSibling);

                    if (targetRuleIndex > ruleIndex)
                        el.style.marginTop = '0px';
                    else
                        el.style.marginTop = '';
                };
                var evMU = function(){

                    delete el.dataset.dragging;
                    el.style.cssText = "";

                    ghost.parentElement.insertBefore(el, ghost);
                    ghost.remove();

                    window.removeEventListener('mousemove', evMM);
                    window.removeEventListener('mouseup', evMU);

                    if (elClass === 'rule')
                        saveRules();
                    
                    // possible changes in a current editing process
                    if (el.body.dataset.editing)
                        setLastSession();
                };

                el.dataset.dragging = true;
                el.parentElement.insertBefore(ghost, el);

                window.addEventListener('mousemove', evMM);
                window.addEventListener('mouseup', evMU);
                break;

        }

    });
    window.addEventListener('input', function(_e){

        var target = _e.target;
        switch(target.dataset.name){

            case 'txt-editor-selector': 
                target.dataset.error  = false;
                
                try{
                    target.dataset.active = target.value.trim() ? new RegExp(target.value.trim()).test(currentPageURL) : false;
                }
                catch(ex){
                    target.dataset.active = false;
                    target.dataset.error  = true;
                }
                break;

            case 'txt-file-path': 

                var file = closest(target, '.file');

                if (!target.value.length) {
                    file.dataset.type = '';
                    file.dataset.ext  = '';
                    return;
                }

                if (file === file.parentElement.lastElementChild)
                    el.filesList.appendChild( stringToElement(getTemplate('file', {type:'', value:''})) );

                file.dataset.type = isLocalURL(target.value.trim()) ? 'local':'remote';
                file.dataset.ext  = getPathExtension(target.value);

                var typeSelect = file.querySelector('.f-type select');
                    typeSelect.value = file.dataset.ext;
                    typeSelect.setAttribute('title', file.dataset.ext ? file.dataset.type +' - '+ file.dataset.ext.toUpperCase() : 'Unknown (will be skipped)');
                    
                break;
        }

    });
    window.addEventListener('change', function(_e){
        
        var target = _e.target;
        switch(target.dataset.name){

            case 'sel-file-type': 
                var file = closest(target, '.file');
                    file.dataset.ext = target.value;

                target.setAttribute('title', file.dataset.ext ? file.dataset.type +' - '+ file.dataset.ext.toUpperCase() : 'Unknown (will be skipped)');
                break;

        }

    });

});
