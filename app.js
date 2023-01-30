require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session')
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static("public"));


app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
}))

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)

const User = new mongoose.model("user",userSchema);

passport.use(User.createStrategy());

passport.serializeUser((user, cb) => {
    cb(null, user);
});
  
passport.deserializeUser((obj, cb) => {
    cb(null, obj);
});
  


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",   
    scope: ["profile"],
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get('/', (req, res)=>{
    res.render("home");
})

app.get('/auth/google',
  passport.authenticate('google', )
);

app.get("/auth/google/secrets", 
passport.authenticate('google', { failureRedirect: '/login' }),
function(req, res) {
  // Successful authentication, redirect home.
  res.redirect('/secrets');
});

app.get("/register",(req, res)=>{
    res.render("register");
})

app.get('/login',(req, res)=>{
    res.render("login");
})

app.get("/secrets",(req, res)=>{
// if the user is authenticated only then he is allowed to go to the secrets page 
   User.find({"secret":{$ne:null}},(err, foundSecrets)=>{
    if(err){
        console.log(err);
    }else{
        if(foundSecrets){
            res.render("secrets",{foundSecrets:foundSecrets})
        }
    }
    
   })
})

app.get("/submit",(req, res)=>{
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("login")
    }
})

app.post('/submit',(req, res)=>{
    const submitedSecret = req.body.secret;
    User.findById(req.user._id,(err,foundUser)=>{
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                foundUser.secret = submitedSecret;
                foundUser.save(()=>{
                res.redirect("/secrets");
            });
            }
        }
    })
})

app.get("/logout",(req, res)=>{
    req.logout((err)=>{
        if(err){
            console.log(err);
        }else{
            res.redirect("/")
        }
    });
    
})

app.post('/register',(req, res)=>{
    User.register({username:req.body.username}, req.body.password,(err,user)=>{
        if(err) {
            console.log(err);
            res.redirect("register");
        }else {
            passport.authenticate("local")(req,res,()=>{
                res.redirect("secrets")
            })
        }
    })
})


app.post("/login",(req, res)=>{
   const user = new User({
    username: req.body.username,
    password: req.body.password
   })

// this is a passport method which is used to loged in the user if 
   req.login(user,(err)=>{
    if(err) {
        console.log(err);
    }else{
        passport.authenticate("local")(req,res,()=>{
            console.log("Authorized");
            res.redirect("secrets")

        })
    }
   })
})


app.listen(3000,()=>{
    console.log("Port Started on 3000");
})