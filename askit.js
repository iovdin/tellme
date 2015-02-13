if (Meteor.isClient) {
    Router.route('/', function(){
        this.render("create");
    });
    Template.create.events({
        "submit form" : function(e){
            e.preventDefault();
            var question = e.target.question.value;
            Meteor.call('create', question, function(err, id){
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
            var answer = e.target.answer.value;
            Meteor.call('post', this.publicId, answer, function(err, id){
                if(err){
                    //TOOD: show error
                    console.log("failed to answer", err);
                    return;
                }
                //Router.go('/' + id)
            });
        }
    })

    Router.route('/:_id', function(){
        this.wait(Meteor.subscribe('answerer', this.params._id));
        this.wait(Meteor.subscribe('questioner', this.params._id));
        if (!this.ready()) {
            this.render('loading');
            return
        }
        var question = questions.findOne();
        if(question.answers){
            this.render("questioner", {
                data : {
                    answers : question.answers,
                    publicUrl : Meteor.absoluteUrl(question.publicId),
                }
            });
        } else {
            this.render("answerer", { 
                data : {
                    question : question.question,
                    publicId : this.params._id
                }
            });
        }
    });
}

questions = new Mongo.Collection("questions");
if (Meteor.isServer) {

    Meteor.startup(function () {
        Meteor.publish("questioner", function(id){
            return questions.find({privateId : id}, {fields : {publicId : 1, answers : 1, question : 1}});
        });
        Meteor.publish("answerer", function(id){
            return questions.find({publicId : id}, {fields : { question : 1}});
        });
    });
    Meteor.methods({
        create : function(question){
            var q = { 
                question : question ,
                publicId : Random.id(),
                privateId : Random.id(),
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
