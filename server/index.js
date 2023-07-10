const PORT = 8000
const express = require('express')
const app=express();
const {MongoClient} = require('mongodb')
const mongoose=require('mongoose');
const {v4: uuidv4} = require('uuid')
const jwt = require('jsonwebtoken')
const cors = require('cors')
const bcrypt = require('bcrypt')
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
require('https').globalAgent.options.rejectUnauthorized = false;
require('dotenv').config()
app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
const uri = "mongodb+srv://admin-aparna:aparna2002@cluster0.0pj7xc1.mongodb.net/?retryWrites=true&w=majority"
mongoose.connect(uri, {useNewUrlParser: true});

const listSchema = new mongoose.Schema({
  user_id:String,
  email:String,
  hashed_password:String,
  googleId: String,
  first_name: String,
  dob_day: Number,
  dob_month: Number,
  dob_year: Number,
  show_gender: String,
  gender_identity: String,
  gender_interest: String,
  url: String,
  about: String,
  matches: [{type:String}]
})

const msgschema=new mongoose.Schema({
  from_userId:String,
  to_userId:String,
  message:String,
  timestamp:{ type: Date, default: Date.now }
});

listSchema.plugin(passportLocalMongoose);
listSchema.plugin(findOrCreate);
const User=mongoose.model("User",listSchema);
const Message=mongoose.model("Message",msgschema);
app.use(cors())
app.use(express.json())

// Default
app.get('/', (req, res) => {
    res.json('Hello to my app')
});

//passport.use(User.createStrategy());
passport.serializeUser(function(User, done) {
  done(null, User.id);
});
passport.deserializeUser(function(id, done) {
  User.findById(id)
    .then(user => done(null, user))
    .catch(err => done(err, null));
});
passport.use(new GoogleStrategy({
    clientID: "125534857620-u5r7dm06sv37kl1mrloghfkdp6a87033.apps.googleusercontent.com",
    clientSecret: "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",
    callbackURL: "http://localhost:8000/usergoogle",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log('Google authentication strategy called');

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);
app.get("/usergoogle",
  passport.authenticate('google', { failureRedirect: "/signup" }),
  function(req, res) {
    // Successful authentication, redirect to senduser

    res.redirect("http://localhost:3000");
  });

  app.put('/loginsuccess', async function (req, res) {
  try {
    const profile = req.user;
    const generateduid = uuidv4();

    console.log('Received profile:', profile);

    const user = await User.findOne({ google_id: profile.google_id });

    console.log('Existing user:', user);

    if (!user || !user.user_id) {
      await User.updateOne(
        { google_id: profile.google_id },
        {
          $set: {
            user_id: generateduid,
          },
        }
      );

      console.log('User updated');

      // Generate a JWT with the user's profile data
      const token = jwt.sign({ profile }, generateduid, {
        expiresIn: '7d', // Token expires in 7 days
      });

      console.log('Generated token:', token);

      // Send the token and generated user ID as a response
      res.status(201).json({ token, userId: generateduid });
    } else {
      console.log('User already has a user_id:', user);
      res.status(200).json({ message: 'User already has a user_id' });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});
// Sign up to the Database
app.post('/signup', async (req, res) => {
const { email, password } = req.body;

try {
  // Check if the user already exists
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return res.status(409).send('User already exists. Please login');
  }

  const generatedUserId = uuidv4()
  const hashedPassword = await bcrypt.hash(password, 10)

  // Create a new user
  const newUser = new User({
    user_id: generatedUserId,
    email: email.toLowerCase(),
    hashed_password: hashedPassword
  })
  const sanitizedEmail = email.toLowerCase()
  // Save the new user to the database
  const insertedUser = await newUser.save()
  const payload={
    userId:generatedUserId,
    email:email.toLowerCase(),
  }
  // Generate and sign the JWT token
  const token = jwt.sign(payload,sanitizedEmail, {
    expiresIn: 604800
  })

  res.status(201).json({ token, userId: generatedUserId });
} catch (err) {
  console.log(err);
  res.status(500).json('Internal Server Error');
}
});


// Log in to the Database
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email });

    if (user) {
      // Compare the password with the stored hashed password
      const correctPassword = await bcrypt.compare(password, user.hashed_password);

      if (correctPassword) {
        // Generate and sign the JWT token
        const token = jwt.sign({ email: user.email, userId: user.user_id }, 'secretKey', {
          expiresIn: '24h'
        });
        res.status(201).json({ token, userId: user.user_id });
        return; // Return early to prevent the following error response
      }
    }

    res.status(400).json('Invalid Credentials');
  } catch (err) {
    console.log(err);
    res.status(500).json('Internal Server Error');
  }
});
// Get individual user
app.get('/user', async (req, res) => {
  const userId = req.query.userId;

  try {
    const user = await User.findOne({ user_id: userId });
    res.send(user);

  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
});
// Update User with a match
app.put('/addmatch', async (req, res) => {
  const { userId, matchedUserId } = req.body;

  try {
    const query = { user_id: userId };
    const updateDocument = {
      $push: { matches: { user_id: matchedUserId } }
    };
    const user = await User.updateOne(query, updateDocument);
    res.send(user);

  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
});
// Get all Users by userIds in the Database
app.get('/users', async (req, res) => {
  const userIds = JSON.parse(req.query.userIds);

  try {
    const foundUsers = await User.find({ user_id: { $in: userIds } });
    res.json(foundUsers);

  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
});

// Get all the Gendered Users in the Database
app.get('/gendered-users', async (req, res) => {
  const gender = req.query.gender;

  try {
    const foundUsers = await User.find({ gender_identity: gender });
    res.json(foundUsers);

  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
});

// Update a User in the Database
app.put('/user', async (req, res) => {
  const formData = req.body.formData;

  try {
    const insertedUser = await User.updateOne(
      { user_id: formData.user_id },
      {
        $set: {
          first_name: formData.first_name,
          dob_day: formData.dob_day,
          dob_month: formData.dob_month,
          dob_year: formData.dob_year,
          show_gender: formData.show_gender,
          gender_identity: formData.gender_identity,
          gender_interest: formData.gender_interest,
          url: formData.url,
          about: formData.about,
          matches: formData.matches,
        },
      }
    );

    res.json(insertedUser);

  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
});


// Get Messages by from_userId and to_userId
app.get('/messages', async (req, res) => {
  const { userId, correspondingUserId } = req.query;

  try {
    const foundMessages = await Message.find({
      from_userId: userId,
      to_userId: correspondingUserId
    }).exec();

    res.send(foundMessages);
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
});

// Add a Message to our Database
app.post('/message', async (req, res) => {
  const messageData = req.body.message;

  try {
    const createdMessage = await Message.create(messageData);

    res.send(createdMessage);
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
});


app.listen(PORT, () => console.log('server running on PORT ' + PORT))
