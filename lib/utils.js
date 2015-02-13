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

if(Meteor.isClient){
    Template.registerHelper("case", function(){
        var pair =_.chain(this).pairs().first().value();
        //console.log("case pair", pair);
        var rvar = window[pair[0]];
        if(!rvar){
            //console.log("create var ", pair[0]);
            rvar = window[pair[0]] = new ReactiveVar("default");
        }
        if(rvar instanceof ReactiveVar && rvar.get().toString() == pair[1]) {
            return Template._case_default;
        }
        return null;
    });

    inputValidator = function(serverMethodName, statusVar){
        var checkSeq = 0;
        var handler = _.debounce(function(value){
            var myCheckSeq = ++checkSeq;
            Meteor.call(serverMethodName, value, function(error, result){
                //this call of serverMethodName is expired, new one has been made
                if(myCheckSeq != checkSeq) return;
                statusVar.set(result);
                checkSeq = 0;
            });
        }, 500);
        return function(value){
            statusVar.set("checking");
            handler(value);
        }
    }
    // parseUri 1.2.2
    // (c) Steven Levithan <stevenlevithan.com>
    // MIT License

    parseUri = function(str) {
        var	o   = parseUri.options,
            m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
            uri = {},
            i   = 14;

        while (i--) uri[o.key[i]] = m[i] || "";

        uri[o.q.name] = {};
        uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
            if ($1) uri[o.q.name][$1] = decodeURIComponent($2);
        });

        return uri;
    };

    parseUri.options = {
        strictMode: false,
        key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
        q:   {
            name:   "queryKey",
            parser: /(?:^|&)([^&=]*)=?([^&]*)/g
        },
        parser: {
            strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
            loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
        }
    };
}
