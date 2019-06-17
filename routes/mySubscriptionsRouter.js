const express = require('express');
const bodyParser = require('body-parser');
const cors = require('./cors');
var config = require('../config');

var mySubscriptionsRouter = express.Router();
mySubscriptionsRouter.use(bodyParser.json());

const LoFromSubscriptions = require('../models/loFromSubscription');

/**
 * @swagger
 * /mySubscriptions:
 *   post:
 *     tags:
 *       - Logistics Objects from Publishers
 *     name: Add logistics objects 
 *     summary: Add logistics objects from publishers
 *     description: Add logistics objects from publishers to which I subscribed to. The endpoint does not require any authentication.
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
*       - name: body
 *         in: body
 *         description: Content of a logistics object for which I have a subscription for.
 *         schema:
 *           type: object
 *           properties:
 *             lo:
 *               type: Object
 *             subscriptionKey:
 *               type: string
 *         required:
 *           - lo
 *           - subscriptionKey
 *     responses:
 *       '201':
 *         description: Logistics object notification successful
 *       '401':
 *         description: Not authenticated
 *       '500':
 *         description: Internal Server Error
 */
mySubscriptionsRouter.route('/')
    .options(cors.cors, (req, res) => { res.sendStatus(200); })
    .post(cors.cors, (req, res, next) => {
        if (req.body.subscriptionKey === config.subscriptionKey) {
            var loFromSubscriptions = new LoFromSubscriptions({ lo: req.body.lo });
            LoFromSubscriptions.create(loFromSubscriptions)
                .then((logobj) => {
                    res.statusCode = 201;
                    res.setHeader('Content-Type', 'application/json');
                    res.json({ message: 'Logistics object notification successful!' });
                }, (err) => next(err))
                .catch((err) => next(err));
        } else {
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            res.json({ message: 'Unauthorized to send logistics objetcts to this server' });
        }
    })

    /**
     * @swagger
     * /mySubscriptions:
     *   get:
     *     tags:
     *       - Logistics Objects from Publishers
     *     name: Get saved logistics objects from my subscriptions
     *     summary:  Get saved logistics objects from my subscriptions
     *     description:  Get saved logistics objects from my subscriptions to publishers. The endpoint does not require any authentication.
     *     consumes:
     *       - application/json
     *     produces:
     *       - application/json
     *     responses:
     *       '200':
     *         description: List of subscriptions
     *       '500':
     *         description: Internal Server Error
     */
    .get(cors.cors, (req, res, next) => {
        LoFromSubscriptions.find({})
            .then((subscriptions) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                var i = subscriptions.length;
                var out = [];
                while (i--) {
                    out[i] = {
                        "lo": subscriptions[i].lo
                    }
                }
                res.json(out);
            }, (err) => next(err))
            .catch((err) => next(err));
    });

module.exports = mySubscriptionsRouter;