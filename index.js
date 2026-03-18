const express = require('express')
const mongoose = require("mongoose")
const app = express()
app.use(express.json())
const cloudinary = require('cloudinary').v2
// const express = require('express')
const multer = require('multer')
const upload = multer({ dest: 'uploads/' })



mongoose.connect("mongodb+srv://Tejeshwar:Tejeshwar1%40@e-learning.3majdl2.mongodb.net/CollegeEvents")
    .then(() => {
        console.log("connection successful")
    })
    .catch((error) => {
        console.log(error.message)
    })


/* 
poster: {
        url: {
            type: String,
            required: true
        },
        type: {
            type: String,
            required: true
        }
    },

*/

const eventSchema = new mongoose.Schema({

    title: {
        type: String,
        required: true,
        trim: true
    },


    description: {
        type: String,
        required: true
    },

    details: {
        type: String,
        required: true
    },

    organisers: [
        {
            type: String,
            required: true
        }
    ],

    timeline: [
        {
            stage: {
                type: String,
                required: true
            },
            date: {
                type: String,
                required: true
            }
        }
    ],

    timings: {
        start: {
            type: String,
            required: true
        },
        end: {
            type: String,
            required: true
        }
    },

    createdBy: {
        type: String,
        required: true
    },

    isActive: {
        type: Boolean,
        default: true
    }

})



const event = new mongoose.model("event", eventSchema)



app.post('/newevent', async (request, response) => {
    try {
        const { title, description, details, organisers, timeline, timings, createdBy, isActive } = request.body
        await event.insertOne({
            title: title,
            description: description,
            details: details,
            organisers: organisers,
            timeline: timeline,
            timings: timings,
            createdBy: createdBy,
            isActive: isActive
        })
        response.status(201)
        response.send({ "message": "event added successfully" })
    }
    catch (error) {
        response.status(500)
        response.send(error.message)
    }
})



app.listen(3000, () => {
    console.log("SERVER IS RUNNING ")
})


