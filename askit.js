if (Meteor.isClient) {
    Router.route('/', function(){
        this.render("create");
    });
    Template.create.events({
        "submit form" : function(e){
            e.preventDefault();
            var question = e.target.question;
            Meteor.call(question, function(err, id){
                if(err){
                    //TOOD: show error
                    console.log("failed to create question", err);
                    return;
                }
                Router.go('/' + id)
            });
        }
    });
    Router.route('/:id', function(){
        this.render("owner");

    });
}

if (Meteor.isServer) {
    questions = new Mongo.Collection("questions");

    Meteor.startup(function () {
        // code to run on server at startup
    });
    Meteor.methods({
        create : function(question){
            var q = { 
                question : question ,
                answerId : Random.id(),
                answers : []
            }
            var id = questions.insert(q);
            return id; 
        }
    })
}
