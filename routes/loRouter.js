const express = require('express');
const bodyParser = require('body-parser');
var auth = require('../authenticate');
var config = require('../config');
var uuid = require('uuid');
const cors = require('./cors');

var request = require('request');

var loRouter = express.Router({ mergeParams: true });
loRouter.use(bodyParser.json());

const Lo = require('../models/lo');
const Company = require('../models/company');
const Subscription = require('../models/subscription');

/**
 * @swagger
 * /companies/{companyId}/los:
 *   post:
 *     tags:
 *       - Companies / Logistics objects
 *     name: Create logistics objects 
 *     summary: Create logistics objects
 *     description: Create logistics objects. When a LO is created, the companies which are subscribed to that type of LO will receive a notification with the new LO.
 *                  Protected endpoint. When trying out this API Swagger will automatically attach the Authentication header using the Bearer token was provided in the Authorize dialog.
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         schema:
 *           type: string
 *         required:
 *           - companyId
 *       - name: body
 *         in: body
 *         description: Content of a logistics object (needs to be one of following types - Airwaybill, Housemanifest, Housewaybill, Booking). See more examples here - 
 *         schema:
 *           type: object
 *     responses:
 *       '201':
 *         description: Logistics object created successfully
 *       '400':
 *         description: Incorrect request body
 *       '401':
 *         description: Not authenticated
 *       '403':
 *         description: This companyId in the request is not the same as the company under which the logged in user is subscribed.
 *       '404':
 *         description: Company not found
 */
loRouter.route('/')
  .options(cors.cors, (req, res) => { res.sendStatus(200); })
  .post(cors.cors, auth.user, (req, res, next) => {
    Company.findOne({ companyId: req.params.companyId })
      .then((company) => {
        if (company.companyId === req.user.companyId) {
          const id = req.body['@id'] ? req.body['@id'] : uuid.v4();
          var logisticsObjectContent = req.body;

          if (!req.body['@type']) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.json({ message: 'Logistics object should contain @type field: Airwaybill, Housemanifest, Housewaybill or Booking' });
            return;          
          };

          if (!req.body['@url']) {
            logisticsObjectContent.url = config.url + '/' + req.params.companyId + '/' + id;
          };

          logisticsObjectContent['@id'] = id;
          var logisticsObject = new Lo({
            logisticsObject: logisticsObjectContent,
            companyId: req.params.companyId,
            url: req.body['@url'] ? req.body['@url'] : config.url + '/' + req.params.companyId + '/' + id,
            type: req.body['@type'],
            loId: id,
          });

          // Notify subscribers which subscribed to this type of LO
          Subscription.find({ documentType: req.body['@type'] }, function (err, subscribers) {
            if (subscribers.length === 0) {
              console.log("No subscribers for document type " + req.body['@type']);
            } else {
              for (i = 0; i < subscribers.length; i++) {
                var json = {
                  lo: req.body.lo,
                  subscriptionKey: subscribers[i].key
                };

                postContent(json, subscribers[i].subscriptionEndpoint);
              }
            }
          });

          logisticsObject.save(function (err, logisticsObject) {
            if (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.json({ err: err });
              return;
            }
            res.statusCode = 201;
            res.setHeader('Content-Type', 'application/json');
            res.json(logisticsObject);
          });
        } else {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'application/json');
          res.json({ message: 'Cannot add: this company is not the one under which the logged in user is registered.' });
        }
      }, (err) => next(err))
      .catch((err) => {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.json({ message: 'CompanyId not found.' });
        return;
      });
  })

  /**
   * @swagger
   * /companies/{companyId}/los:
   *   get:
   *     tags:
   *       - Companies / Logistics objects
   *     name: Return logistics objects
   *     summary: Return logistics objects
   *     description: Return all logistics objects for a given companyId. Protected endpoint. When you try out this API Swagger will automatically attach the Authentication header using the Bearer token you provided in the Authorize dialog.
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
   *         description: Logistics objects returned
   *       '401':
   *         description: Not authenticated
   *       '403':
   *         description: This logistics object is not belonging to the company under which the logged in user is subscribed.
   *       '404':
   *         description: Company not found
   */
  .get(cors.cors, auth.user, auth.company, (req, res, next) => {
    Company.findOne({ companyId: req.params.companyId })
      .then((company) => {
        if (company.companyId === req.user.companyId) {
          Lo.find({ companyId: req.params.companyId })
            .then((los) => {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              var i = los.length;
              var out = [];
              while (i--) {
                out[i] = {
                  "loId": los[i].loId,
                  "logisticsObject": los[i].logisticsObject,
                  "type": los[i].type,
                  "url": los[i].url
                }
              }
              res.json(out);

            }, (err) => next(err))
            .catch((err) => next(err));
        } else {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'application/json');
          res.json({ message: 'Cannot retrieve logistics object: this company is not the one under which the logged in user is registered.' });
        }
      }, (err) => next(err))
      .catch((err) => {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.json({ message: 'CompanyId not found.' });
        return;
      });
  })

  .delete(cors.cors, auth.user, (res) => {
    res.statusCode = 405;
    res.end('DELETE operation not supported for this endpoint');
  });

