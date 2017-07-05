
// 500 x 450

var editorJS    = null;
var editorCSS   = null;
var editorHTML  = null;

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
        //value: '\n\n'
    };

    var el = {
        body:           document.querySelector('#body'),
        rulesList:      document.querySelector('#rules .rules-list'),
        editor:         document.querySelector('#editor'),
        editorSelector: document.querySelector('#editor .editor-selector [data-name="txt-editor-selector"]'),
        tab:            document.querySelector('#editor .tab'),
        tabTitles:      document.querySelector('#editor .tab .tab-titles'),
        tabContent:     document.querySelector('#editor .tab .tab-contents'),
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
            target:     _data.target    || 'NEW',
            enabled:    _data.enabled   || false,
            activeTab:  _data.activeTab || 'js',
            selector:   _data.selector  || '',
            code:{
                js:     _data.code.js   || '',
                css:    _data.code.css  || '',
                html:   _data.code.html || '',
            },
        };

        editorJS.setValue(data.code.js);
        editorCSS.setValue(data.code.css);
        editorHTML.setValue(data.code.html);

        el.editorSelector.value = data.selector;
        el.editor.dataset.target = data.target;
        el.editor.querySelector('.tab').dataset.selected = data.activeTab;
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
                files:  null
            },
            active:{
                js: editorHasCode(editorJS),
                css: editorHasCode(editorCSS),
                html: editorHasCode(editorHTML),
                files: false,
            }
        };
        
        return data;
    }

    window.addEventListener('keydown', function(_e){

        if (_e.keyCode === 83 
        &&  _e.ctrlKey === true){

            if (el.body.dataset.editing == 'true'){
                console.log('CTRL + S !');
            }

            _e.preventDefault();
            _e.stopPropagation();
            return false;
        }

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
                        files: rule.querySelector('.r-data .d-files').value,
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
                        files: '[]'
                    }
                });

                el.body.dataset.editing = true;
                break;

            case 'btn-editor-save': 

                var editorData = getEditorPanelData();
                var isNewRule = editorData.target === "NEW";
                var rule = null;

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
                rule.querySelector('.r-data .d-files').value = editorData.code.files;

                rule.dataset.enabled = editorData.enabled;

                if (isNewRule){
                    rule.dataset.id = rulesCounter++;
                    el.rulesList.appendChild(rule);
                }

                delete el.body.dataset.editing;

                // saveRules(); // <--- TODO

                break;

        }
        
    });
    window.addEventListener('mousedown', function(_e){

        var target = _e.target;

        switch(target.dataset.name){

            case 'do-grip': 
                var rule = closest(target, '.rule');
                var ghost = stringToElement('<li class="rule-ghost"></li>');

                var ruleIndex = getElementIndex(rule);
                var Y = _e.screenY;

                var evMM = function(_e){
                    rule.style.transform = 'translateY('+(_e.screenY-Y)+'px)';

                    var targetRule = closest(_e.target, '.rule');
                    if (targetRule === null) return;

                    var ghostIndex      = getElementIndex(ghost);
                    var targetRuleIndex = getElementIndex(targetRule);

                    if (targetRuleIndex < ghostIndex)
                        targetRule.parentElement.insertBefore(ghost, targetRule);
                    else
                        targetRule.parentElement.insertBefore(ghost, targetRule.nextElementSibling);

                    if (targetRuleIndex > ruleIndex)
                        rule.style.marginTop = '0px';
                    else
                        rule.style.marginTop = '';
                };
                var evMU = function(){

                    delete rule.dataset.dragging;
                    rule.style.cssText = "";

                    ghost.parentElement.insertBefore(rule, ghost);
                    ghost.remove();

                    window.removeEventListener('mousemove', evMM);
                    window.removeEventListener('mouseup', evMU);
                };

                rule.dataset.dragging = true;
                rule.parentElement.insertBefore(ghost, rule);

                window.addEventListener('mousemove', evMM);
                window.addEventListener('mouseup', evMU);
                break;

        }

    });

    // DEBUG -->

    var ruleTmpl = getTemplate('rule');
    for(var ind = 0; ind < 3; ind++)
        el.rulesList.appendChild(stringToElement(ruleTmpl, {id: rulesCounter++, name: Math.random()}));

    /*each(document.querySelectorAll('.rule .d-info'), function(){
        this.dataset.active = false; //Math.random() > 0.3;
    });*/

    // <-- DEBUG 

});
