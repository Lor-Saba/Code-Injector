
// 500 x 450

var editorJS    = null;
var editorCSS   = null;
var editorHTML  = null;

var currentPageURL = 'https://www.google.it/';

window.addEventListener('load', function(){

    var rulesCounter = 0;

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

    var el = {
        body:           document.querySelector('#body'),
        rulesList:      document.querySelector('#rules .rules-list'),
        editor:         document.querySelector('#editor'),
        editorSelector: document.querySelector('#editor .editor-selector [data-name="txt-editor-selector"]'),
        editorSaveBtn:  document.querySelector('#editor [data-name="btn-editor-save"]'),
        tab:            document.querySelector('#editor .tab'),
        tabTitles:      document.querySelector('#editor .tab .tab-titles'),
        tabContent:     document.querySelector('#editor .tab .tab-contents'),
        filesList:      document.querySelector('#editor .files-list')
    };

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

    });

    function setEditorPanelData(_data){

        var data = {
            target:     _data.target     || 'NEW',
            enabled:    _data.enabled    || false,
            activeTab:  _data.activeTab  || 'js',
            selector:   _data.selector   || '',
            code:{
                js:     _data.code.js    || '',
                css:    _data.code.css   || '',
                html:   _data.code.html  || '',
                files:  _data.code.files || [],
            },
        };

        editorJS.setValue(data.code.js);
        editorCSS.setValue(data.code.css);
        editorHTML.setValue(data.code.html);

        el.filesList.innerHTML = '';
        data.code.files.push({type:'', path:''});
        each(data.code.files, function(){
            el.filesList.appendChild( 
                stringToElement(getTemplate('file', {type:this.type, value:this.path })) 
            );
        });

        el.tab.dataset.selected = data.activeTab;
        el.editorSelector.value = data.selector.trim();
        el.editorSelector.dataset.active = new RegExp(data.selector.trim()).test(currentPageURL);
        el.editorSelector.dataset.error = false;
        el.editor.dataset.target = data.target;
        el.editor.querySelector('[data-name="cb-editor-enabled"]').checked = data.enabled;

    }

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
            },
            active:{
                js: editorHasCode(editorJS),
                css: editorHasCode(editorCSS),
                html: editorHasCode(editorHTML),
                files: false,
            }
        };

        each(el.filesList.children, function(){
            var  path = this.querySelector('input').value.trim();
            if (!path) return;

            var ext = path.split('.').pop();

            var file = {
                path: path,
                type: this.dataset.type,
                ext:  ext && ['js', 'css', 'html'].indexOf(ext) !== -1 ? ext:'js'
            };

            data.code.files.push(file);
        });
        
        data.active.files = !!data.code.files.length;

        return data;
    }

    function saveRules(){

    }

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

            case 83:  // CTRL + S
                if (el.body.dataset.editing == 'true'){
                    
                    if (_e.ctrlKey === false) return;

                    el.editorSaveBtn.click();

                    _e.preventDefault();
                    _e.stopPropagation();
                    return false;
                }
                break;

            //case 9: break;

            /*case 27:  // ESC
                if (el.body.dataset.editing == 'true') ;
                    delete el.body.dataset.editing;
                break;*/

        }

        /*

        if (_e.keyCode === 83 
        &&  _e.ctrlKey === true){

            if (el.body.dataset.editing == 'true')
                el.editorSaveBtn.click();

            _e.preventDefault();
            _e.stopPropagation();
            return false;
        }
        
        if (_e.keyCode === 83 
        &&  _e.ctrlKey === true){

            if (el.body.dataset.editing == 'true')
                el.editorSaveBtn.click();

            _e.preventDefault();
            _e.stopPropagation();
            return false;
        }

        */

    });
    window.addEventListener('click', function(_e){

        var target = _e.target;

        switch(target.dataset.name){

            case 'btn-rule-delete': 
                if (target.dataset.confirm)
                    closest(target, '.rule').remove();
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

                var activeTab = '';
                     if (rule.querySelector('.color-js').dataset.active === 'true') activeTab = 'js';
                else if (rule.querySelector('.color-css').dataset.active === 'true') activeTab = 'css';
                else if (rule.querySelector('.color-html').dataset.active === 'true') activeTab = 'html';
                else if (rule.querySelector('.color-files').dataset.active === 'true') activeTab = 'files';
                else activeTab = 'js';

                setEditorPanelData({
                    target: rule.dataset.id,
                    enabled: rule.dataset.enabled === "true",
                    activeTab: activeTab,
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

                rule.querySelector('.r-name').innerHTML = editorData.selector;

                rule.querySelector('.color-js').dataset.active = editorData.active.js;
                rule.querySelector('.color-css').dataset.active = editorData.active.css;
                rule.querySelector('.color-html').dataset.active = editorData.active.html;
                rule.querySelector('.color-files').dataset.active = editorData.active.files;

                rule.querySelector('.r-data .d-js').value = editorData.code.js;
                rule.querySelector('.r-data .d-css').value = editorData.code.css;
                rule.querySelector('.r-data .d-html').value = editorData.code.html;
                rule.querySelector('.r-data .d-files').value = JSON.stringify(editorData.code.files);

                rule.dataset.enabled = editorData.enabled;
                rule.dataset.active = new RegExp(editorData.selector.trim()).test(currentPageURL);

                if (isNewRule){
                    rule.dataset.id = rulesCounter++;
                    el.rulesList.appendChild(rule);
                }

                delete el.body.dataset.editing;

                // saveRules(); // <--- TODO

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

        }
        
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
                target.dataset.active = new RegExp(target.value.trim()).test(currentPageURL);
                break;

            case 'txt-file-path': 

                var file = closest(target, '.file');

                if (!target.value.length) {
                    file.dataset.type = '';
                    return;
                }

                if (file === file.parentElement.lastElementChild)
                    el.filesList.appendChild( stringToElement(getTemplate('file', {type:'', value:''})) );

                file.dataset.type = isLocalURL(target.value.trim()) ? 'local':'remote';
                break;
        }

    });

    // local_icon:  computer
    // remote_icon: language


    // DEBUG -->

    /*var ruleTmpl = getTemplate('rule');
    for(var ind = 0; ind < 3; ind++)
        el.rulesList.appendChild(stringToElement(ruleTmpl, {id: rulesCounter++, name: Math.random()}));
    */
    /*each(document.querySelectorAll('.rule .d-info'), function(){
        this.dataset.active = false; //Math.random() > 0.3;
    });*/

    // <-- DEBUG 

});