loRouter.route('/:loId')
  .options(cors.cors, (req, res) => { res.sendStatus(200); })
  .put(cors.cors, auth.user, (res) => {
    res.statusCode = 405;
    res.end('PUT operation not supported for this endpoint');
  })

  /**
  * @swagger
  * /companies/{companyId}/los/{loId}:
  *   get:
  *     tags:
  *       - Companies / Logistics objects
  *     name: Retrieve a logistics object
  *     summary: Retrieve a logistics object
  *     description: Retrieve a logistics object by loId. Protected endpoint. When trying out this API Swagger will automatically attach the Authentication header using the Bearer token was provided in the Authorize dialog.
  *     consumes:
  *       - application/json
  *     produces:
  *       - application/json
  *     security:
  *       - bearerAuth: []
  *     parameters:
  *       - in: path
  *         name: companyId
  *         schema:
  *           type: string
  *         required:
  *           - companyId
  *       - in: path
  *         name: loId
  *         schema:
  *           type: string
  *         required:
  *           - loId
  *     responses:
  *       '200':
  *         description: Logistics object
  *       '401':
  *         description: Not authenticated
  *       '403':
  *         description: This logistics object is not belonging to the company under which the logged in user is subscribed
  *       '404':
  *         description: CompanyId / LoId not found
  */
  .get(cors.cors, auth.user, auth.company, (req, res, next) => {
    Company.findOne({ companyId: req.params.companyId })
      .then((company) => {
        if (company.companyId === req.user.companyId) {
          Lo.findOne({ companyId: req.params.companyId, loId: req.params.loId })
            .then((lo) => {
              if (lo) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(lo);
              } else {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.json({ message: 'LoId not found.' });
              }
            }, (err) => next(err))
            .catch((err) => next(err));
        } else {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'application/json');
          res.json({ message: 'Cannot retrieve logistics object: this company is not the one under which the logged in user is registered.' });
        }
      }, (err) => next(err))
      .catch((err) => {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.json({ message: 'CompanyId not found.' });
        return;
      });
  })

  /**
 * @swagger
 * /companies/{companyId}/los/{loId}:
 *   patch:
 *     tags:
 *       - Companies / Logistics objects
 *     name: Update a logistics object
 *     summary: Update a logistics object
 *     description: Update a logistics object. Protected endpoint. When trying out this API Swagger will automatically attach the Authentication header using the Bearer token was provided in the Authorize dialog.
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         schema:
 *           type: string
 *         required:
 *           - companyId
 *       - in: path
*         name: loId
*         schema:
*           type: string
*         required:
*           - loId
 *       - name: body
 *         in: body
 *         description: Content of a logistics object to update (only fields to update).
 *         schema:
 *           type: object
 *     responses:
 *       '200':
 *         description: Logistics object updated successfully
 *       '401':
 *         description: Not authenticated
 *       '403':
 *         description: This logistics object is not belonging to the company under which the logged in user is subscribed
 *       '404':
 *         description: Company not found
 */
  .patch(cors.cors, auth.user, (req, res, next) => {
    Company.findOne({ companyId: req.params.companyId })
      .then((company) => {
        if (company.companyId === req.user.companyId) {
          Lo.findOne({ companyId: req.params.companyId, loId: req.params.loId })
            .then((lo) => {

              if (req.body['@id']) {
                delete req.body['@id'];
              }

              for (let b in req.body) {
                lo.logisticsObject[b] = req.body[b];
              }

              lo.save();

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.json(lo);
            }, (err) => next(err))
            .catch((err) => next(err));
        } else {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'application/json');
          res.json({ message: 'Cannot retrieve logistics object: this company is not the one under which the logged in user is registered.' });
        }
      }, (err) => next(err))
      .catch((err) => {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.json({ message: 'CompanyId not found.' });
        return;
      });
  })

  /**
 * @swagger
 * /companies/{companyId}/los/{loId}:
 *   delete:
 *     tags:
 *       - Companies / Logistics objects
 *     name: Delete a logistics object
 *     summary: Delete a logistics object
 *     description: Delete a logistics object. Protected endpoint. When trying out this API Swagger will automatically attach the Authentication header using the Bearer token was provided in the Authorize dialog.
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         schema:
 *           type: string
 *         required:
 *           - companyId
 *       - in: path
*         name: loId
*         schema:
*           type: string
*         required:
*           - loId
 *     responses:
 *       '200':
 *         description: Logistics object deleted successfully
 *       '401':
 *         description: Not authenticated
 *       '403':
 *         description: This logistics object is not belonging to the company under which the logged in user is subscribed
 *       '404':
 *         description: CompanyId or LoId not found
 */
  .delete(cors.cors, auth.user, auth.company, (req, res, next) => {
    Company.findOne({ companyId: req.params.companyId })
      .then((company) => {
        if (company.companyId === req.user.companyId) {
          Lo.findOne({ loId: req.params.loId }, function (err, loToDelete) {
            if (err) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 404;
              res.json({ status: 'Cannot find any logistics object to be deleted with the given loId' });
            } else {
              Lo.deleteOne(loToDelete)
                .then((resp) => {
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.json({ "message": "Logistics object successfully deleted" });
                }, (err) => next(err))
                .catch((err) => next(err));
            }
          });
        } else {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'application/json');
          res.json({ message: 'Cannot delete: This logistics object is not belonging to the company under which the logged in user is registered.' });
        }
      }, (err) => next(err))
      .catch((err) => {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.json({ message: 'CompanyId not found.' });
        return;
      });
  });

function postContent(bodyToPost, subscriberHost) {
  request.post(
    subscriberHost,
    { json: bodyToPost },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log("Logistics object successfully sent to subscriber " + subscriberHost);
      }
    }
  );
}

module.exports = loRouter;