if (Meteor.isClient) {
    answerState = new ReactiveVar("idle");
    sitename = "tellmet.ru";
    title = new ReactiveVar(sitename);
    description = new ReactiveVar("Ask a question to get anonymous answers");

    Session.setDefaultPersistent("myquestions", []);
    Session.setDefaultPersistent("myanswers", []);

    Meteor.subscribe('myquestions', Session.get("myquestions"));
    Meteor.subscribe('myanswers', Session.get("myanswers"));


    Router.configure({
        layoutTemplate: 'MainLayout',
        onBeforeAction : function(){
            //console.log("onBeforeAction", this.params)
            menuOpen.set(this.params.hash == "menu");
            this.next();
        },
        onAfterAction : function(){
            SEO.set({
                title: title.get(),
                meta: {
                    'description': description.get()
                },
                og: {
                    'title': title.get(),
                'description': description.get()
                }
            });
        }
    });

    Router.route('/', function(){
        this.render("create");
    });
    Template.my.helpers({
        questions : function(){ 
            return questions.find({privateId : {$in : Session.get("myquestions")}});
        },
        ianswered : function(){
            return questions.find({publicId : {$in : Session.get("myanswers")}});
        }
    });
    Template.my.events({
        "click .ask_btn" : function(e){
            e.preventDefault();
            Router.go("/");
            menuOpen.set(false);
        }
    });
    
    menuOpen = new ReactiveVar(false);

    Template.MainLayout.events({
        "click #openMenu" : function(e){
            e.preventDefault();
            var pathname = window.location.pathname;
            menuOpen.set(true);
            Router.go(pathname +"#menu");
        },
        "click #closeMenu" : function(e){
            e.preventDefault();
            menuOpen.set(false);
            var pathname = window.location.pathname; 
            Router.go(pathname);
        }
    });
    
    Template.create.events({
        "submit form" : function(e){
            console.log("submit question");
            e.preventDefault();
            var question = e.target.question.value;
            var answersArePublic = e.target.answersArePublic.checked;
            Meteor.call('create', question, answersArePublic, function(err, id){
                if(err){
                    //TOOD: show error
                    console.log("failed to create question", err);
                    return;
                }
                var q = Session.get("myquestions");
                q.push(id)
                Session.setPersistent("myquestions", q);
                Router.go('/' + id)
            });
        }
    });
    Template.answerer.events({
        "submit form": function(e){
            e.preventDefault();
            if(answerState.get() == "progress"){
                return;
            }
            var answer = e.target.answer.value;
            answerState.set("progress");
            var data = this;
            Meteor.call('post', data.publicId, answer, function(err, id){
                if(err){
                    answerState.set("error");
                    //TOOD: show error
                    console.log("failed to answer", err);
                } else {
                    answerState.set("done");
                }

                var a = Session.get("myanswers");
                a.push(data.publicId)
                Session.setPersistent("myanswers", a);

                Meteor.setTimeout(function(){
                    answerState.set("idle");
                    /*if(data.answersArePublic){
                        //Router.go("/" + data.publicId + "/answers")
                    } */
                }, 1000);
            });
        },
        "click .ask_btn": function(e){
            e.preventDefault();
            Router.go("/");
        }
    })

    Router.route('/:_id/answers', function(){
        this.wait(Meteor.subscribe('answerer', this.params._id));
        this.wait(Meteor.subscribe('questioner', this.params._id));
        if (!this.ready()) {
            this.render('loading');
            return
        }
        var question = questions.findOne();
        if(!question.answers){
            this.render("access_denied");
            return;
        }
        this.render("view_answers", {
            data : {
                answers : question.answers.reverse(),
                question : question.question,
            }
        });
    });

    Template.questioner.rendered = function(){
        //console.log("rendered", this.data);
        var html = VK.Share.button({
            url : this.data.publicUrl, 
            type: 'link', 
            noparse : true, 
            title : title.get(), 
            description : description.get()
        }, {
            type : 'link',
            text : i18n('vk_to_wall')
        });
        $('#vk-share-button').html(html);
    }
    Router.route('/:_id', function(){
        //console.log("id ", this.params._id);
        var pub = (this.params._id.length == publicIdLength);
        if(pub) {
            this.wait(Meteor.subscribe('answerer', this.params._id));
        } else {
            this.wait(Meteor.subscribe('questioner', this.params._id));
        }
        if (!this.ready()) {
            this.render('loading');
            return
        }
        var question; 
        title.set(sitename + ' - '+ i18n('title_answer'));
        if(!pub){
            question = questions.findOne({privateId : this.params._id});
            this.render("questioner", {
                data : {
                    answers : question.answers.reverse(),
                    publicUrl : Meteor.absoluteUrl(question.publicId),
                    question : question.question,
                }
            });
        } else {
            question = questions.findOne({publicId : this.params._id});
            var answers = Session.get("myanswers");
            var alreadyAnswered = (answers.indexOf(question.publicId) >= 0);
            /*if(answers.indexOf(question.publicId) >= 0) {
                answerState.set("done");
            }*/
            this.render("answerer", { 
                data : {
                    question : question.question,
                    answers : question.answers ? question.answers.reverse() : [],
                    publicId : question.publicId,
                    alreadyAnswered : alreadyAnswered,
                    //notYetAnswered : notYetAnswered,
                    answersArePublic : question.answersArePublic,
                }
            });
        }
        description.set(question.question);
    });

    // this lines has to be last lines in the file
    _.chain(this).pairs().filter(function(pair){
        return (pair[1] instanceof ReactiveVar);
    }).each(function(pair){
        Template.registerHelper(pair[0], function(){
            return pair[1].get();
        });
    });

    Template.registerHelper("case", function(){
        _.extend(this, Template.parentData(1));
        var pair =_.chain(this).pairs().first().value();
        var rvar = window[pair[0]];
        if(!rvar){
            rvar = window[pair[0]] = new ReactiveVar("default");
        }
        if(rvar instanceof ReactiveVar && rvar.get().toString() == pair[1]) {
            return Template._case_default;
        }
        return null;
    });
    
    Template.create.events({
        "focus textarea" : function(event){
            event.preventDefault();
            $('body').removeClass("lighter");
            $('body').addClass("darker");
            $('textarea').attr('placeholder', i18n('create.placeholder_dark'));
        },
        "blur textarea" : function(event){
            event.preventDefault();
            $('body').removeClass("darker");
            $('body').addClass("lighter");
            $('textarea').attr('placeholder', i18n('create.placeholder_light'));
        }
    });
    
    Template.answerer.events({
        "focus textarea" : function(event){
            event.preventDefault();
            $('body').removeClass("lighter");
            $('body').addClass("darker");
            $('textarea').attr('placeholder', i18n("answerer.placeholder_dark"));
        },
        "blur textarea" : function(event){
            event.preventDefault();
            $('body').removeClass("darker");
            $('body').addClass("lighter");
            $('textarea').attr('placeholder', i18n("answerer.placeholder_light"));
        }
    });
}

