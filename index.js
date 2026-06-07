const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = process.env.DB_URI;
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

async function run() {
  try {
    await client.connect();
    const db = client.db("studymate");
    const partnersCollection = db.collection("partners");
    const connectionsCollection = db.collection("connections");

    // ========== PARTNERS ==========

    // GET all partners with search & sort
    app.get("/partners", async (req, res) => {
      const { search, sort } = req.query;
      let query = {};
      if (search) {
        query.subject = { $regex: search, $options: "i" };
      }
      let cursor = partnersCollection.find(query);
      if (sort === "rating") {
        cursor = cursor.sort({ rating: -1 });
      } else if (sort) {
        query.experienceLevel = sort;
        cursor = partnersCollection.find(query);
      }
      const result = await cursor.toArray();
      res.send(result);
    });

    // GET single partner
    app.get("/partners/:id", async (req, res) => {
      const id = req.params.id;
      const result = await partnersCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // POST create partner
    app.post("/partners", async (req, res) => {
      const partner = req.body;
      partner.rating = parseFloat(partner.rating) || 0;
      partner.partnerCount = 0;
      const result = await partnersCollection.insertOne(partner);
      res.send(result);
    });

    // PATCH increment partner count
    app.patch("/partners/:id/increment", async (req, res) => {
      const id = req.params.id;
      const result = await partnersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $inc: { partnerCount: 1 } }
      );
      res.send(result);
    });

    // PUT update partner
    app.put("/partners/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      delete updatedData._id;
      const result = await partnersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );
      res.send(result);
    });

    // DELETE partner
    app.delete("/partners/:id", async (req, res) => {
      const id = req.params.id;
      const result = await partnersCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // ========== CONNECTIONS ==========

    // GET connections by email
    app.get("/connections", async (req, res) => {
      const { email } = req.query;
      const query = email ? { requesterEmail: email } : {};
      const result = await connectionsCollection.find(query).toArray();
      res.send(result);
    });

    // POST send partner request (with duplicate check)
    app.post("/connections", async (req, res) => {
      const connection = req.body;
      const existing = await connectionsCollection.findOne({
        partnerId: connection.partnerId,
        requesterEmail: connection.requesterEmail,
      });
      if (existing) {
        return res.status(400).send({ message: "You have already sent a request to this partner." });
      }
      const result = await connectionsCollection.insertOne(connection);
      res.send(result);
    });

    // PUT update connection
    app.put("/connections/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      delete updatedData._id;
      const result = await connectionsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );
      res.send(result);
    });

    // DELETE connection
    app.delete("/connections/:id", async (req, res) => {
      const id = req.params.id;
      const result = await connectionsCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.get("/", (req, res) => res.send("StudyMate server is running!"));

    console.log("Connected to MongoDB successfully!");
  } catch (err) {
    console.error(err);
  }
}

run();

app.listen(port, () => console.log(`Server running on port ${port}`));