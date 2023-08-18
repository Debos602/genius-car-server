const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

// Middlewar
app.use(cors());
app.use(express.json());

console.log(process.env.DB_USER);
console.log(process.env.DB_PASSWORD);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gdk9eql.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

function verifyJWT(req, res, next) {
	const authHeader = req.headers.authorization;
	if (!authHeader) {
		return res.status(401).send({ message: "unauthorized access" });
	}
	const token = authHeader.split(" ")[1];
	jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
		if (err) {
			res.status(401).send({ message: "Forbidden access" });
		} else {
			req.decoded = decoded;
			next();
		}
	});
}

async function run() {
	try {
		const serviceCollection = client.db("geniusCar").collection("services");

		const orderCollection = client.db("geniusCar").collection("orders");

		app.post("/jwt", async (req, res) => {
			const user = req.body;
			const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
				expiresIn: "1d",
			});
			res.send({ token });
			console.log(user);
		});

		app.get("/services", async (req, res) => {
			const query = {};
			const cursor = serviceCollection.find(query);
			const services = await cursor.toArray();
			res.send(services);
		});
		app.get("/services/:id",  async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const service = await serviceCollection.findOne(query);
			res.send(service);
		});

		// orders api

		app.get("/orders", verifyJWT, async (req, res) => {
			console.log(req.headers.authorization);
			const decoded = req.decoded;
			console.log("Inside Orders api", decoded);
			
			if(decoded.email !==req.query.email){
				res.status(403).send({message:'unauthorized access' })
			}


			let query = {};
			if (req.query?.email) {
				query = {
					email: req.query.email,
				};
			}
			const cursor = orderCollection.find(query);
			const orders = await cursor.toArray();
			res.send(orders);
		});

		app.post("/orders", verifyJWT, async (req, res) => {
			const order = req.body;
			const result = await orderCollection.insertOne(order);
			res.send(result);
		});

		app.patch("/orders/:id",verifyJWT, async (req, res) => {
			const id = req.params.id;
			const status = req.body.status;
			const query = { _id: new ObjectId(id) };
			const updatedDoc = {
				$set: {
					status: status,
				},
			};
			const result = await orderCollection.updateOne(query, updatedDoc);
			res.send(result);
		});

		app.delete("/orders/:id", verifyJWT, async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await orderCollection.deleteOne(query);
			res.send(result);
		});
	} finally {
	}
}
run().catch((error) => console.error(error));

app.get("/", (req, res) => {
	res.send("Genius car server is running");
});

app.listen(port, () => {
	console.log(`Genius Car Server running on ${port}`);
});
