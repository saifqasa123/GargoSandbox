const express = require('express');
const bodyParser = require('body-parser');
const cors = require('./cors');


/**
 * @swagger
 * /dataStreaming:
 *   post:
 *     tags:
 *       - Data Streaming
 *     name: data streaming 
 *     summary: Use this API service to get hooked up with the Iot device
 *     description: capturing a real life data from the IoT device and display it on the console.
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: body
 *         in: body
 *         description: Content of the data the get captured from the IoT devices 
 *         schema:
 *           type : object
 *     responses:
 *       '200':
 *         description: Data sent succesfully
 *       '400':
 *         description: Data sent unsuccessful
 *       '500':
 *         description: Internal Server Error
 */
const dataStreaming = express.Router();
dataStreaming.use(bodyParser.json());

dataStreaming.route('/')
    .options(cors.cors, (req, res) => { res.sendStatus(200); })
    .post(cors.cors, (req, res, next) => {

        console.log(req.body);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(req.body);
    });

    module.exports = dataStreaming;