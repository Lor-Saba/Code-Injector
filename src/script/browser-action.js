
// timeout indexes
var unsavedChangesTimeout = null;
var editorCodeDotsTimeout = null;

// url of the page active 
var currentPageURL = '';

// rules id generator
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
    require.config({ paths: { 'vs': '../script/vs' }});
    require(['vs/editor/editor.main'], function() {
        editorJS    = monaco.editor.create(document.querySelector('#editor-js')  , Object.assign(editorConfig, {language: 'javascript'}) );
        editorCSS   = monaco.editor.create(document.querySelector('#editor-css') , Object.assign(editorConfig, {language: 'css'})        );
        editorHTML  = monaco.editor.create(document.querySelector('#editor-html'), Object.assign(editorConfig, {language: 'html'})       );
    
        var onFocus = function(){
            el.tab.dataset.focus = true;
        };
        var onBlur = function(){
            el.tab.dataset.focus = false;
        };

        // assign events to the monaco editors
        editorJS.onDidFocusEditor(onFocus);
        editorCSS.onDidFocusEditor(onFocus);
        editorHTML.onDidFocusEditor(onFocus);

        editorJS.onDidBlurEditor(onBlur);
        editorCSS.onDidBlurEditor(onBlur);
        editorHTML.onDidBlurEditor(onBlur);

        // stop loading
        delete document.body.dataset.loading;
        
        // check for a previous unsaved session (and restore it)
        browser.storage.local.get('lastSession').then(function(_data){
            if (_data.lastSession) {
                setEditorPanelData(_data.lastSession);
                el.body.dataset.editing = true;
            }
        });

    });

    /**
     * updates the languages dots on each tabs (if contains code or not)
     */
    function checkEditorDots(){
        clearTimeout(editorCodeDotsTimeout);

        editorCodeDotsTimeout = setTimeout(function(){

            var data = {
                js: editorJS.getValue(),
                css: editorCSS.getValue(),
                html: editorHTML.getValue(),
                files: []
            };

            each(el.filesList.children, function(){
                var  path = this.querySelector('input').value.trim();
                if (!path) return;
                
                data.files.push({path: path});
            });

            el.tab.querySelector('.color-js').dataset.active = containsCode(data.js);
            el.tab.querySelector('.color-css').dataset.active = containsCode(data.css);
            el.tab.querySelector('.color-html').dataset.active = containsCode(data.html);
            el.tab.querySelector('.color-files').dataset.active = data.files.length > 0;


            // free data object

            data.files.length = 0;

            delete data.js;
            delete data.css;
            delete data.html;
            delete data.files;

            data = null;

        }, 1000);
    }

    /**
     * set the last istance while the editor panel is visible
     */
    function setLastSession(){

        // check for code changes to set the languages dots
        checkEditorDots();

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

    /**
     * get the rule's data from a rule DOM Element 
     * 
     * @param {Element} _el 
     */
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

    /**
     * set a rule's data to a rule DOM Element 
     * 
     * @param {Element} _el 
     * @param {Object} _data 
     */
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

    /**
     * set a rule's data to the editor panel 
     * 
     * @param {Object} _data 
     */
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

        // define if the languages contains code (or elements for the files one)
        data.active = {
            js: containsCode(data.code.js),
            css: containsCode(data.code.css),
            html: containsCode(data.code.html),
            files: data.code.files.length > 0
        };

        // check which is the tab panel that should be visible at first
        var activeTab = '';
             if (data.active.js) activeTab = 'js';
        else if (data.active.css) activeTab = 'css';
        else if (data.active.html) activeTab = 'html';
        else if (data.active.files) activeTab = 'files';
        else activeTab = 'js';

        // set the code into the editor
        editorJS.setValue(data.code.js);
        editorCSS.setValue(data.code.css);
        editorHTML.setValue(data.code.html);

        // stylish things..
        el.tab.querySelector('.color-js').dataset.active = data.active.js;
        el.tab.querySelector('.color-css').dataset.active = data.active.css;
        el.tab.querySelector('.color-html').dataset.active = data.active.html;
        el.tab.querySelector('.color-files').dataset.active = data.active.files;

        // insert the files list 
        el.filesList.innerHTML = '';
        data.code.files.push({type:'', path:''});
        each(data.code.files, function(){
            var file = this;
            el.filesList.appendChild( 
                getTemplate('file', function(_fragment){
                    var elFile = _fragment.querySelector('.file');
                        elFile.dataset.type = file.type;
                        elFile.dataset.ext  = file.ext;

                    var elInput = _fragment.querySelector('.file .f-input');
                        elInput.value = file.path;
                }) 
            );
        });

        // final assignments
        el.tab.dataset.selected = activeTab;
        el.editorSelector.value = data.selector.trim();
        el.editorSelector.dataset.active = data.selector.trim() ? new RegExp(data.selector.trim()).test(currentPageURL) : false;
        el.editorSelector.dataset.error = false;
        el.editor.dataset.target = data.target;
        el.editor.querySelector('[data-name="cb-editor-enabled"]').checked = data.enabled;

        // set the focus on the URL pattern input
        // (after a timeout to avoid a performance rendering bug)
        setTimeout(function(){
            el.editorSelector.focus();
        }, 400);
    }

    /**
     * get the rule's data from the editor panel 
     */
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

        // get the files list data from the elements inside the files panel
        each(el.filesList.children, function(){
            var  path = this.querySelector('input').value.trim();
            if (!path) return;
            
            data.code.files.push({
                path: path,
                type: this.dataset.type,
                ext:  this.dataset.ext
            });
        });

        // try to convert the entered URL pattern
        // if fails it will be set as an empty string (which will be blocked later)
        try{
            var testSelector = new RegExp(data.selector).test(currentPageURL);
        }
        catch(ex){
            data.selector = '';
        }

        return data;
    }

    /**
     * load the previous saved rules from the storage (on page load)
     */
    function loadRules(){
        browser.storage.local
        .get('rules')
        .then(function(_res){
            each(_res.rules, function(){

                var rule    = this;
                var ruleEl  = getTemplate('rule').querySelector('.rule');
                    ruleEl.dataset.id = rulesCounter++;

                setRuleData(ruleEl, rule);

                el.rulesList.appendChild(ruleEl);
            });
        });
    }

    /**
     * convert and return a JSON of the current rules list from the rules elements
     */
    function getRulesJSON(){

        var result = [];

        each(el.rulesList.children, function(){
            result.push(getRuleData(this));
        });

        return result;
    }

    /**
     * save the rules JSON in the storage
     */
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
        
        // check the pressed key code
        switch(_e.keyCode){

            case 83:  // S
                if (el.body.dataset.editing == 'true'){
                    
                    if (_e.ctrlKey === false) return;

                    // CTRL + S 
                    // simulate the save shortcut
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

        // the event is handled by checking the "data-name" attribute of the target element 
        switch(target.dataset.name){

            // delete a rule
            case 'btn-rule-delete': 

                // if the button was in the "confirm" state
                // the button's relative rule is removed
                if (target.dataset.confirm){
                    closest(target, '.rule').remove();
                    saveRules();
                }

                // set the "confirm" state to avoid miss-clicks
                else{
                    target.dataset.confirm = true;
                    target.onmouseleave = function(){ 
                        delete target.dataset.confirm;
                        target.onmouseleave = null;
                    };
                }
                break;

            // open the rule in the editor page
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

            // set the active tab to be visible (handled by css)
            case 'btn-tab': 
                el.tab.dataset.selected = target.dataset.for;
                break;

            // abor changes or the creation of a new rule
            case 'btn-editor-cancel': 
                delete el.body.dataset.editing;
                browser.storage.local.remove('lastSession');
                break;

            // open the editor page with empty values to create a new rule
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

            // save the editor page values to the linked rule (or a new one if not specified)
            case 'btn-editor-save': 

                var editorData = getEditorPanelData();
                var isNewRule = editorData.target === "NEW";
                var rule = null;

                if (!editorData.selector){
                    el.editorSelector.dataset.error = true;
                    return;
                }

                if (isNewRule)
                    rule = getTemplate('rule').querySelector('.rule');
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

            // remove an element from the files list (if not the last one)
            case 'btn-file-delete': 
                var file = closest(target, '.file');
                if (file && el.filesList.children.length > 1)
                    file.remove();
                break;

            // set the hostname of the current active tab address into the URL pattern input
            case 'btn-editor-gethost': 
                el.editorSelector.value = getPathHost(currentPageURL).replace(/\./g, '\\.');
                el.editorSelector.dataset.active = true;
                el.editorSelector.focus();
                break;
            
            // show the info page
            case 'btn-info-show': 
                el.body.dataset.info = true;
                break;
            
            // hides the info page
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

        // the event is handled by checking the "data-name" attribute of the target element 
        switch(target.dataset.name){

            // drag and drop logic (valid for rules and files)
            case 'do-grip': 
                var item = closest(target, 'li');
                var ghost = stringToElement('<li class="ghost"></li>');
                var parent = item.parentElement;

                var ruleIndex = getElementIndex(item);
                var Y = _e.screenY;

                var evMM = function(_e){
                    item.style.transform = 'translateY('+(_e.screenY-Y)+'px)';

                    var targetEl = closest(_e.target, function(_el){ return _el.parentElement === parent; });
                    if (targetEl === null) return;

                    var ghostIndex      = getElementIndex(ghost);
                    var targetRuleIndex = getElementIndex(targetEl);

                    if (targetRuleIndex < ghostIndex)
                        targetEl.parentElement.insertBefore(ghost, targetEl);
                    else
                        targetEl.parentElement.insertBefore(ghost, targetEl.nextElementSibling);

                    if (targetRuleIndex > ruleIndex)
                        item.style.marginTop = '0px';
                    else
                        item.style.marginTop = '';
                };
                var evMU = function(){

                    delete item.dataset.dragging;
                    item.style.cssText = "";

                    ghost.parentElement.insertBefore(item, ghost);
                    ghost.remove();

                    delete parent.dataset.dragging;

                    window.removeEventListener('mousemove', evMM);
                    window.removeEventListener('mouseup', evMU);

                    if (item.className === 'rule')
                        saveRules();
                    
                    // possible changes in a current editing process
                    if (el.body.dataset.editing)
                        setLastSession();
                };

                item.dataset.dragging = true;
                item.parentElement.insertBefore(ghost, item);

                parent.dataset.dragging = true;

                window.addEventListener('mousemove', evMM);
                window.addEventListener('mouseup', evMU);
                break;

        }

    });
    window.addEventListener('input', function(_e){

        var target = _e.target;

        // the event is handled by checking the "data-name" attribute of the target element 
        switch(target.dataset.name){

            // check the editor URL pattern input value
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

            // check the file path value to determinate if valid and the type
            case 'txt-file-path': 

                var file = closest(target, '.file');

                if (!target.value.length) {
                    file.dataset.type = '';
                    file.dataset.ext  = '';
                    return;
                }

                if (file === file.parentElement.lastElementChild)
                    el.filesList.appendChild( getTemplate('file') );

                file.dataset.type = isLocalURL(target.value.trim()) ? 'local':'remote';
                file.dataset.ext  = getPathExtension(target.value);

                var typeSelect = file.querySelector('.f-type select');
                    typeSelect.value = file.dataset.ext;
                    typeSelect.setAttribute('title', file.dataset.ext ? file.dataset.type +' - '+ file.dataset.ext.toUpperCase() : 'Unknown (will be skipped)');
                    
                break;
        }

        // possible changes in a current editing process
        if (el.body.dataset.editing)
            setLastSession();

    });
    window.addEventListener('change', function(_e){
        
        var target = _e.target;

        // the event is handled by checking the "data-name" attribute of the target element 
        switch(target.dataset.name){

            // force set the file extension type
            case 'sel-file-type': 
                var file = closest(target, '.file');
                    file.dataset.ext = target.value;

                target.setAttribute('title', file.dataset.ext ? file.dataset.type +' - '+ file.dataset.ext.toUpperCase() : 'Unknown (will be skipped)');
                break;

        }

    });

});
