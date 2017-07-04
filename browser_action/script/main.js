
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

                el.editor.dataset.target = rule.dataset.id;

                editorJS.setValue(rule.querySelector('.r-data .d-js').value);
                editorCSS.setValue(rule.querySelector('.r-data .d-css').value);
                editorHTML.setValue(rule.querySelector('.r-data .d-html').value);

                el.editor.querySelector('[data-name="cb-editor-enabled"]').checked = rule.dataset.enabled === "true";
                el.editorSelector.value = rule.querySelector('.r-name').textContent.trim();
                el.body.dataset.editing = true;
                break;

            case 'btn-tab': 
                el.tab.dataset.selected = target.dataset.for;
                break;

            case 'btn-editor-cancel': 
                delete el.body.dataset.editing;
                break;

            case 'btn-rules-add': 
                editorJS.setValue('// Type your JavaScript code here.\n\n' );
                editorCSS.setValue('/* Type your CSS code here. */\n\n');
                editorHTML.setValue('<!-- Type your HTML code here. -->\n\n');
    
                el.body.dataset.editing = true;
                break;

            case 'btn-editor-save': 
                var isNewRule = el.editor.dataset.target === "NEW";

               /* var ruleData = {
                    selector: el.editorSelector.value,
                    enabled: el.editor.querySelector('.editor-controls [data-name="cb-editor-enabled"]').checked,
                    code: {
                        js:{
                            value: editorJS.getValue(),
                            active: editorHasCode(editorJS)
                        },
                        css:{
                            value: editorCSS.getValue(),
                            active: editorHasCode(editorCSS)
                        },
                        html:{
                            value: editorHTML.getValue(),
                            active: editorHasCode(editorHTML)
                        }
                    }
                };*/
                
                /*if (!ruleData.selector) {
                    el.editorSelector.dataset.error = true;
                    return;
                }*/

                var rule = null;

                if (isNewRule)
                    rule = stringToElement(getTemplate('rule'));
                else
                    rule = el.rulesList.querySelector('.rule[data-id="'+el.editor.dataset.target+'"]')

                rule.querySelector('.color-js').dataset.active = editorHasCode(editorJS);
                rule.querySelector('.color-css').dataset.active = editorHasCode(editorCSS);
                rule.querySelector('.color-html').dataset.active = editorHasCode(editorHTML);

                rule.querySelector('.r-data .d-js').value   = editorJS.getValue();
                rule.querySelector('.r-data .d-css').value  = editorCSS.getValue();
                rule.querySelector('.r-data .d-html').value = editorHTML.getValue();

                rule.querySelector('.r-name').innerHTML = el.editorSelector.value.trim();

                rule.dataset.enabled = el.editor.querySelector('[data-name="cb-editor-enabled"]').checked;

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
    for(var ind = 0; ind < 10; ind++)
        el.rulesList.appendChild(stringToElement(ruleTmpl, {id: rulesCounter++, name: Math.random()}));

    each(document.querySelectorAll('.rule .d-info'), function(){
        this.dataset.active = Math.random() > 0.3;
    });

    // <-- DEBUG 

});
