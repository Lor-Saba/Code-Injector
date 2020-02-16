// @import "../utils/utils.js";

// manifest JSON
var manifest = browser.runtime.getManifest() || {};

// state of dragging 
var isDragging = false;

// timeout indexes
var unsavedChangesTimeout = null;
var editorCodeDotsTimeout = null;

// object of the current active tab
var currentTabData = {};

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

// DOM elements references, assigned on itialization
var el = {};


/**
 * Initialize
 */
function initialize(){
    //var p = requireMonaco();

    // get the settings
    browser.storage.local.get('settings').then(function(_data){
        
        if (_data.settings){

            // set the custom window size
            if (_data.settings.size){
                var size = _data.settings.size || { width: 500, height: 450 };
                setBodySize(size.width, size.height);
            }
        }
    });

    // on load
    window.addEventListener('load', function(){

        // DOM elements references
        el = {
            body:           document.querySelector('#body'),
            hiddenInput:    document.querySelector('#body .txt-hidden'),
            rulesList:      document.querySelector('#rules .rules-list'),
            rulesCtxMenu:   document.querySelector('#rules .ctx-menu'),
            editor:         document.querySelector('#editor'),
            editorSelector: document.querySelector('#editor .editor-selector [data-name="txt-editor-selector"]'),
            editorSaveBtn:  document.querySelector('#editor [data-name="btn-editor-save"]'),
            tab:            document.querySelector('#editor .tab'),
            tabContents:    document.querySelector('#editor .tab .tab-contents'),
            filesList:      document.querySelector('#editor .files-list'),
            resizeLabelW:   document.querySelector('#resize .r-size-width'),
            resizeLabelH:   document.querySelector('#resize .r-size-height'),
            infoTitle:      document.querySelector('#info .info-header .ih-title'),
        };

        // listen for background.js messages
        browser.runtime.onMessage.addListener(handleOnMessage);

        // request the active tab info
        browser.tabs.query({active: true, currentWindow: true}).then(function(_tabs){

            // request the active tabData 
            browser.runtime.sendMessage({
                action: 'get-current-tab-data',
                tabId: _tabs[0].id
            });      
        });

        // request monaco editor
        requireMonaco().then(function(){

            // initialize the editors
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
            editorJS.onDidFocusEditorWidget(onFocus);
            editorCSS.onDidFocusEditorWidget(onFocus);
            editorHTML.onDidFocusEditorWidget(onFocus);
    
            editorJS.onDidBlurEditorWidget(onBlur);
            editorCSS.onDidBlurEditorWidget(onBlur);
            editorHTML.onDidBlurEditorWidget(onBlur);
    
            // assign names to the editors inputarea
            document.querySelector('#editor-js .inputarea').dataset.name = "txt-editor-inputarea";
            document.querySelector('#editor-css .inputarea').dataset.name = "txt-editor-inputarea";
            document.querySelector('#editor-html .inputarea').dataset.name = "txt-editor-inputarea";

            // resize the monaco editors
            editorJS.layout();
            editorCSS.layout();
            editorHTML.layout();
    
            // stop loading
            delete document.body.dataset.loading;
            
            // check for a previous unsaved session (and restore it)
            browser.storage.local.get('lastSession').then(function(_data){

                if (_data.lastSession) {
                    setEditorPanelData(_data.lastSession);
                    el.body.dataset.editing = true;
                }
            });

            //if (el.infoTitle && manifest.description)
            //    el.infoTitle.dataset.description = manifest.description.trim().replace(/\(.*?\)/, '');
            
        });
        
        // set info page details
        if (el.infoTitle && manifest.version){
            el.infoTitle.dataset.version = 'v'+ manifest.version;
        }
    });
}

/**
 * require monaco editor scripts with promise
 */