questions = new Mongo.Collection("questions");
var publicIdLength = 6;
if (Meteor.isServer) {

    Meteor.startup(function () {
        Meteor.publish("questioner", function(id){
            return questions.find({privateId : id}, {fields : {privateId : 1, publicId : 1, answers : 1, question : 1}});
        });
        Meteor.publish("answerer", function(id){
            var question = questions.findOne({publicId : id}, {fields : { answersArePublic : 1}});
            var fields = { publicId: 1, question : 1, answersArePublic : 1 };
            if(question && question.answersArePublic){
                fields.answers = 1;
            }
            return questions.find({publicId : id}, {fields : fields });
        });
        Meteor.publish("myquestions", function(ids){
            return questions.find({privateId : {$in : ids}}, {fields : {privateId : 1, publicId : 1, answers : 1, question : 1}});
        });
        Meteor.publish("myanswers", function(ids){
            return questions.find({publicId : {$in : ids}}, {fields : {publicId : 1, question : 1}});
        });
    });
    Meteor.methods({
        create : function(question, answersArePublic){
            var q = { 
                question : question ,
                publicId : Random.id(publicIdLength),
                privateId : Random.id(),
                answersArePublic : answersArePublic,
                answers : []
            }
            questions.insert(q);
            return q.privateId; 
        }, 
        post : function(publicId, answer) {
            var question = questions.find({publicId : publicId});
            if(!question) {
                throw new Meteor.Error("not_found", "Question not found");
            }
            questions.update({publicId : publicId}, {$push : {answers : answer}});
            return true;
        }
    })
}
