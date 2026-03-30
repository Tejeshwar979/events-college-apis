const express = require('express');
const mongoose = require("mongoose");
const app = express();
app.use(express.json());
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
app.use(cors())



mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("connection successful"))
    .catch((error) => console.log(error.message));



cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const announcements = new mongoose.Schema({
    announcement: String,
    description: String
})

const announcemet = new mongoose.model("announcements", announcements)

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

const adminsData = new mongoose.Schema({
    email: String,
    encpassword: String,
})

const adminsdata = new mongoose.model("adminsdata", adminsData)

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



app.post('/newadmin', async (request, response) => {
    try {
        const { email, password } = request.body
        const data = await adminsdata.find({ email: email })
        if (data.length > 0) {
            response.send(401).json({
                "message": "user already exists"
            })
        }
        else {
            const encryptPassword = await bcrypt.hash(password, 10)
            try {
                await adminsdata.insertOne({
                    email: email,
                    encpassword: encryptPassword
                })
                response.send("successful")
            }
            catch (error) {
                response.send(error.message)
            }
        }
    }
    catch (error) {
        response.send(error.message)
    }
})



const jwtVerification = (request, response, next) => {
    try {
        const { authorization } = request.headers
        if (!authorization) {
            response.status(401)
            response.send("no authorization")
        }
        const jwt_Token = authorization.split(" ")
        const Token = jwt_Token[1]
        if (!Token) {
            response.status(401)
            response.send({ "message": "error no JWT token" })
        }
        else {
            const decoded = jwt.verify(Token, "MY_SECRET_KEY")
            request.user = decoded
            next()
        }
    }
    catch (error) {
        response.send(error.message)
    }
}



app.post("/adminlogin", async (request, response) => {
    try {
        const { email, password } = request.body
        const data = await adminsdata.findOne({ email: email })
        if (data.length == 0) {
            response.send("user doesnot exists")
        }
        else {
            const { encpassword } = data
            const isVerified = await bcrypt.compare(password, encpassword)
            if (isVerified) {
                const payload = {
                    email: email
                }
                const jwtToken = jwt.sign(payload, "MY_SECRET_KEY")
                response.send({ jwtToken: jwtToken })
            }
            else {
                response.send({ "message": "password is incorrect" })
            }
        }
    }
    catch (error) {
        response.send(error.message)
    }
})

// announcement 



app.post('/newannouncement', jwtVerification, async (request, response) => {
    try {
        const { announce, description } = request.body
        await announcemet.insertOne({
            announcement: announce,
            description: description
        })
        response.status(201)
        response.send({
            "message": "new announcement created"
        })
    }
    catch (error) {
        response.send(error.message)
    }
})

app.delete("/deleteannouncement/:id", jwtVerification, async (request, response) => {
    try {
        const { id } = request.params
        await announcemet.deleteOne({ "_id": id })
        response.status(209)
        response.send({
            "message": 'deleted successfully'
        })
    }
    catch (error) {
        response.send(error.message)
    }
})

app.post('/event-images', jwtVerification, upload.single('poster'), async (req, res) => {
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

app.post('/newevent', jwtVerification, upload.single('poster'), async (req, res) => {
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

app.delete('/remove-event/:id', jwtVerification, async (request, response) => {
    try {
        const { id } = request.params
        await Event.deleteOne({ "_id": id })
        response.status(209)
        response.send({
            "message": "event-deleted-successfully"
        })
    }
    catch (err) {
        response.status(500)
        response.send(err.message)
    }
})

app.post('/update-event/:id', jwtVerification, async (request, response) => {
    try {
        const { id } = request.params
        const result = await cloudinary.uploader.upload(req.file.path);
        const organisers = JSON.parse(req.body.organisers);
        const timeline = JSON.parse(req.body.timeline);
        const timings = JSON.parse(req.body.timings);

        await Event.collection.updateOne({ "_id": id }, {
            $set:
            {
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
            }
        });
        fs.unlinkSync(req.file.path);
        res.status(201)
        res.send("successful")
        response.send({
            "message": "updated successfully"
        })
    }
    catch (err) {
        response.send(err.message)
    }
})



app.get("/allannouncements", (request, response) => {
    try {
        const data = announcemet.find()
        response.send(data)
    }
    catch (error) {
        response.send(error.message)
    }
})


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


