
(function(){

    // inject a JavaScript block of code or request an external JavaScript file
    function injectJS(_rule, _cb){

        if (_rule.path){

            var el = document.createElement('script');

            el.setAttribute('type', 'text/javascript');
            el.onload = _cb;
            el.onerror = function(){
                ___rules.unshift({ type: 'js', code: 'console.error("Web-Injector [JS] - Error loading: \"'+ _rule.path +'\"");'});
                _cb();
            };

            el.src = _rule.path;
            
            document.head.append(el);
        }
        else{

            var el = document.createElement('script');
                el.textContent = _rule.code;

            document.head.append(el);
            
            _cb();
        }
    }

    // inject a CSS block of code or request an external CSS file
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

    // inject an HTML block of code 
    function injectHTML(_rule, _cb){

        // cannot request remote HTML files
        if (_rule.path) {
            ___rules.unshift({ type: 'js', code: 'console.error("Web-Injector [HTML] - Error, Cannot request remote HTML files.");'});
            _cb();
        }
        else{

            var div = document.createElement('div');
                div.innerHTML = _rule.code;

            while(div.firstChild){
                document.body.append(div.firstChild);
            }

            _cb();
        }
    }

    // Main loop to inject the selected rules by type
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

