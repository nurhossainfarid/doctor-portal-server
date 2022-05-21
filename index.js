const express = require('express')
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app = express()
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');

// middleware
app.use(cors());
app.use(express.json())


const uri = `mongodb+srv://${process.env.ACCESS_USER}:${process.env.ACCESS_PASSWORD}@cluster0.ikcqa.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



// jwt verify 
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'UnAuthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECURE, function (err, decoded) {
    if (err) {
      return res.status(403).send({message: 'Forbidden access'})
    }
    req.decoded = decoded;
    next();
  });
}



const run = async () => {
    try {
        await client.connect();
        const serviceCollection = client.db('doctor-portal').collection('services');
        const bookingCollection = client.db('doctor-portal').collection('bookings');
        const userCollection = client.db('doctor-portal').collection('users');
        const doctorCollection = client.db('doctor-portal').collection('doctors');
      
        const verifyAdmin = async (req, res, next) => {
          const requester = req.decoded.email;
          const requesterAccount = await userCollection.findOne({ email: requester });
          if (requesterAccount.role === 'admin') {
            next();
          }
          else {
            res.status(403).send({ message: 'forbidden' });
          }
      }
      

      /**  
       * API naming convention
       * app.get('/booking') // for get all data to collection or one more or filter
       * app.get('/booking/:id') // get single data to collection
       * app.post('booking') // add new data 
       * app.patch('booking/:id') // update a single data
       * app.delete('booking/:id') // delete a data to collection
      */


      /* -------------------------------------- all app.get --------------------------------------------------------- */
      // find all data
      app.get('/services', async (req, res) => {
          const query = {};
          const cursor = serviceCollection.find(query).project({name: 1,});
          const result = await cursor.toArray();
          res.send(result);
      })

      app.get('/users',verifyJWT, async (req, res) => {
        const result = await userCollection.find().toArray();
        res.send(result);
      })

      app.get('/available', async (req, res) => {
        const date = req.query.date || 'May 16, 2022';
        // step-1 : get all service
        const services = await serviceCollection.find().toArray()

        // step-2 : get booking service
        const query = { date: date };
        const bookings = await bookingCollection.find(query).toArray();

        // step-3 : for each service, find bookings for service
        services.forEach(service => {
          const serviceBookings = bookings.filter(b => b.treatment === service.name);
          const bookedSlots = serviceBookings.map(s => s.slot);
          service.slots = service.slots.filter(available => !bookedSlots.includes(available))
        })
        res.send(services)
      })

      app.get('/booking',verifyJWT, async(req, res) =>{
        const patient = req.query.patient;
        const decodedEmail = req.decoded.email;
        if (patient === decodedEmail) {
          const query = { patient: patient };
          const bookings = await bookingCollection.find(query).toArray();
          return res.send(bookings);
        }
        else {
          return res.status(403).send({ message: 'forbidden access' });
        }
      })

      app.get('/admin/:email', async (req, res) => {
        const email = req.params.email;
        const user = await userCollection.findOne({ email: email });
        const isRole = user.role == 'admin';
        res.send({admin : isRole});
      })

      app.get('/doctors', verifyJWT, verifyAdmin, async (req, res) => {
        const result = await doctorCollection.find().toArray();
        res.send(result);
      })



      /* ------------------------------------------------- all app.put --------------------------------------------------- */
      app.put('/user/admin/:email', verifyJWT,verifyAdmin, async (req, res) => {
        const email = req.params.email;
          const filter = { email: email };
          const updateDoc = {
            $set: { role: 'admin' },
          };
          const result = await userCollection.updateOne(filter, updateDoc);
          res.send(result);
      })
      
      app.put('/user/:email', async (req, res) => {
        const email = req.params.email;
        const user = req.body;

        // create a filter for a movie to update
        const filter = { email: email };

        // this option instructs the method to create a document if no documents match the filter
        const options = { upsert: true };
        
        // create a document that sets the plot of the movie
        const updateDoc = {
          $set: user
        }
        const result = await userCollection.updateOne(filter, updateDoc, options);
        const token = jwt.sign({email: email}, process.env.ACCESS_TOKEN_SECURE, {expiresIn:'1d'})
        res.send({result, token});
      })
      

      /* -------------------------------------------------- all app.post ----------------------------------------------------*/

      // add booking data
      app.post('/booking', async (req, res) => {
        const booking = req.body;
        console.log(booking);
        const query = { treatment: booking.treatment, date: booking.date, patient: booking.patient }
        const exists = await bookingCollection.findOne(query);
        if (exists) {
          return res.send({ success: false, booking: exists })
        }
        const result = await bookingCollection.insertOne(booking);
        return res.send({ success: true, result });
      });

      // add doctor
      app.post('/doctors', verifyJWT,verifyAdmin, async (req, res) => {
        const doctor = req.body;
        const result = await doctorCollection.insertOne(doctor);
        res.send(result);
      })


      /* ----------------------------------------------------- All delete ----------------------------------------------------- */
      // delete doctor
      app.delete('/doctors/:email', verifyJWT, verifyAdmin, async (req, res) => {
        const email = req.params.email;
        const filter = {email: email}
        const result = await doctorCollection.deleteOne(filter);
        res.send(result);
      })

      
    }
    finally {
        
    }
}
run().catch(console.dir)


app.get('/', (req, res) => {
  res.send('Welcome to doctor portal')
})

app.listen(port, () => {
  console.log(`Doctor portal server is running from ${port}`)
})