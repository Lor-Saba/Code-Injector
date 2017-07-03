
// 500 x 450

window.addEventListener('load', function(){

    var rulesCounter = 0;

    var editorJS    = null;
    var editorCSS   = null;
    var editorHTML  = null;

    var editorConfig = {
        cursorBlinking: "phase",
        fontSize: 11,
        folding: true,
        renderIndentGuides: true,
        renderLineHighlight: 'none',
        //value: '\n\n'
    };

    var el = {
        body:       document.querySelector('#body'),
        rulesList:  document.querySelector('#rules .rules-list'),
        editor:     document.querySelector('#editor'),
        tab:        document.querySelector('#editor .tab'),
        tabTitles:  document.querySelector('#editor .tab .tab-titles'),
        tabContent: document.querySelector('#editor .tab .tab-contents'),
    };

    require.config({ paths: { 'vs': 'script/vs' }});
    require(['vs/editor/editor.main'], function() {
        editorJS    = monaco.editor.create(document.getElementById('editor-js')    , Object.assign(editorConfig, {language: 'javascript', value: '// Type your JavaScript code here.\n\n'})  );
        editorCSS   = monaco.editor.create(document.getElementById('editor-css')   , Object.assign(editorConfig, {language: 'css', value: '/* Type your CSS code here. */\n\n'})         );
        editorHTML  = monaco.editor.create(document.getElementById('editor-html')  , Object.assign(editorConfig, {language: 'html', value: '<!-- Type your HTML code here. -->\n\n'})        );
    
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

            case 'btn-tab': 
                el.tab.dataset.selected = target.dataset.for;
                break;

            case 'btn-editor-cancel': 
                delete el.body.dataset.editing;
                break;

            case 'btn-rules-add': 
                el.body.dataset.editing = true;
                break;

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
                el.body.dataset.editing = true;
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
                    rule.style.cssText = "";;

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
        this.dataset.active = Math.random() > .3;
    });

    // <-- DEBUG 

});
