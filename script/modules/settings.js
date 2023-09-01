
var Settings = (function(){

    var data = {
        settings: {},

        ignoreStorageChange: false,
        events: {
            onInit: function(){},
            onChange: function(){}
        },
        
        loadFromStorage: function(){
            
            // get the rules list to the storage
            return browser.storage.local.get()
            .then(function(_data){
                
                if (_data.settings){
                    data.settings = Object.assign({

                        nightmode: false,
                        showcounter: false,
                        size: {
                            width:  600,
                            height: 550
                        }
        
                    }, _data.settings);
                }
            });
        },
        saveToStorage: function(_ignoreStorageChange){

            // ignore the next storage change
            data.ignoreStorageChange = _ignoreStorageChange === undefined ? true : _ignoreStorageChange;

            // save the settings list to the storage
            return browser.storage.local.set({ settings: data.settings });
        },
        getItem: function(_key){
            return data.settings[_key];
        },
        setItem: function(_key, _value){
            return data.settings[_key] = _value;
        },
        removetItem: function(_key){
            delete data.settings[_key];
        },
        init: function(){
            return new Promise(function(_ok){

                data.loadFromStorage()
                .then(function(){
                    browser.storage.onChanged.addListener(function(_data){

                        if (_data.settings && _data.settings.newValue && data.ignoreStorageChange === false){
                            settings = _data.settings.newValue;
                            data.events.onChange();
                        }

                        data.ignoreStorageChange = false;
                    });
                    data.events.onInit();
                    _ok();
                });
            });
        }
    };

    return {
        
        init: function(){
            return data.init();
        },
        getItem: function(_key){
            return data.getItem(_key);
        },
        setItem: function(_key, _value){
            return data.setItem(_key, _value);
        },
        removeItem: function(_key){
            return data.removetItem(_key);
        },
        loadFromStorage: function(){
            return data.loadFromStorage();
        },
        saveToStorage: function(){
            return data.saveToStorage();
        },
        onChanged: function(_callback) {
            if (typeof _callback === 'function') {
                data.onChange = _callback;
            }
        },
        onInit: function(_callback) {
            if (typeof _callback === 'function') {
                data.onInit = _callback;
            }
        }
    };
}());