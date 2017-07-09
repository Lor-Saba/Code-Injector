
(function(){

    function injectJS(_rule, _cb){
            
        var el = document.createElement('script');
            el.setAttribute('type', 'text/javascript');

        if (_rule.path){

            el.onload = _cb;
            el.onerror = function(){
                ___rules.unshift({ type: 'js', code: 'console.error("Web-Injector [JS] - Error loading: \"'+ _rule.path +'\"");'});
                _cb();
            };

            el.src = _rule.path;
            
            document.head.append(el);
        }
        else{

            el.textContent = _rule.code;

            document.head.append(el);
            
            _cb();
        }
    }
    function injectCSS(_rule, _cb){

        if (_rule.path){

            var el = document.createElement('link');

            el.setAttribute('type', 'text/css');
            el.onload = _cb;
            el.onerror = function(){
                ___rules.unshift({ type: 'js', code: 'console.error("Web-Injector [CSS] - Error loading: \"'+ _rule.path +'\"");'});
                _cb();
            };

            el.href = _rule.path;
            
            document.head.append(el);
        }
        else{

            var el = document.createElement('style');
                el.textContent = _rule.code;

            document.head.append(el);

            _cb();
        }
    }
    function injectHTML(_rule, _cb){

        if (_rule.path) _cb();
        else{

            var div = document.createElement('div');
                div.innerHTML = _rule.code;

            document.body.append(div.firstElementChild);

            _cb();
        }
    }

    function insertRules(){

        var rule = ___rules.shift();
        if (rule === undefined) return;

        switch(rule.type){

            case 'js': 
                injectJS(rule, insertRules);
                break;

            case 'css': 
                injectCSS(rule, insertRules);
                break;

            case 'html': 
                injectHTML(rule, insertRules);
                break;

        }
    }

    insertRules();

}());

