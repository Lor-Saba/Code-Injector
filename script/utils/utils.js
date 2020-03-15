
/** 
 * get the requested template 
 * 
 * @param {string} _name 
 * @param {function} _cb 
 */
function getTemplate(_name, _cb){

    var elTmpl = document.querySelector('.template[data-name="'+_name+'"]');
    if (elTmpl === null) return null;

    var template = elTmpl.content.cloneNode(true); 
    if (template === undefined) return null;

    if (typeof _cb === 'function') _cb(template);

    return template;
}

/** 
 * loop an array/object 
 * 
 * @param {array|object|HTMLElementsCollection} _obj 
 * @param {function} _fn 
 */
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

/** 
 * Search from the _el parents the corresponding element with the _fn 
 * 
 * @param {HTMLElement} _el 
 * @param {string|function} _fn 
 */
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

/**
 * remove the highlight from the page
 */
function clearSelection(){

    if (window.getSelection) 
        window.getSelection().removeAllRanges();

    else 
    if (document.selection)
        document.selection.empty();
}

/** 
 * convert a string to an DOM Element parsing it 
 * with a set of given parameters to be replaced 
 * 
 * @param {string} _string 
 * @param {object} _data 
 */
function stringToElement(_string, _data){

    if (_data && _data.constructor === Object){
        each(_data, function(_key){
            _string = _string.replace(new RegExp('\{'+_key+'\}', 'g'), this);
        });
    }

    var parser = new DOMParser();
    var doc = parser.parseFromString(_string, "text/html");

    return doc.body.firstElementChild;
}

/** 
 * remove every child nodes from the given element
 * 
 * @param {HTMLElement} _element 
 */
function emptyElement(_element){

    if (!_element) 
        return;

    while (_element.firstChild)
        _element.removeChild(_element.firstChild);
}

/** 
 * get the Element position index in the parent's childs list
 * 
 * @param {Element} _el 
 */
function getElementIndex(_el){

    var index = 0;
    var currEl = _el;

    while(currEl.previousElementSibling){
        currEl = currEl.previousElementSibling;
        index++;
    }

    return index; 
}

/** 
 * check if the given editor contains actual code (tripping the comments)
 * 
 * @param {MonacoEditor} _editor 
 */
function editorHasCode(_editor){ 
    return containsCode(_editor.getValue());
}

/** 
 * check if the given scring contains code (tripping the comments)
 * 
 * @param {string} _string 
 */
function containsCode(_string){
    return !!_string.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*|<!--[\s\S]*?-->$/gm, '').trim();
}

/** 
 * check if the given _path is local or remote 
 * 
 * @param {string} _path 
 */
function isLocalURL(_path){
    return !/^(?:[a-z]+:)?\/\//i.test(_path);
}

/** 
 * get the extension of a given string path (only "js", "css", "html" allowed)
 * 
 * @param {string} _path 
 */
function getPathExtension(_path){

    if (!_path) return '';

    try{
        _path = _path.trim();
        _path = isLocalURL(_path) ? 'file://local/'+_path : 'https://'+_path;

        var url = new URL(_path);
        var spl = url.pathname.split('.');
        var ext = spl.length > 1 && spl[0] && (spl.pop() || '').toLowerCase();
        if (ext === false) ext = '';

        return ext && ['js', 'css', 'html'].indexOf(ext) !== -1 ? ext : '';
    }
    catch(ex){
        return '';
    }    
    
    /*
    if (!_path) return '';

    var splitted = _path.trim().split('.');
    var ext = splitted.length > 1 && splitted[0] && (splitted.pop() || '').toLowerCase();
    if (ext === false) ext = '';

    return ext && ['js', 'css', 'html'].indexOf(ext) !== -1 ? ext : '';
    */
}

/**
 * remove HTML parts from a given string
 * 
 * @param {string} _string 
 */
function stripHTMLFromString(_string){
    var doc = new DOMParser().parseFromString(_string, 'text/html');
    return doc.body.textContent || "";
}

/**
 * parse the URL address of a given path
 * 
 * @param {*} _path 
 */
function parseURL(_path){

    var result = null;

    try{
        result = new URL(_path); 
    }
    catch(ex){}

    return result;
}

/** 
 * get the hostname of a given path
 * 
 * @param {string} _path 
 */
var getPathHost = (function(){
    
    var a = null;

    if (typeof document !== 'undefined' && document.createElement)
        a = document.createElement('a');

    return function(_path){

        if (!a) return _path;

        a.href = _path;

        return a.hostname;
    };

}());

