const express = require('express');
const bodyParser = require('body-parser');
var auth = require('../authenticate');
const cors = require('./cors');
const nodemailer = require('nodemailer');

const emailRouter = express.Router();
emailRouter.use(bodyParser.json());

/**
 * @swagger
 * /email:
 *   post:
 *     tags:
 *       - Email
 *     name: Email
 *     summary: Email a user
 *     description: Send an Email to the designated parties list.
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: body
 *         in: body
 *         schema:
 *           type: object
 *           properties:
 *             subject:
 *               type: string
 *             email:
 *               type: string
 *             message:
 *               type: string 
 *         required:
 *           - name
 *           - email
 *           - message
 *     responses:
 *       '200':
 *         description: Email sent succesfully
 *       '400':
 *         description: Email sent unsuccessful
 *       '500':
 *         description: Internal Server Error
 */
emailRouter.route('/')
    .options(cors.cors, (req, res) => { res.sendStatus(200); })
    .post(cors.cors, (req, res, next) => {
        console.log(req.body);
        // Generate SMTP service account from ethereal.email


        let transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            auth: {
                user: 'mckenzie.weissnat51@ethereal.email',
                pass: 'uaQn5Y6uJXgQwY3YZk'
            }
        });

        // Message object
        let message = {
            from: 'sender@example.com',
            to: req.body.email,
            subject: req.body.subject + ' ✔',
            text: req.body.message,
            html: '<p>' + req.body.message + '</p>'
        };

        transporter.sendMail(message, (err, info) => {
            if (err) {
                console.log('Error occurred. ' + err.message);
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.header("Access-Control-Allow-Origin", "*");
                res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
                res.json({ message: err.message });
                return;
            }

            console.log('Message sent: %s', info.messageId);
            // Preview only available when sending through an Ethereal account
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.json({ message: 'Preview URL: ' + nodemailer.getTestMessageUrl(info) });
        });

    });

module.exports = emailRouter;