
var Settings = (function(){

    var data = {
        settings: {},

        ignoreNextChange: false,
        events: {
            onInit: function(){},
            onChange: function(){}
        },

        storageChangedHandler: function(_data){
            
            if (_data.settings && _data.settings.newValue && data.ignoreNextChange === false){
                settings = _data.settings.newValue;
                data.events.onChange();
            }
                
            data.ignoreNextChange = false;
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
        saveToStorage: function(_ignoreNextChange){

            // ignore the next storage change
            data.ignoreNextChange = _ignoreNextChange === undefined ? true : _ignoreNextChange;
            
            // save the settings list to the storage
            browser.storage.local.set({ settings: data.settings });
        },
        getItem: function(_key){
            return data.settings[_key];
        },
        setItem: function(_key, _value){
            return data.settings[_key] = _value;
        },
        init: function(){

            return new Promise(function(_ok){

                data.loadFromStorage()
                .then(function(){
                    browser.storage.onChanged.addListener(data.storageChangedHandler);
                    data.events.onInit();
                    _ok();
                });
            });
        }
    };

    return Object.assign(new function Settings(){}, {
        
        init: function(){
            return data.init();
        },
        getItem: function(_key){
            return data.getItem(_key);
        },
        setItem: function(_key, _value){
            return data.setItem(_key, _value);
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
    });
}());