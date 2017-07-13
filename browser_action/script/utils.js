
function $(_selector){
    return document.querySelector(_selector);
}
function $$(_selector){
    return document.querySelectorAll(_selector);
}

function addEvent(_type, _data){

    var fn = typeof _data === 'function' ? _data : function(_e){

        var target = _e.target;
        
        if (_data[target.dataset.name])
            _data[target.dataset.name].call(target, _e);

    };

    return window.addEventListener(_type, fn);
}

function getTemplate(_name, _data){

    var elTmpl = document.querySelector('.template[data-name="'+_name+'"]');
    if (elTmpl === null) return null;

    var template = elTmpl.innerHTML;

    if (_data && _data.constructor === Object){
        each(_data, function(_key){
            template = template.replace(new RegExp('\{'+_key+'\}', 'g'), this);
        });
    }

    return template;
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
        else
            fn = function(_el) { return _el.tagName === query.toUpperCase(); };
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
}

function isLocalURL(_path){
    return !/^(?:[a-z]+:)?\/\//i.test(_path);
}

function getPathExtension(_path){

    if (!_path) return '';

    var splitted = _path.trim().split('.');
    var ext = splitted.length > 1 && splitted[0] && (splitted.pop() || '').toLowerCase();
    if (ext === false) ext = '';

    return ext && ['js', 'css', 'html'].indexOf(ext) !== -1 ? ext : '';
}

var copyString = (function(){

    var el = document.createElement('textarea');
        el.id = "clipboard";
        el.setAttribute('tabindex', '-1');

    return function copyString(_string){

        document.body.appendChild(el);

        el.value = String(_string);
        el.select();
        var res = document.execCommand("copy");

        document.body.focus();

        return res;
    };

}());