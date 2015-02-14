if (Meteor.isClient) {
    answerState = new ReactiveVar("idle");
    sitename = "tellmet.ru";
    title = new ReactiveVar(sitename);
    description = new ReactiveVar("Ask a question to get anonymous answers");
    Router.route('/', function(){
        this.render("create");
    });
    Router.configure({
        layoutTemplate: 'MainLayout',
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

    Template.create.events({
        "submit form" : function(e){
            e.preventDefault();
            var question = e.target.question.value;
            Meteor.call('create', question, false, function(err, id){
                if(err){
                    //TOOD: show error
                    console.log("failed to create question", err);
                    return;
                }
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
            answerState.set("progress");
            var answer = e.target.answer.value;
            answerState.set("progress");
            var data = this;
            Meteor.call('post', this.publicId, answer, function(err, id){
                if(err){
                    answerState.set("error");
                    //TOOD: show error
                    console.log("failed to answer", err);
                } else {
                    answerState.set("done");
                }
                Meteor.setTimeout(function(){
                    //answerState.set("idle");
                    console.log("this", data);
                    if(data.answersArePublic){
                        Router.go("/" + data.publicId + "/answers")
                    }
                }, 1000);
                //Router.go('/' + id)
            });
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

    Router.route('/:_id', function(){
        this.wait(Meteor.subscribe('answerer', this.params._id));
        this.wait(Meteor.subscribe('questioner', this.params._id));
        if (!this.ready()) {
            this.render('loading');
            return
        }
        var question = questions.findOne();
        if(question.privateId){
            this.render("questioner", {
                data : {
                    answers : question.answers.reverse(),
                    publicUrl : Meteor.absoluteUrl(question.publicId),
                    question : question.question,
                }
            });
        } else {
            this.render("answerer", { 
                data : {
                    question : question.question,
                    publicId : question.publicId,
                    answersArePublic : question.answersArePublic
                }
            });
            title.set(sitename + " - answer anonymously");
            description.set(question.question);
        }
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
            console.log("focus works!")
            $('body').removeClass("lighter");
            $('body').addClass("darker");
            $('textarea').attr('placeholder', 'To get anonymous answers')
        },
        "blur textarea" : function(event){
            event.preventDefault();
            console.log("blur works!")
            $('body').removeClass("darker");
            $('body').addClass("lighter");
            $('textarea').attr('placeholder', 'Type your question here')
        }
    });
    
    Template.answerer.events({
        "focus textarea" : function(event){
            event.preventDefault();
            console.log("focus works!")
            $('body').removeClass("lighter");
            $('body').addClass("darker");
            //$('textarea').attr('placeholder', 'To get anonymous answers')
        },
        "blur textarea" : function(event){
            event.preventDefault();
            console.log("blur works!")
            $('body').removeClass("darker");
            $('body').addClass("lighter");
            //$('textarea').attr('placeholder', 'Type your question here')
        }
    });
}

questions = new Mongo.Collection("questions");
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
    });
    Meteor.methods({
        create : function(question, answersArePublic){
            var q = { 
                question : question ,
                publicId : Random.id(6),
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
