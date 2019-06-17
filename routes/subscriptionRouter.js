const express = require('express');
const bodyParser = require('body-parser');
var auth = require('../authenticate');
const cors = require('./cors');

var subscriptionRouter = express.Router({ mergeParams: true });
subscriptionRouter.use(bodyParser.json());

const Subscription = require('../models/subscription');
const Company = require('../models/company');

/**
 * @swagger
 * /companies/{companyId}/subscriptions:
 *   post:
 *     tags:
 *       - Companies / Subscriptions
 *     name: Create a subscription 
 *     summary: Create a subscription 
 *     description: Create a subscription for companyId for given document type. When you try out this API Swagger will automatically attach the Authentication header using the Bearer token you provided in the Authorize dialog.
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: path
 *         name: companyId
 *         schema:
 *           type: string
 *         required:
 *           - companyId
 *       - name: body
 *         in: body
 *         schema:
 *           type: object
 *           properties:
 *             subscriptionEndpoint:
 *               type: string
 *             key:
 *               type: string
 *             documentType:
 *               type: string
 *               enum: [Airwaybill, Housemanifest, Housewaybill, Booking]
 *         required:
 *           - subscriptionEndpoint
 *           - documentType
 *     responses:
 *       '201':
 *         description: Subscription created
 *       '401':
 *         description: Not authenticated
 *       '500':
 *         description: Internal Server Error
 */
subscriptionRouter.route('/')
    .options(cors.cors, (req, res) => { res.sendStatus(200); })
    .post(cors.cors, auth.user, (req, res, next) => {
        Company.findOne({ companyId: req.params.companyId })
            .then((company) => {
                var subscription = new Subscription({
                    companyId: req.params.companyId,
                    subscriptionEndpoint: req.body.subscriptionEndpoint,
                    documentType: req.body.documentType,
                    key: req.body.key,
                });
                subscription.save(function (err, subscription) {
                    if (err) {
                        res.statusCode = 500;
                        res.setHeader('Content-Type', 'application/json');
                        res.json({ err: err });
                        return;
                    }
                    res.statusCode = 201;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(subscription);
                });
            }, (err) => next(err))
            .catch((err) => next(err));
    })

    /**
     * @swagger
     * /companies/{companyId}/subscriptions:
     *   get:
     *     tags:
     *       - Companies / Subscriptions
     *     name: Get subscriptions
     *     summary: Get subscriptions
     *     description: Get subscriptions for a companyId. When you try out this API Swagger will automatically attach the Authentication header using the Bearer token you provided in the Authorize dialog.
     *     security:
     *       - bearerAuth: []
     *     consumes:
     *       - application/json
     *     produces:
     *       - application/json
     *     parameters:
     *       - in: path
     *         name: companyId
     *         schema:
     *           type: string
     *         required:
     *           - companyId
     *     responses:
     *       '200':
     *         description: List of subscriptions
     *       '401':
     *         description: Not authenticated
     *       '403':
     *         description: Not allowed to retrieve
     *       '500':
     *         description: Internal Server Error
     */
    .get(cors.cors, auth.user, (req, res, next) => {
        if (req.params.companyId === req.user.companyId) {
            Subscription.find({ companyId: req.params.companyId })
                .then((subscriptions) => {
                    var i = subscriptions.length;
                    var out = [];
                    while (i--) {
                        out[i] = {
                            "id": subscriptions[i]._id,
                            "subscriptionEndpoint": subscriptions[i].subscriptionEndpoint,
                            "documentType": subscriptions[i].documentType,
                            "active": subscriptions[i].active
                        }
                    }
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(out);
                }, (err) => next(err))
                .catch((err) => next(err));
        } else {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json');
            res.json({ message: 'Cannot fetch: this company is not the one under which the logged in user is subscribed.' });
        }
    })

    /**
     * @swagger
     * /companies/{companyId}/subscriptions:
     *   delete:
     *     tags:
     *       - Companies / Subscriptions
     *     name: Delete subscriptions
     *     summary: Delete subscriptions
     *     description: Delete subscriptions of a companyId. Protected endpoint. When you try out this API Swagger will automatically attach the Authentication header using the Bearer token you provided in the Authorize dialog.
     *     security:
     *       - bearerAuth: [] 
     *     consumes:
     *       - application/json
     *     produces:
     *       - application/json
     *     parameters:
     *       - in: path
     *         name: companyId
     *         description: Id of the company
     *         schema:
     *           type: string
     *         required:
     *           - companyId
     *     responses:
     *       '200':
     *         description: Subscriptions deleted successfully
     *       '401':
     *         description: No auth token / no user found in db with that name
     *       '403':
     *         description: This company is not the one under which the logged in user is subscribed.
     *       '500':
     *         description: Internal Server Error
     */
    .delete(cors.cors, auth.user, auth.company, (req, res, next) => {
        Company.findOne({ companyId: req.params.companyId })
            .then((company) => {
                if (company.companyId === req.user.companyId) {
                    Subscription.find({ companyId: company.companyId }, function (err, subscriptionsToDelete) {
                        if (err) {
                            res.setHeader('Content-Type', 'application/json');
                            res.statusCode = 400;
                            res.json({ message: 'Cannot find any subscriptions to be deleted' });
                        } else {
                            Subscription.deleteMany(subscriptionsToDelete)
                                .then((resp) => {
                                    res.statusCode = 200;
                                    res.setHeader('Content-Type', 'application/json');
                                    res.json({ message: "Subscriptions successfully deleted" });
                                }, (err) => next(err))
                                .catch((err) => next(err));
                        }
                    });
                } else {
                    res.statusCode = 403;
                    res.setHeader('Content-Type', 'application/json');
                    res.json({ message: 'Cannot delete: this company is not the one under which the logged in user is subscribed.' });
                }
            }, (err) => next(err))
            .catch((err) => next(err));
    });

/**
* @swagger
* /companies/{companyId}/subscriptions/{subscriptionId}:
*   patch:
*     tags:
*       - Companies / Subscriptions
*     name: Update subscription
*     summary: Update subscription
*     description: Update subscription information by subscriptionId for a companyId. When you try out this API Swagger will automatically attach the Authentication header using the Bearer token you provided in the Authorize dialog.
*     security:
*       - bearerAuth: []
*     consumes:
*       - application/json
*     produces:
*       - application/json
*     parameters:
*       - in: path
*         name: companyId
*         schema:
*           type: string
*         required:
*           - companyId
*       - in: path
*         name: subscriptionId
*         schema:
*           type: string
*         required:
*           - subscriptionId
*       - name: body
*         in: body
*         schema:
*           type: object
*           properties:
*             subscriptionEndpoint:
*               type: string
*             key:
*               type: string
*             documentType:
*               type: string
*               enum: [Airwaybill, Housemanifest, Housewaybill, Booking]
*     responses:
*       '200':
*         description: Subscription information successfully updated
*       '401':
*         description: Not authenticated
*       '403':
*         description: Not allowed to update
*       '500':
*         description: Internal Server Error
*/
subscriptionRouter.route('/:subscriptionId')
    .options(cors.cors, (req, res) => { res.sendStatus(200); })
    .patch(cors.cors, auth.user, (req, res, next) => {
        if (req.params.companyId === req.user.companyId) {
            Subscription.findByIdAndUpdate(req.params.subscriptionId, req.body, function (err, sub) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json("Subscription updated");
            }, (err) => next(err))
                .catch((err) => next(err));
        } else {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json');
            res.json({ message: 'Cannot update: this company is not the one under which the logged in user is subscribed.' });
        }
    });

module.exports = subscriptionRouter;