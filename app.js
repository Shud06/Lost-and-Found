const express=require("express");
const bodyParser=require("body-parser");
const mongoose=require("mongoose");
const app =express();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const session= require("express-session");
const passport = require("passport");
const passportLocal=require("passport-local");
const PassportLocalMongoose=require("passport-local-mongoose");

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));

app.set("view engine","ejs");

// const user="21bme041@iiitdmj.ac.in"
app.use(session({
    secret:"Our little Secret.",
    resave:false,
    saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());  

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now())
    }
});
  
const upload = multer({ storage: storage });

mongoose.connect("mongodb+srv://Tester:1234@cluster1.utwwsu2.mongodb.net/foundedDB")

const registeredSchema=new mongoose.Schema({
    username:String,
    contact:String,
    password:String,
    found:[{data:Buffer,dataType:String,descrip:String}],
    lost:[{data:Buffer,dataType:String,descrip:String}]
});

registeredSchema.plugin(PassportLocalMongoose);

const Item=mongoose.model("item",registeredSchema);

passport.use(Item.createStrategy());
passport.serializeUser((user, done) => {
    done(null, user);
});
  
passport.deserializeUser((user, done) => {
done(null, user);
});

// ---------------------------------Root or homepage route------------------------

app.get("/",function (req,res) {
    // console.log(0);
    if(req.isAuthenticated()){
        res.render("project");
    }else{
        res.redirect("/login");
    }
    
});

// ------------------------------------Route for resgistering a found or lost object-----------------------------

app.get("/register/:place",function(req,res){
    if(req.isAuthenticated()){
        if(req.params.place==="found"){
            res.render("register_item");
        }
        else{
            res.render("register_lost")
        }
    }else{
        res.redirect("/login");
    }
    

});

app.post('/register/:place', upload.single('image'), (req, res, next) => {
    if(req.isAuthenticated()){
        Item.findById({_id:req.user._id},function (err,result) {
            if (result){
                if(req.params.place==="found"){
                    const up=result.found
                    up.push({data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),contentType: 'image/png',descrip:req.body.description})
                    Item.updateOne({_id:result._id},{found:up},function (err) {
                        if (err){
                            console.log(err);
                        } else{
                            res.redirect("/");
                        }
                });
                }else{
                    const up=result.lost
                    up.push({data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),contentType: 'image/png'})
                    Item.updateOne({_id:result._id},{lost:up},function (err) {
                        if (err){
                            console.log(err);
                        } else{
                            res.redirect("/");
                        }
                    });
                }
                
            }
            else{
                res.redirect("/login");
            }
            
        });
    }else{
        res.redirect("/login");
    }
});

// ---------------------------For Deleting a item from database------------------------

app.post("/delete/:place",function (req,res) {
    if(req.isAuthenticated()){
        const results = req.body.checkbox.trim().split(" ");
        Item.findById({_id:results[0]},function (err,result) {
            if(req.params.place==="found"){
                var li=result.found
                delete li[parseInt(results[1])];
                Item.updateOne({_id:results[0]},{found:li},function (err) {
                if(err){
                    console.log(err);
                }
                else{
                    res.redirect("/founded")
                }
            });
            }else{
                var li=result.lost
                delete li[parseInt(results[1])];
                Item.updateOne({_id:results[0]},{lost:li},function (err) {
                if(err){
                    console.log(err);
                }
                else{
                    res.redirect("/lost")
                }
            });
        }
        }); 
    }else{
        res.redirect("/login");
    }
    
});

//-------------------login routes------------------

app.get("/login",function (req,res) {
    res.render("Login")
});


app.post("/login",function (req,res) {
    
    const obj= new Item({
        email:req.body.username,
        contact:req.body.password,
        password:req.body.password,
        
    });
    req.login(obj,function (err) {
        if(err){
            console.log(err);
        }else{
            
            passport.authenticate("local",{failureRedirect:"/login"})(req,res,function () {
                res.redirect("/")
            });
            
            
        }
    })
    
});

//------------------------------------Sign up page route--------------------------

app.get("/Signup",function (req,res) {
    res.render("Sign_up");
})

app.post("/Signup",function (req,res) {
    
    Item.register({username:req.body.username,contact:req.body.password},req.body.password,function (err,user) {
        if(err){
            console.log(err);
            res.redirect("/Signup");
        }else{
            
            passport.authenticate("local",{failureRedirect:"/login"})(req,res,function () {
                res.redirect("/");
            });
        } 
    })
    
});

//----------------------------route for displaying lost items and found items-------------------

app.get("/founded",function(req,res){
    if(req.isAuthenticated()){
        Item.find({}, (err, items) => {
            if (err) {
                console.log(err);
                res.status(500).send('An error occurred', err);
            }
            else {
                console.log(items);
                res.render('seek_item', { items: items });
            }
        });
    }else{
        res.redirect("/login");
    }
    
    
});



app.get("/lost",function(req,res){
    if(req.isAuthenticated()){
        Item.find({}, (err, items) => {
            if (err) {
                console.log(err);
                res.status(500).send('An error occurred', err);
            }
            else {
                // console.log(items);
                res.render('lost_items', { items: items });
            }
        });
    }else{
        res.redirect("/login");
    }
    
    
});




//--------------------------------for starting a server-----------------------


app.listen(3000,function () {
    console.log("Server has Started!!");
});