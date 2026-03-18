const express = require('express');
const mongoose = require("mongoose");
const app = express();
app.use(express.json());

const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const fs = require('fs');


mongoose.connect("mongodb+srv://Tejeshwar:Tejeshwar1%40@e-learning.3majdl2.mongodb.net/CollegeEvents")
    .then(() => console.log("connection successful"))
    .catch((error) => console.log(error.message));


cloudinary.config({
    cloud_name: "YOUR_CLOUD_NAME",
    api_key: "YOUR_API_KEY",
    api_secret: "YOUR_API_SECRET"
});


const upload = multer({ dest: 'uploads/' });


const eventSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    details: { type: String, required: true },

    organisers: [{ type: String, required: true }],

    timeline: [
        {
            stage: { type: String, required: true },
            date: { type: String, required: true }
        }
    ],

    timings: {
        start: { type: String, required: true },
        end: { type: String, required: true }
    },

    createdBy: { type: String, required: true },

    isActive: { type: Boolean, default: true },

    poster: {
        url: String,
        public_id: String
    }
});

const Event = mongoose.model("event", eventSchema);


app.post('/newevent', upload.single('poster'), async (req, res) => {
    try {

        const result = await cloudinary.uploader.upload(req.file.path);


        const organisers = JSON.parse(req.body.organisers);
        const timeline = JSON.parse(req.body.timeline);
        const timings = JSON.parse(req.body.timings);


        await Event.collection.insertOne({
            title: req.body.title,
            description: req.body.description,
            details: req.body.details,
            organisers,
            timeline,
            timings,
            createdBy: req.body.createdBy,
            isActive: req.body.isActive === "true",

            poster: {
                url: result.secure_url,
                public_id: result.public_id
            }
        });


        fs.unlinkSync(req.file.path);

        res.status(201).json({
            message: "Event created successfully",
            image: result.secure_url
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


app.get("/allevents", async (request, response) => {
    try {
        const data = await Event.find()
        response.status(200)
        response.send(data)
    }
    catch (err) {
        response.status(5000)
        response.send(error.message)
    }
})



app.listen(3000, () => {
    console.log("running in port 3000")
})