function requireMonaco(){
    return new Promise(function(_resolve){
        require.config({ paths: { 'vs': '../script/vs' }});
        require(['vs/editor/editor.main'], _resolve);
    });
}

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

        // filter empty files
        each(el.filesList.children, function(){
            var input = this.querySelector('input');

            if (!(input && input.value.trim())) return;
            
            data.files.push(1);
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
        if (el.body.dataset.editing
        &&  isDragging === false){
            browser.storage.local.set({
                lastSession: getEditorPanelData()
            });
        }
    }, 750);
}

/**
 * set the popup window size
 * 
 * @param {number} _width 
 * @param {number} _height 
 */
function setBodySize(_width, _height){

    // set the new body size
    document.body.style.width  = _width  +'px';
    document.body.style.height = _height +'px';

    // set the editors container height
    var el = document.querySelector('.tab .tab-contents');
        el.style.height = (_height - 130) +'px';

    // resize the monaco editors
    if (editorJS) editorJS.layout();
    if (editorCSS) editorCSS.layout();
    if (editorHTML) editorHTML.layout();
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

        enabled:        _el.dataset.enabled === 'true',
        onLoad:         _el.dataset.onload === 'true',
        topFrameOnly:   _el.dataset.topframeonly === 'true',
        selector:       _el.querySelector('.r-name').textContent.trim(),

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

    _el.querySelector('.r-name').textContent = _data.selector;

    _el.querySelector('.color-js').dataset.active = containsCode(_data.code.js);
    _el.querySelector('.color-css').dataset.active = containsCode(_data.code.css);
    _el.querySelector('.color-html').dataset.active = containsCode(_data.code.html);
    _el.querySelector('.color-files').dataset.active = _data.code.files.length > 0;

    _el.querySelector('.r-data .d-js').value = _data.code.js;
    _el.querySelector('.r-data .d-css').value = _data.code.css;
    _el.querySelector('.r-data .d-html').value = _data.code.html;
    _el.querySelector('.r-data .d-files').value = JSON.stringify(_data.code.files);

    _el.dataset.enabled      = _data.enabled === undefined ? true : _data.enabled;
    _el.dataset.onload       = _data.onLoad === undefined ? true : _data.onLoad;
    _el.dataset.topframeonly = _data.topFrameOnly === undefined ? true : _data.topFrameOnly;
    _el.dataset.active       = new RegExp(_data.selector.trim()).test(currentTabData.topURL);
    _el.dataset.innerActive  = false;

    if (_el.dataset.topframeonly === 'false') {
        each(currentTabData.innerURLs, function(){
            if (new RegExp(_data.selector.trim()).test(this)) {
                _el.dataset.innerActive = true;
            }
        });        
    }
}

/**
 * set a rule's data to the editor panel 
 * 
 * @param {Object} _data 
 */
