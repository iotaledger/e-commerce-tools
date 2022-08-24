import { Router } from 'express';
import { CreateIdentityBodySchema, UpdateIdentityBodySchema, IdentitySchema } from '@iota/is-shared-modules';
import { IdentityRoutes } from '../../routes/identity';
import { Logger } from '../../utils/logger';
import { authorizationService, userService, verificationService } from '../services';
import { apiKeyMiddleware, authMiddleWare, validate } from '../middlewares';
import { mongodbSanitizer } from '../../middlewares/mongodb-sanitizer';

const identityRoutes = new IdentityRoutes(userService, authorizationService, verificationService, Logger.getInstance());
const { createIdentity, getUser, searchUsers, addUser, updateUser, deleteUser } = identityRoutes;

export const identityRouter = Router();

/**
 * @openapi
 * /identities/create:
 *   post:
 *     summary: Create a new decentralized digital identity (DID)
 *     description: Create a new decentralized digital identity (DID). Identity DID document is signed and published to the ledger (IOTA Tangle). A digital identity can represent an individual, an organization or an object. The privateAuthKey controlling the identity is returned. It is recommended to securely (encrypt) store the privateAuthKey locally, since it is not stored on the APIs Bridge.
 *     tags:
 *     - identities
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/CreateIdentityBodySchema"
 *           example:
 *             username: iota-test-device
 *             hidden: false
 *             claim:
 *               type: Device
 *               category: [sensor]
 *               controlledProperty: [fillingLevel, temperature]
 *               controlledAsset: [wastecontainer-Osuna-100]
 *               ipAddress: [192.14.56.78]
 *               mcc: "214"
 *               mnc: "07"
 *               serialNumber: 9845A
 *               refDeviceModel: myDevice-wastecontainer-sensor-345
 *               dateFirstUsed: 2014-09-11T11:00:00Z
 *               owner: [did:iota:CtPnfQqSZBmZEe5A5iNZzJ6pkCqUxtsFsErNfA3CeHpY]
 *     security:
 *       - BearerAuth: []
 *       - ApiKey: []
 *     responses:
 *       201:
 *         description: Returns the created identity keys
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/IdentityKeysSchema"
 *       401:
 *         description: No valid api key provided
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponseSchema'
 *       5XX:
 *         description: Unexpected error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponseSchema'
 */
identityRouter.post('/create', apiKeyMiddleware, validate({ body: CreateIdentityBodySchema }), mongodbSanitizer, createIdentity);

/**
 * @openapi
 * /identities/search:
 *   get:
 *     summary: Search for identities
 *     description: Search for identities in the system and returns a list of existing identities.
 *     tags:
 *     - identities
 *     parameters:
 *     - name: type
 *       in: query
 *       required: false
 *       schema:
 *         type: string
 *     - name: username
 *       in: query
 *       required: false
 *       schema:
 *         type: string
 *     - name: creator
 *       in: query
 *       required: false
 *       schema:
 *         type: string
 *     - name: 'registration-date'
 *       in: query
 *       required: false
 *       schema:
 *         type: string
 *         format: date-time
 *     - name: limit
 *       in: query
 *       required: false
 *       schema:
 *         type: number
 *         example: 5
 *     - name: index
 *       in: query
 *       required: false
 *       schema:
 *         type: number
 *     - name: asc
 *       in: query
 *       required: false
 *       schema:
 *         type: boolean
 *     security:
 *       - BearerAuth: []
 *       - ApiKey: []
 *     responses:
 *       200:
 *         description: Return list of existing entities.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/IdentitySearchBodySchema'
 *       401:
 *         description: No valid api key provided / Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponseSchema'
 *       5XX:
 *         description: Unexpected error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponseSchema'
 */
identityRouter.get('/search', apiKeyMiddleware, authMiddleWare, searchUsers);

