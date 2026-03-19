const express = require('express');
const mongoose = require("mongoose");
const app = express();
app.use(express.json());
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
// "mongodb+srv://Tejeshwar:Tejeshwar1%40@e-learning.3majdl2.mongodb.net/CollegeEvents" 

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("connection successful"))
    .catch((error) => console.log(error.message));



cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});



const upload = multer({ dest: 'uploads/' });

const eventPhotosSchema = new mongoose.Schema({
    poster: [
        {
            imageId: {
                type: String,
                default: uuidv4
            },
            url: {
                type: String,
                required: true
            },
        }
    ]
});

const EventImages = new mongoose.model("EventImages", eventPhotosSchema)

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    details: { type: String, required: true },
    venue: { type: String, required: true, trim: true },
    organisers: [{ type: String, required: true }],

    timeline: [
        {
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
            type: req.body.type,
            description: req.body.description,
            details: req.body.details,
            venue: req.body.venue,
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
        res.status(201)
        res.send("successful")

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});



app.get("/allevents/:type", async (request, response) => {
    try {
        const { type } = request.params
        const data = await Event.find({ type: [`${type}`] })
        response.status(200)
        response.send(data)
    }
    catch (err) {
        response.status(500)
        response.send(err.message)
    }
})



app.post('/event-images', upload.single('poster'), async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ message: "Event ID is required" });
        }
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        const result = await cloudinary.uploader.upload(req.file.path);
        const imageData = {
            url: result.secure_url
        };
        const updatedEvent = await EventImages.findByIdAndUpdate(
            id,
            {
                $push: { poster: imageData }
            },
            {
                new: true,
                runValidators: true
            }
        );
        if (!updatedEvent) {
            return res.status(404).json({ message: "Event not found" });
        }
        res.status(201)
        res.send("added successfully")
    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500)
        res.send("internal server error")
    }
});



app.get("/images-receive", async (request, response) => {
    try {
        const { id } = request.body
        const data = await EventImages.find({ "_id": id })
        response.status(200)
        response.send({ data })
    }
    catch (err) {
        response.send(err.message)
    }
})


app.listen(3000, () => {
    console.log("running in port 3000")
})


