
// 500 x 450

window.addEventListener('load', function(){

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
                var key = target.dataset.for;

                //target.dataset.selected = true;
                el.tab.dataset.selected = key;
                break;

            case 'btn-editor-cancel': 
                delete el.body.dataset.editing;
                break;

            case 'btn-rules-add': 
                el.body.dataset.editing = true;
                break;

            case 'btn-rule-edit':
                el.body.dataset.editing = true;
                break;

        }
        
    });

    var ruleTmpl = getTemplate('rule');
    for(var ind = 0; ind < 5; ind++)
        el.rulesList.innerHTML += ruleTmpl

    each(document.querySelectorAll('.rule .d-info'), function(){
        this.dataset.active = Math.random() > .3;
    });

});
