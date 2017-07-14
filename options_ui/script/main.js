
var el;

function getRules(_cb){
    browser.storage.local.get('rules').then(function(_data){
        if (_data) _cb(_data.rules || []);
    });
}

function updateRulesCounter(){
    getRules(function(_rules){
        el.rulesCounter.textContent = _rules.length;
    });
}

window.addEventListener('load', function(_e){
    el = {
        rulesCounter: $('#rules-counter')
    };

    updateRulesCounter();

    window.addEventListener('click', function(_e){

        var target = _e.target;
        switch(target.dataset.name){

            case 'btn-clear-rules': 
                el.rulesCounter.textContent = '';
                browser.storage.local.set({ rules: [] }).then(updateRulesCounter);
                break;
            case 'btn-export': 
                getRules(function(_rules){
                    var res = copyString(JSON.stringify(_rules));
                    var li  = closest(target, 'li');

                    if (res)
                        li.dataset.result = "success";
                    else
                        li.dataset.result = "fail";
                });
                break;
            case 'btn-import': break;

        }
    });
});