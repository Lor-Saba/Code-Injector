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
        value: '\n\n'
    };

    require.config({ paths: { 'vs': 'script/vs' }});

    require(['vs/editor/editor.main'], function() {
        editorJS    = monaco.editor.create(document.getElementById('editor-js')    , Object.assign(editorConfig, {language: 'javascript'})  );
        editorCSS   = monaco.editor.create(document.getElementById('editor-css')   , Object.assign(editorConfig, {language: 'css'})         );
        editorHTML  = monaco.editor.create(document.getElementById('editor-html')  , Object.assign(editorConfig, {language: 'html'})        );
    });

});