function setEditorPanelData(_data){

    var data = {
        target:         _data.target        || 'NEW',
        onLoad:         _data.onLoad        || false,
        enabled:        _data.enabled       || false,
        selector:       _data.selector      || '',
        topFrameOnly:   _data.topFrameOnly  || false,

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
    emptyElement(el.filesList);
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
    el.editorSelector.dataset.active = data.selector.trim() ? new RegExp(data.selector.trim()).test(currentTabData.topURL) : false;
    el.editorSelector.dataset.error = false;
    el.editor.dataset.target = data.target;
    el.editor.querySelector('[data-name="cb-editor-enabled"]').checked = data.enabled;
    el.editor.querySelector('[data-name="cb-editor-onload"]').checked = data.onLoad;
    el.editor.querySelector('[data-name="cb-editor-topframeonly"]').checked = data.topFrameOnly;

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

        target:         el.editor.dataset.target,
        enabled:        el.editor.querySelector('[data-name="cb-editor-enabled"]').checked,
        onLoad:         el.editor.querySelector('[data-name="cb-editor-onload"]').checked,
        topFrameOnly:   el.editor.querySelector('[data-name="cb-editor-topframeonly"]').checked,
        selector:       el.editorSelector.value.trim(),

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
        var testSelector = new RegExp(data.selector).test(currentTabData.topURL);
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

            var rule = this;
            var ruleEl = getTemplate('rule').querySelector('.rule');
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
    el.body.dataset.saving = true;

    browser.storage.local.set({
        rules: getRulesJSON()
    })
    .then(function(){
        el.body.dataset.saving = false;
    });
}

/**
 * hide the action contextmenu 
 */
function hideRuleContextMenu(){

    // hide in progress
    if (el.rulesCtxMenu.dataset.hidden === "progress") return;

    el.rulesList.dataset.actionvisible = false;
    each(el.rulesList.querySelectorAll('[data-actionvisible]'), function(){
        this.dataset.actionvisible  = false;
    });

    
    el.rulesCtxMenu.dataset.hidden = "progress";
    setTimeout(function(){
        el.rulesCtxMenu.dataset.hidden = true;
    }, 200);
}

/**
 * show the action contextmenu 
 * @param {object} _config 
 */
function showRuleContextMenu(_config){

    // rule element required
    if (!_config.el) return;
    
    // highlight the linked rule
    el.rulesList.dataset.actionvisible = true;
    _config.el.dataset.actionvisible  = true;

    // set the contextmenu position
    var ul = el.rulesCtxMenu.querySelector('ul');
    
    ul.style.cssText = '';
    ul.style.right = (window.innerWidth - _config.x) +'px';
    
    if (window.innerHeight - _config.y < 248){
        ul.style.bottom = (window.innerHeight - _config.y) +'px';
        el.rulesCtxMenu.dataset.reversed = true;
    }
    else{
        ul.style.top = _config.y +'px';
        el.rulesCtxMenu.dataset.reversed = false;
    }

    // reference the rule "enabled" state
    el.rulesCtxMenu.querySelector('li[data-name="btn-rule-enabled"]').dataset.enabled = _config.el.dataset.enabled;

    // reference the rule id
    el.rulesCtxMenu.dataset.id = _config.el.dataset.id;

    // show the context menu
    el.rulesCtxMenu.dataset.hidden = false;
}

/**
 * 
 * @param {object} _mex 
 * @param {object} _sender 
 * @param {function} _callback 
 */
function handleOnMessage(_mex, _sender, _callback){
    
    // fallback
    _callback = typeof _callback === 'function' ? _callback : function(){};

    // split by action 
    switch(_mex.action){

        case 'inject': 

            var elOptInject = el.rulesCtxMenu.querySelector('[data-name="btn-rule-inject"]');
                elOptInject.onmouseleave = function(){
                    delete elOptInject.dataset.action;
                };

            if (_mex.success){
                elOptInject.dataset.action = "success";
            }
            else{
                elOptInject.dataset.action = "fail";
            }

            break;

        case 'get-current-tab-data': 
            currentTabData = _mex.data || { topURL: '', innerURLs: [] };
            loadRules();
            break;
    }

    _callback();

    // return true to define the response as "async"
    return true;
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

        case 9: // TAB

            var target  = _e.target;
            var reverse = _e.shiftKey;
            var force   = _e.ctrlKey;                

            if (el.body.dataset.editing == 'true') 
            switch(target.dataset.name){

                case 'txt-editor-selector': 
                    switch(el.tab.dataset.selected){

                        case 'js':
                            editorJS.domElement.querySelector('textarea.inputarea').focus();
                            break;

                        case 'css':
                            editorCSS.domElement.querySelector('textarea.inputarea').focus();
                            break;

                        case 'html':
                            editorHTML.domElement.querySelector('textarea.inputarea').focus();
                            break;

                        case 'files':
                            if (reverse)
                                el.filesList.lastElementChild.querySelector('input').focus();
                            else
                                el.filesList.firstElementChild.querySelector('input').focus();
                            break;
                    }                        
                    break;

                case 'txt-editor-inputarea': /* // TODO: [Do not work on linux]
                    if (!force) break;

                    var li = closest(target, 'li');

                    if (!li) break;

                    el.hiddenInput.focus();

                    switch(li.dataset.target){

                        case 'js': 
                            if (reverse){
                                el.tab.dataset.selected = 'files';

                                setTimeout(function(){
                                    el.filesList.lastElementChild.querySelector('input').focus();
                                    el.tab.dataset.focus = true;
                                }, 200);
                            }
                            else{
                                el.tab.dataset.selected = 'css';

                                setTimeout(function(){
                                    editorCSS.domElement.querySelector('textarea.inputarea').focus();
                                    el.tab.dataset.focus = true;
                                }, 200);
                            }
                            break;

                        case 'css': 
                            if (reverse){
                                el.tab.dataset.selected = 'js';

                                setTimeout(function(){
                                    editorJS.domElement.querySelector('textarea.inputarea').focus();
                                    el.tab.dataset.focus = true;
                                }, 200);
                            }
                            else{
                                el.tab.dataset.selected = 'html';

                                setTimeout(function(){
                                    editorHTML.domElement.querySelector('textarea.inputarea').focus();
                                    el.tab.dataset.focus = true;
                                }, 200);
                            }
                            break;

                        case 'html': 
                            if (reverse){
                                el.tab.dataset.selected = 'css';

                                setTimeout(function(){
                                    editorCSS.domElement.querySelector('textarea.inputarea').focus();
                                    el.tab.dataset.focus = true;
                                }, 200);
                            }
                            else{
                                el.tab.dataset.selected = 'files';

                                setTimeout(function(){
                                    el.filesList.firstElementChild.querySelector('input').focus();
                                    el.tab.dataset.focus = true;
                                }, 200);
                            }
                            break;
                    }*/
                    break;
                    
                case 'txt-file-path': 
                    var file = closest(target, '.file');

                    if (!file) break;

                    if (force){
                        if (reverse){
                            el.tab.dataset.selected = 'html';

                            setTimeout(function(){
                                editorHTML.domElement.querySelector('textarea.inputarea').focus();
                                el.tab.dataset.focus = true;
                            }, 200);
                        }
                        else{
                            el.tab.dataset.selected = 'js';

                            setTimeout(function(){
                                editorJS.domElement.querySelector('textarea.inputarea').focus();
                                el.tab.dataset.focus = true;
                            }, 200);
                        }
                        break;
                    }

                    if (reverse){
                        if (file.previousElementSibling)
                            file.previousElementSibling.querySelector('input').focus();
                        else
                            el.editorSelector.focus();
                    }
                    else{
                        if (file.nextElementSibling)
                            file.nextElementSibling.querySelector('input').focus();
                        else
                            el.editorSelector.focus();
                    }

                    break;

            }

            _e.preventDefault();
            _e.stopPropagation();
            return false;
            break;

        case 83: // S

            if (el.body.dataset.editing == 'true'){
                
                if (_e.ctrlKey === false && _e.metaKey === false) return;

                // CTRL + S  ||  COMMAND + S
                // simulate the save shortcut
                el.editorSaveBtn.click();

                _e.preventDefault();
                _e.stopPropagation();
                return false;
            }
            break;

        case 27: // ESC

            // close the editor page with SHIFT + ESC
            if (_e.shiftKey)
                delete el.body.dataset.editing;

            // Close the info page with just ESC
            delete el.body.dataset.info;

            _e.preventDefault();
            _e.stopPropagation();
            return false;
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

        // show the action contextmenu of a rule
        case 'btn-rule-action': 

            showRuleContextMenu({ 
                el: closest(target, '.rule'),
                x: _e.pageX, 
                y: _e.pageY
            }); 
            break;

        // delete a rule
        case 'btn-rule-delete': 

            // if the button was in the "confirm" state
            // the button's relative rule is removed
            if (target.dataset.confirm){ 
                
                // get the rule element by using the id saved into the contextmen
                var elRule = document.querySelector('.rule[data-id="'+el.rulesCtxMenu.dataset.id+'"]');
                if (elRule === null) return;

                // start the slide animation
                elRule.dataset.removing = true;

                // wait few ms to let the animation end
                setTimeout(function(){
                    elRule.remove();
                    saveRules();
                }, 200);

                // hide the contextmenu
                hideRuleContextMenu();
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

            // get the rule element by using the id saved into the contextmen
            var elRule = document.querySelector('.rule[data-id="'+el.rulesCtxMenu.dataset.id+'"]');
            if (elRule === null) return;

            setEditorPanelData({
                target:         elRule.dataset.id,
                enabled:        elRule.dataset.enabled === "true",
                onLoad:         elRule.dataset.onload === "true",
                topFrameOnly:   elRule.dataset.topframeonly === "true",
                selector:       elRule.querySelector('.r-name').textContent.trim(),
                code:{
                    js: elRule.querySelector('.r-data .d-js').value,
                    css: elRule.querySelector('.r-data .d-css').value,
                    html: elRule.querySelector('.r-data .d-html').value,
                    files: JSON.parse(elRule.querySelector('.r-data .d-files').value),
                }
            });

            // hide the contextmenu
            hideRuleContextMenu();

            // switch to the editor page
            el.body.dataset.editing = true;
            break;

        // open the rule in the editor page
        case 'btn-rule-movetop':

            // get the rule element by using the id saved into the contextmen
            var elRule = document.querySelector('.rule[data-id="'+el.rulesCtxMenu.dataset.id+'"]');
            if (elRule === null) return;

            // move
            elRule.parentElement.insertBefore(elRule, elRule.parentElement.children[0]);

            // smooth scroll
            el.rulesList.scroll({
                top: 0, 
                left: 0, 
                behavior: 'smooth' 
            });

            // save the rules
            saveRules();
                        
            // hide the contextmenu
            hideRuleContextMenu();
            break;

        // open the rule in the editor page
        case 'btn-rule-movebottom':

            // get the rule element by using the id saved into the contextmen
            var elRule = document.querySelector('.rule[data-id="'+el.rulesCtxMenu.dataset.id+'"]');
            if (elRule === null) return;

            // move
            elRule.parentElement.append(elRule);
            
            // smooth scroll
            el.rulesList.scroll({
                top: el.rulesList.scrollHeight, 
                left: 0, 
                behavior: 'smooth' 
            });
            
            // save the rules
            saveRules();

            // hide the contextmenu
            hideRuleContextMenu();
            break;

        // open the rule in the editor page
        case 'btn-rule-enabled':

            // get the rule element by using the id saved into the contextmen
            var elRule = document.querySelector('.rule[data-id="'+el.rulesCtxMenu.dataset.id+'"]');
            if (elRule === null) return;

            // reference the rule "enabled" state
            var ctxOpt = el.rulesCtxMenu.querySelector('li[data-name="btn-rule-enabled"]');
            var state = ctxOpt.dataset.enabled == "true" ? false : true;

            // set the ned enabled state to both the rule element and the contextmenu option
            ctxOpt.dataset.enabled = state;
            elRule.dataset.enabled = state;

            // save the rules
            saveRules();
            break;

        // open the rule in the editor page
        case 'btn-rule-inject':

            // get the rule element by using the id saved into the contextmen
            var elRule = document.querySelector('.rule[data-id="'+el.rulesCtxMenu.dataset.id+'"]');
            if (elRule === null) return;

            // get the rule data
            var ruleData = getRuleData(elRule);

            // send the rule data to the background script which will handle the injection
            browser.runtime.sendMessage({
                action: 'inject',
                rule: ruleData
            });
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
                onLoad:  true,
                topFrameOnly: true,
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
            var elRule = null;

            if (!editorData.selector){
                el.editorSelector.dataset.error = true;
                return;
            }

            if (isNewRule)
                elRule = getTemplate('rule').querySelector('.rule');
            else
                elRule = el.rulesList.querySelector('.rule[data-id="'+el.editor.dataset.target+'"]');

            setRuleData(elRule, editorData);

            if (isNewRule){
                elRule.dataset.id = rulesCounter++;
                el.rulesList.appendChild(elRule);

                setTimeout(function(){
                    delete elRule.dataset.new;
                }, 400);
            }

            delete el.body.dataset.editing;

            saveRules();

            browser.storage.local.remove('lastSession');
            break;

        // remove an element from the files list (if not the last one)
        case 'btn-file-delete': 
            var file = closest(target, '.file');
            if (file && el.filesList.children.length > 1){
                file.dataset.removing = true;

                setTimeout(function(){
                    file.remove();
                }, 200);
            }
            break;

        // set the hostname of the current active tab address into the URL pattern input
        case 'btn-editor-gethost': 
            el.editorSelector.value = getPathHost(currentTabData.topURL).replace(/\./g, '\\.');
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

        // hides the info page
        case 'btn-rule-show-contextmenu': 
            el.rulesList.dataset.actionvisible = true;
            target.dataset.actionvisible = true;
            break;

        // hides the action contextmenu
        case 'ctx-background':

            // hide the contextmenu
            hideRuleContextMenu();
            break;

        case 'btn-general-options-show':

            // open the Web Extension option page
            browser.runtime.openOptionsPage();
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

        // resize the window
        case 'window-resize-grip': 
            
            // save the current window size and cursor position
            var prevData = {
                x: _e.screenX,
                y: _e.screenY,
                w: window.innerWidth,
                h: window.innerHeight
            };

            // display the current size
            el.resizeLabelW.textContent = window.innerWidth;
            el.resizeLabelH.textContent = window.innerHeight;

            var evMM = function(_e){

                // set the new body size
                document.body.style.width  = prevData.w + (prevData.x - _e.screenX) +'px';
                document.body.style.height = prevData.h + (_e.screenY - prevData.y) +'px';

                // display the new size
                el.resizeLabelW.textContent = window.innerWidth;
                el.resizeLabelH.textContent = window.innerHeight;
            };
            var evMU = function(){

                // set the editors container height
                el.tabContents.style.height = (window.innerHeight - 130) +'px';

                // reset the css
                delete document.body.dataset.resizing;

                // hide the resize view
                editorJS.layout();
                editorCSS.layout();
                editorHTML.layout();

                // save the new window size into the storage 
                browser.storage.local.get('settings').then(function(_data){
                    
                    var settings = {};

                    // get the local settings object if exist
                    if (_data.settings)
                        settings = _data.settings;

                    // set the new size
                    settings.size = {
                        width:  window.innerWidth,
                        height: window.innerHeight
                    };

                    // push in the storage
                    browser.storage.local.set({ settings: settings });
                });

                // remove the events
                window.removeEventListener('mousemove', evMM);
                window.removeEventListener('mouseup', evMU);
            };
            
            // show the resize view
            document.body.dataset.resizing = true;

            // set the global events
            window.addEventListener('mousemove', evMM);
            window.addEventListener('mouseup', evMU);
            break;

        // drag and drop logic (valid for rules and files)
        case 'do-grip': 

            isDragging = true;
            clearSelection();

            var item    = closest(target, 'li');
            var parent  = item.parentElement;
            var ghost   = getTemplate('ghost').children[0];

            //var lastUpdate = Date.now();
            //var updateFrequency = 1000 / 90;

            var ruleIndex = getElementIndex(item);
            var Y = _e.screenY;

            var evMM = function(_e){

                //var timestampNow = Date.now();
                //if (timestampNow - lastUpdate > updateFrequency){
                //    lastUpdate = timestampNow;
                    item.style.transform = 'translateY('+(_e.screenY-Y)+'px)';
                //}

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

                isDragging = false;
                clearSelection();
                
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
                target.dataset.active = target.value.trim() ? new RegExp(target.value.trim()).test(currentTabData.topURL) : false;
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

            if (file === file.parentElement.lastElementChild){
                var newFile = getTemplate('file').children[0];
                    newFile.dataset.new = true;

                el.filesList.appendChild(newFile);

                setTimeout(function(){
                    delete newFile.dataset.new;
                }, 200);
            }

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

// start ->
initialize();