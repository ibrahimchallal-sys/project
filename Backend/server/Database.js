require('dotenv').config();

const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
app.use(express.json()); 



const client = new MongoClient(process.env.MONGO_URI);

let db;
let containers;


async function connectDB() {
    try {

        await client.connect();

        db = client.db(process.env.DB_NAME);

        containers = db.collection("alerts");

        console.log("✅ MongoDB connected");

    } catch (error) {
        console.error("❌ MongoDB connection failed:", error);
    }
}

connectDB();



app.post('/extract-code', async (req, res) => {

    const { container_code, iso_size_type, shipping_company } = req.body;

    if (!container_code || !iso_size_type) {
        return res.status(400).json({
            error: "container_code and iso_size_type are required"
        });
    }

    try {

        const result = await containers.updateOne(

            { container_code: container_code },

            {
                $set: {
                    iso_code: iso_size_type,
                    shipping_company: shipping_company || null
                },

                $setOnInsert: {
                    container_code: container_code,
                    created_at: new Date()
                }
            },

            { upsert: true }
        );

        res.json({
            message: "Container saved successfully",
            result: result
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Server error"
        });

    }

});


// ---------------- GET ALL CONTAINERS ----------------

app.get('/view-data', async (req, res) => {

    try {

        // Get all containers sorted by newest
        const data = await containers
            .find({})
            .sort({ created_at: -1 })
            .toArray();

        res.json(data);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Server error"
        });

    }

});


// ---------------- START SERVER ----------------

const PORT = process.env.PORT || 82;

// Start Express server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});