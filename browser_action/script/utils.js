
function setAttribute(_els, _name, _value){
    
    if (!_els) return;
    if (!_name) return;

    if (_els.length === undefined)
        _els = [_els];

    for(var ind = 0, ln = _els.length; ind < ln; ind++){
        if (_value === null)
            _els[ind].removeAttribute(_name);
        else
            _els[ind].setAttribute(_name, _value);
    }
}

// simple jquery like
function $(_selector, _el){

    var els = document.querySelectorAll(_selector);
    var returnData = {

        get length(){
            return els.length;
        },

        attr: function(_name, _value){
            if (!_name) return;

            for(var ind = 0, ln = els.length; ind < ln; ind++){
                if (_value === null)
                    els[ind].removeAttribute(_name);
                else
                    els[ind].setAttribute(_name, _value);
            }

            return returnData;
        },

        each: function(_fn){
            for(var ind = 0, ln = _els.length; ind < ln; ind++)
                if (_fn.call(els[ind], ind, els[ind]) === false) break;
        }

    };

    return returnData;
} 