/** 
 * download a text string as file
 * 
 * @param {string} _fileName 
 * @param {string} _textContent 
 */
var downloadText = (function(){
    
    var a = null;

    if (typeof document !== 'undefined' && document.createElement)
        a = document.createElement('a');
    
    return function(_fileName, _textContent){

        if (!a) return false;

        _fileName    = _fileName    || 'codeInjector';
        _textContent = _textContent || '';

        a.setAttribute('download', _fileName);
        a.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(_textContent));

        a.style.display = 'none';

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        return true;
    };

}());

/**
 * Flatten an Object
 * 
 * From: 
 *  { a: { b: 1, c: 2 }, d: true }
 * To:
 *  { a.b: 1, a.c: 2, d: true }
 * 
 * @param {object} _target 
 */
function flatten (_target){

    var separator = '.';
    var result = {};

    function step(_obj, _prev) {

        each(_obj, function(_key){

            var value = _obj[_key];
            var type = Object.prototype.toString.call(value);
            var isobject = type === '[object Object]' || type === '[object Array]';
            var newKey = _prev ? _prev + separator + _key : _key;

            if (isobject && Object.keys(value).length) {
                return step(value, newKey)
            }

            result[newKey] = value;
        });
    }

    step(_target);

    return result;
}

/**
 * Unflatten an Object
 * 
 * From: 
 *  { a.b: 1, a.c: 2, d: true }
 * To:
 *  { a: { b: 1, c: 2 }, d: true }
 * 
 * @param {object} _target 
 */
function unflatten(_target) { 

    var separator = '.';
    var result = {};
    
    function getkey(_key) {
        var parsedKey = Number(_key);

        return isNaN(parsedKey) || _key.indexOf('.') !== -1 ? _key : parsedKey;
    };

    each(_target, function (_key) {

        var split = _key.split(separator);
        var key1 = getkey(split.shift());
        var key2 = getkey(split[0]);
        var recipient = result;

        while(key2 !== undefined) {
            if (recipient[key1] === undefined) {
                recipient[key1] = typeof key2 === 'number' ? [] : {};
            }

            recipient = recipient[key1];

            if (split.length > 0) {
                key1 = getkey(split.shift())
                key2 = getkey(split[0])
            }
        }

        recipient[key1] = _target[_key];
    });

    return result
}

// https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
// https://developer.mozilla.org/en-US/docs/Web/API/FileReader
/**
 * @param {string} _path    
 * @param {boolean} _local  
 * @param {function} _cb    
 */
function readFile(_path, _cb){

    _path = 'file://'+ _path;

    try{
        
        fetch(_path, { mode: 'same-origin' })
    
        .then(
            function(_res) {
                return _res.blob();
            },
            function(_ex){

                // fallback to XMLHttpRequest
                var xhr = new XMLHttpRequest();

                xhr.onload = function() {
                    _cb({ success: true, path: _path, response: xhr.response });
                };
                xhr.onerror = function(error) {
                    _cb({ success: false, path: _path, response: null, message: 'The browser can not load the file "'+_path+'". Check that the path is correct or for file access permissions.' });
                };

                xhr.open('GET', _path);
                xhr.send();

                throw "FALLBACK";
            }
        )
    
        .then(
            function(_blob) {

                if (!_blob) return _cb({ success: false, path: _path, response: null, message: '' });

                var reader = new FileReader();
    
                reader.addEventListener("loadend", function() {
                    _cb({ success: true, path: _path, response: this.result });
                });
                reader.addEventListener("error", function() {
                    _cb({ success: false, path: _path, response: null, message: 'Unable to read the file "'+_path+'".' });
                });
    
                reader.readAsText(_blob);
            },
            function(_ex){
                if (_ex !== "FALLBACK")
                    _cb({ success: false, path: _path, response: null, message: 'The browser can not load the file "'+_path+'".' });
            }
        );
    }
    catch(ex){
        _cb({ success: false, path: _path, response: null, message: 'En error occurred while loading the file "'+_path+'".' });
    }
}

/**
 * Generates an unique ID
 * note: the collision is not null but it's almost impossible
 */
function generateID(){
    
    return [
        Math.random().toString(16).slice(2),
        Math.random().toString(16).slice(2),
        Math.random().toString(16).slice(2),
        Math.random().toString(16).slice(2)
    ].join('').slice(0, 32);
}