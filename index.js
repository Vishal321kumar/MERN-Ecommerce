require('dotenv').config()
const express = require('express')
const server = express();
const mongoose = require('mongoose');
const { createProduct } = require('./controller/product');
const productsRouter = require('./routes/Products')
const brandsRouter = require('./routes/Brands')
const categoriesRouter = require('./routes/Categories')
const usersRouter = require('./routes/Users')
const authRouter = require('./routes/Auth')
const cartRouter = require('./routes/Cart')
const ordersRouter = require('./routes/Order')

const cors = require('cors')
const session = require('express-session');
// const csrf = require('csurf');
const passport = require('passport');
const { User } = require('./model/User');
const { isAuth, sanitizeUser, cookieExtractor } = require('./services/common');
const LocalStrategy = require('passport-local').Strategy;
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const cookieParser = require('cookie-parser');
const { Order } = require('./model/Order');
const path = require('path')


// Webhook

const endpointSecret = process.env.ENDPOINT_SECRET;

server.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (request, response) => {
    const sig = request.headers['stripe-signature']; //signature

    let event;

    try {
      event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    } catch (err) {
      response.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntentSucceeded = event.data.object;

        const order = await Order.findById(
          paymentIntentSucceeded.metadata.orderId
        );
        if(order.paymentStatus == "pending"){
          order.paymentStatus = "received";
        }
        await order.save();

        break;
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    response.send();
  }
);





// const token = jwt.sign({foo:"bar"},SECRET_KEY)

// JWT options
const opts = {};
opts.jwtFromRequest = cookieExtractor;
opts.secretOrKey = process.env.JWT_SECRET_KEY;  




//middlewares

server.use(express.static(path.resolve(__dirname,'build')))
server.use(cookieParser())
server.use(session({
      secret: process.env.SESSION_KEY,
      resave: false, // don't save session if unmodified
      saveUninitialized: false, // don't create session until something stored
    })
  );

server.use(passport.authenticate('session'));  
server.use(cors({
    exposedHeaders:['X-Total-Count']
}))

server.use(express.json());  //to parse req body
server.use('/products',isAuth(),productsRouter.router)  // later we will use jwt instaed of isAuth
server.use('/brands',isAuth(),brandsRouter.router)
server.use('/categories',isAuth(),categoriesRouter.router)
server.use('/users',isAuth(),usersRouter.router)
server.use('/auth',authRouter.router)
server.use('/cart',isAuth(),cartRouter.router)
server.use('/orders',isAuth(),ordersRouter.router)


// this line we add to make react router work in case of other routes doesnt match
server.get('*', (req, res) =>
  res.sendFile(path.resolve('build', 'index.html'))
);

// Passport Strategies
passport.use(
    'local',
    new LocalStrategy(
      {usernameField:'email'}, 
      async function (
      email,
      password,
      done
    ) { 
      // by default passport uses username
      console.log({ email, password });
      try {
        const user = await User.findOne({ email: email });
        if (!user) {
          return done(null, false, { message: 'invalid credentials' }); // for safety
       }

        crypto.pbkdf2(
            password,
            user.salt,
            310000,
            32,
            'sha256',
            async function (err, hashedPassword) {

              if (!crypto.timingSafeEqual(user.password, hashedPassword)) {
                return done(null,false,{ message:'invalid credentials'})
              }
              const token = jwt.sign(sanitizeUser(user),process.env.JWT_SECRET_KEY)
              done(null, { id: user.id, role: user.role, token});  //this line sends to serializer

            });


        console.log(email, password, user);
        
        // crypto.pbkdf2(
        //   password,
        //   user.salt,
        //   310000,
        //   32,
        //   'sha256',
        //   async function (err, hashedPassword) {
        //     if (!crypto.timingSafeEqual(user.password, hashedPassword)) {
        //       return done(null, false, { message: 'invalid credentials' });
        //     }
        //     const token = jwt.sign(
        //       sanitizeUser(user),
        //       process.env.JWT_SECRET_KEY
        //     );
        //     done(null, { id: user.id, role: user.role, token }); // this lines sends to serializer
        //   }
        // );
      } catch (err) {
        done(err);
      }
    })
  );
  
  passport.use(
    'jwt',
    new JwtStrategy(opts, async function (jwt_payload, done) {
      try {
        const user = await User.findById(jwt_payload.id);
        if (user) {
          return done(null, sanitizeUser(user)); // this calls serializer
        } else {
          return done(null, false);
        }
      } catch (err) {
        return done(err, false);
      }
    })
  );
  
  // this creates session variable req.user on being called from callbacks
  passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
      return cb(null, { id: user.id, role: user.role });
    });
  });
  
  // this changes session variable req.user when called from authorized request
  
  passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
      return cb(null, user);
    });
  });


  // Payments 
const stripe = require("stripe")(process.env.STRIPE_SERVER_KEY);
server.post("/create-payment-intent", async (req, res) => {
  const { totalAmount, orderId } = req.body;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalAmount * 100,
    currency: "inr",
    description: "Payment for e-commerce project",
    shipping: {
      name: "Random singh",
      address: {
        line1: "510 Townsend St",
        postal_code: "98140",
        city: "San Francisco",
        state: "CA",
        country: "US",
      },
    },
    // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
    automatic_payment_methods: {
      enabled: true,
    },
    metadata: {
      orderId,
    },

});



  if(paymentIntent){
    console.log('payment intent -> ',paymentIntent.client_secret);
  }

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});







main().catch((err)=> console.log(err)) 

async function main(){
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('db connected')
}

// check this one out why is this here
// server.post('/products',createProduct)

server.listen(process.env.PORT,()=>{
    console.log('server started')
})