const express = require('express');
const cors =require("cors");
const app = express();
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const PORT = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');


//middleware
app.use(cors());
app.use(express.json());





const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Pass}@cluster0.bescutn.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
 
    const itemsCollection = client.db("e-commerceDB").collection("shoppingItems");
    const userCollection = client.db("e-commerceDB").collection("users");
    const cartsCollection = client.db("e-commerceDB").collection("shoppingCarts");

// jwt related api

      app.post('/jwt', async (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
        //console.log('generated token',token)
        res.send({ token });
      })

  // middlewares 

const verifyToken = (req, res, next) => {
  // console.log('inside verify new token==',req.headers.authorization);
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'unauthorized access' });
  }
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })

}
// use verify admin after verifyToken
const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  const isAdmin = user?.role === 'admin';
  if (!isAdmin) {
    return res.status(403).send({ message: 'forbidden access' });
  }
  next();
}   

       
    // User registration endpoint
    app.get('/users',verifyToken,verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })

    app.post('/users',async(req,res)=>{
      const user = req.body;
      // insert email if user doesnt exists: 
      // you can do this many ways (1. email unique, 2. upsert 3. simple checking)
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })

 

     //items related api
     app.get('/items',async(req,res)=>{
 
        const result= await itemsCollection.find().toArray(); 
        res.send(result);
    })
  
       //cart collection
       app.get('/carts',async(req,res)=>{
        const email =req.query.email;
        const query= {email:email};
        const result= await cartsCollection.find(query).toArray(); 
        res.send(result);
    })
      app.post('/carts',async(req,res)=>{
        const cartItem =req.body;
        const result= await cartsCollection.insertOne(cartItem); 
        res.send(result);
      })
      app.delete('/carts/:id', async (req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id) }
        const result = await cartsCollection.deleteOne(query);
        res.send(result);
      })
 
  } finally {
    // Ensures that the client will close when you finish/error

  }
}
run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send('e-commerce is running')
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
