const express = require('express')
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app = express()
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json())


const uri = `mongodb+srv://${process.env.ACCESS_USER}:${process.env.ACCESS_PASSWORD}@cluster0.ikcqa.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const run = async () => {
    try {
        await client.connect();
        const serviceCollection = client.db('doctor-portal').collection('services')

        // find all data
        app.get('/services', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const result = await cursor.toArray();
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