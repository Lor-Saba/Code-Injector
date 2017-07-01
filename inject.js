/**//*
function insertScript(_code){

    var el = document.createElement('script');
        el.setAttribute('type', 'text/javascript');
        el.textContent = _code;

    document.head.append(el);

}
insertScript('alert(1)');

/**/
function insertRules(){

    var rule = ___rules.shift();
    if (rule === undefined) return;

    var el = document.createElement('script');
        el.setAttribute('type', 'text/javascript');

    if (rule.local){
        el.textContent = rule.code;
        document.head.append(el);
        insertRules();
    }
    else{
        el.onload = insertRules;
        el.onerror = function(){
            ___rules.unshift({ local: true, code: 'console.error("[JS-INJECTOR] Error loading: \"'+rule.url+'\"");'});
            insertRules();
        };
        el.src = rule.url;
        document.head.append(el);
    }
}

insertRules();
