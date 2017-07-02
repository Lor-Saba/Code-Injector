
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

    require.config({ paths: { 'vs': 'script/vs' }});
    require(['vs/editor/editor.main'], function() {
        editorJS    = monaco.editor.create(document.getElementById('editor-js')    , Object.assign(editorConfig, {language: 'javascript'})  );
        editorCSS   = monaco.editor.create(document.getElementById('editor-css')   , Object.assign(editorConfig, {language: 'css'})         );
        editorHTML  = monaco.editor.create(document.getElementById('editor-html')  , Object.assign(editorConfig, {language: 'html'})        );
    });

    var el = {
        body:       document.querySelector('#body'),
        rules:      document.querySelector('#rules'),
        editor:     document.querySelector('#editor'),
        tab:        document.querySelector('#editor .tab'),
        tabTitles:  document.querySelector('#editor .tab .tab-titles'),
        tabContent: document.querySelector('#editor .tab .tab-contents'),
    };

    window.addEventListener('click', function(_e){

        var target = _e.target;

        switch(target.dataset.name){

            case 'btn-tab': 
                var key = target.dataset.for;

                setAttribute(el.tab.querySelectorAll('[data-selected]'), 'data-selected', null);
                //$('[data-selected]', el.tab).attr('data-selected', null);

                el.tabContent.querySelector('li[data-target="'+key+'"]').dataset.selected = true;
                target.dataset.selected = true;
                break;

            case 'btn-editor-hide': 
                delete el.body.dataset.editing;
                break;

            case 'btn-editor-show': 
                el.body.dataset.editing = true;
                break;

        }
    });

});
