
function getTemplate(_name){

    var elTmpl = document.querySelector('.template[data-name="'+_name+'"]');
    if (elTmpl === null) return null;

    return elTmpl.innerHTML;
}

function each(_obj, _fn){

    if (!_obj) return;
    
    for(var ind = 0, ln = _obj.length; ind < ln; ind++)
        if (_fn.call(_obj[ind], ind, _obj[ind]) === false) break;
}