
var el;

function getRules(_cb){
    browser.storage.local.get('rules').then(function(_data){
        if (_data) _cb(_data.rules || []);
    });
}

window.addEventListener('load', function(_e){
    el = {
        rulesCounter: $('#rules-counter')
    };

    getRules(function(_rules){
        el.rulesCounter.textContent = _rules.length;
    });

    window.addEventListener('click', function(_e){

        var target = _e.target;
        switch(target.dataset.name){

            case 'btn-clear-rules': break;
            case 'btn-export': 
                getRules(function(_rules){
                    var res = copyString(JSON.stringify(_rules));
                    console.log(res);
                });
                break;
            case 'btn-import': break;

        }
    });
});