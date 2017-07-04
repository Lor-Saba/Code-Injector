
function $(_selector){
    return document.querySelector(_selector);
}
function $$(_selector){
    return document.querySelectorAll(_selector);
}

function getTemplate(_name){

    var elTmpl = document.querySelector('.template[data-name="'+_name+'"]');
    if (elTmpl === null) return null;

    return elTmpl.innerHTML;
}

function each(_obj, _fn){

    if (!_obj) return;
    
    if (_obj.constructor === Object){
        for(var ind = 0, keys = Object.keys(_obj), ln = keys.length; ind < ln; ind++)
            if (_fn.call(_obj[keys[ind]], keys[ind], _obj[keys[ind]]) === false) break;
    }
    else{ //if (_obj.constructor === Array){
        for(var ind = 0, ln = _obj.length; ind < ln; ind++)
            if (_fn.call(_obj[ind], ind, _obj[ind]) === false) break;
    }
}

function closest(_el, _fn) {
    var el = _el;
    var fn = _fn;

    if (typeof fn === 'string'){
        var query = fn.trim();
        if (query[0] === '.') 
            fn = function(_el) { return _el.classList.contains(query.substr(1)); };
        else
        if (query[0] === '#') 
            fn = function(_el) { return _el.id === query.substr(1); };
    }

    while(el) if (fn(el)) return el;
                else el = el.parentElement;

    return null;
}

function stringToElement(_string, _data){

    if (_data && _data.constructor === Object){
        each(_data, function(_key){
            _string = _string.replace(new RegExp('\{'+_key+'\}', 'g'), this);
        });
    }

    var div = document.createElement('div');
        div.innerHTML = _string;

    return div.firstElementChild;
}

function getElementIndex(_el){

    var index = 0;
    var currEl = _el;

    while(currEl.previousElementSibling){
        currEl = currEl.previousElementSibling;
        index++;
    }

    return index; 
}

function editorHasCode(_editor){ 
    
    return !!_editor.getValue().replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*|<!--[\s\S]*?-->$/gm, '').trim();
    
    /*

        return new Promise(function(_ok, _ko){

            var nextScroll = 0;
            var textContent = "";

            var evScroll = _editor.onDidScrollChange(function(_e){
                evScroll.dispose();
                checkEditor();
            });

            var checkEditor = function(){

                var curScroll = _editor.getScrollTop();
                var evScroll = _editor.onDidScrollChange(function(_e){
                    evScroll.dispose();
                    checkEditor();
                });

                each(_editor.domElement.querySelectorAll('.mtk8'), function(){
                    this.remove();
                });

                nextScroll  += 300;
                textContent += _editor.domElement.querySelector('div.view-lines').textContent;

                _editor.setScrollTop(nextScroll);

                if (curScroll == _editor.getScrollTop()){
                    evScroll.dispose();
                    _ok(!!textContent.trim());
                }
            };

            if (_editor.domElement.querySelector('.margin-view-overlays').textContent.trim() === '1'){
                evScroll.dispose();
                checkEditor();
            }
            else{
                _editor.setScrollTop(0);
                _editor.setScrollTop(1);
            }
        });
    */
}