/**
 * @openapi
 * /identities/identity/{id}:
 *   get:
 *     summary: Get information about a specific identity
 *     description: Get information (including attached credentials) about a specific identity using the identity-id (DID identifier).
 *     tags:
 *     - identities
 *     parameters:
 *     - name: id
 *       in: path
 *       required: true
 *       schema:
 *         $ref: '#/components/schemas/IdentityIdSchema'
 *       examples:
 *         id:
 *           value: did:iota:3yKgJoNyH9BEZ5Sh1YuHXAJeNARVqvEJLN87kd2ctm4h
 *           summary: Example identity id (DID identifier)
 *     responses:
 *       200:
 *         description: Return a specific identity / none if no identity exits with given identity-id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/IdentitySchema"
 *       401:
 *         description: No valid api key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponseSchema'
 *       5XX:
 *         description: Unexpected error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponseSchema'
 *
 */
identityRouter.get('/identity/:id', apiKeyMiddleware, authMiddleWare, getUser);

/**
 * @openapi
 * /identities/identity:
 *   post:
 *     summary: Register an existing identity into the Bridge
 *     description: Register an existing identity into the Bridge. This can be used if the identity already exists or it was only created locally. Registering an identity in the Bridge makes it possible to search for it by using some of the identity attributes, i.e., the username.
 *     tags:
 *     - identities
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/IdentitySchema"
 *     responses:
 *       200:
 *         description: The registered entity.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/IdentitySchema"
 *       401:
 *         description: No valid api key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponseSchema'
 *       5XX:
 *         description: Unexpected error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponseSchema'
 */
identityRouter.post('/identity', apiKeyMiddleware, authMiddleWare, validate({ body: IdentitySchema }), mongodbSanitizer, addUser);

/**
 * @openapi
 * /identities/identity:
 *   put:
 *     summary: Update claim of a registered identity
 *     description: Update claim of a registered identity.
 *     tags:
 *     - identities
 *     security:
 *       - BearerAuth: []
 *       - ApiKey: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/IdentitySchema"
 *     responses:
 *       200:
 *         description: The registered entity.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/IdentitySchema"
 *       401:
 *         description: No valid api key provided / Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponseSchema'
 *       5XX:
 *         description: Unexpected error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponseSchema'
 */
identityRouter.put(
	'/identity',
	apiKeyMiddleware,
	authMiddleWare,
	validate({ body: UpdateIdentityBodySchema }),
	mongodbSanitizer,
	updateUser
);

/**
 * @openapi
 * /identities/identity/{id}:
 *   delete:
 *     summary: Removes an identity from the Bridge
 *     description: Removes an identity from the Bridge. An identity can only delete itself and is not able to delete other identities. Administrators are able to remove other identities. The identity cannot be removed from the immutable IOTA Tangle but only at the Bridge. Also the identity credentials will remain and the identity is still able to interact with other bridges.
 *     tags:
 *     - identities
 *     parameters:
 *     - name: id
 *       in: path
 *       required: true
 *       schema:
 *         $ref: '#/components/schemas/IdentityIdSchema'
 *       examples:
 *         id:
 *           value: did:iota:3tqQeyDeEmjjSgAWGa99qmhYgrse9mEX89QqgSwsrrWy
 *           summary: Example identity id (DID identifier)
 *     - name: 'revoke-credentials'
 *       in: query
 *       required: false
 *       description: If true all credentials will be revoked and deleted.
 *       schema:
 *         type: boolean
 *         example: false
 *     - name: 'revoke-subscriptions'
 *       in: query
 *       required: false
 *       description: If true all subscriptions will be revoked and deleted.
 *       schema:
 *         type: boolean
 *         example: false
 *     security:
 *       - BearerAuth: []
 *       - ApiKey: []
 *     responses:
 *       200:
 *         description: Deleted Identity.
 *       401:
 *         description: No valid api key provided / Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponseSchema'
 *       5XX:
 *         description: Unexpected error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponseSchema'
 */
identityRouter.delete('/identity/:id', apiKeyMiddleware, authMiddleWare, deleteUser);
