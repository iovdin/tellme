_.mixin({
    get : function(obj, path) {
        if(!_.isString(path)) {
            return undefined;
        }
        var apath = path.split("."); 
        return _.reduce(apath, function(memo, item){
            //console.log("reduce", memo, item);
            if( _.isObject(memo) && _.has(memo, item) ) {
                return memo[item];
            }
            if(_.isString(memo))
                return memo;
            return  undefined;
        }, obj);
    }
});

i18n = function(options){
    var locale = i18n.getLocale();
    if (_.isString(options)) {
        return _.get(i18n.texts, locale + "." + options) || options;
    } 
    //console.log("i18n this", this, options);
    if(this.locale) {
        _.extend(this, Template.parentData(1));
        if(this.locale == locale)
            return Template._case_default;
        return null;
    }
    if(_.isObject(options)){
        if(options[locale]) return options[locale];
        if(options.hash[locale]) return options.hash[locale];
    } 

    return 'unknown_key';
}

i18n.forceLocale = 'en_US';
i18n.defaultLocale = "en_US";

if(Meteor.isClient){
    i18n.countryDep = new Tracker.Dependency
    Template.registerHelper("i18n", i18n);

    HTTP.get("http://ipinfo.io/json", {}, function(err, result){
        //console.log("got country", result.data.country);
        if(i18n.country != result.data.country) {
            i18n.country = result.data.country;
            i18n.countryDep.changed();
        }
    });
}

i18n.country2locale = {
    "UA" : "ru_RU",
    "BY" : "ru_RU",
    "RU" : "ru_RU",
    "US" : "en_US"
} 


i18n.getLocale = function() {
    i18n.countryDep.depend();
    if(i18n.forceLocale)
        return i18n.forceLocale;

    if(i18n.country && i18n.country2locale[i18n.country])
        return i18n.country2locale[i18n.country];

    return i18n.defaultLocale;
}

i18n.texts = {
    'en_US' : {
        'vk_to_wall' : 'Share',
        'title_answer' : 'answer anonymously',
        'create' : {
            'placeholder_light' : 'Type your question here',
            'placeholder_dark' : 'To get anonymous answers'
        },
        'answerer' : {
            'placeholder_light' : 'Answer here',
            'placeholder_dark' : 'Be honest. You are anonymous'
        }


    }, 
    'ru_RU' : {
        'vk_to_wall' : 'На стену',
        'title_answer' : 'ответь мне анонимно',
        'create' : {
            'placeholder_light' : 'Задай свой вопрос',
            'placeholder_dark' : 'и узнай что думают твои друзья'
        },
        'answerer' : {
            'placeholder_light' : 'Написать ответ',
            'placeholder_dark' : 'Будь честен. Это анонимно'
        }
    }
}

