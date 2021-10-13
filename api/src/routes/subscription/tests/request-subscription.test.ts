import { StatusCodes } from 'http-status-codes';
import { SubscriptionRoutes } from '..';
import { Subscription } from '../../../models/types/subscription';
import { AccessRights, SubscriptionType } from '../../../models/schemas/subscription';
import { ChannelInfoService } from '../../../services/channel-info-service';
import { StreamsService } from '../../../services/streams-service';
import { SubscriptionService } from '../../../services/subscription-service';
import { UserService } from '../../../services/user-service';
import { StreamsConfigMock } from '../../../test/mocks/config';
import { LoggerMock } from '../../../test/mocks/logger';

describe('test request subscription route', () => {
	let sendMock: any, sendStatusMock: any, nextMock: any, res: any;
	let subscriptionRoutes: SubscriptionRoutes, streamsService: StreamsService;
	let channelInfoService: ChannelInfoService, userService: UserService, subscriptionService: SubscriptionService;

	beforeEach(() => {
		sendMock = jest.fn();
		sendStatusMock = jest.fn();
		nextMock = jest.fn();
		const config = StreamsConfigMock;
		userService = new UserService({} as any, '', LoggerMock);
		streamsService = new StreamsService(config, LoggerMock);
		channelInfoService = new ChannelInfoService(userService);
		subscriptionService = new SubscriptionService(streamsService, channelInfoService, config);
		subscriptionRoutes = new SubscriptionRoutes(subscriptionService, channelInfoService, LoggerMock);

		res = {
			send: sendMock,
			sendStatus: sendStatusMock,
			status: jest.fn(() => res)
		};
	});

	it('should call nextMock if no body is provided', async () => {
		const loggerSpy = spyOn(LoggerMock, 'error');
		const req: any = {
			params: {},
			user: { identityId: undefined },
			body: undefined // no body
		};

		await subscriptionRoutes.requestSubscription(req, res, nextMock);
		expect(loggerSpy).toHaveBeenCalledWith(new Error("Cannot read property 'seed' of undefined"));
		expect(nextMock).toHaveBeenCalledWith(new Error('could not request the subscription'));
	});

	it('should bad request if no identityId is provided', async () => {
		const req: any = {
			params: {},
			user: { identityId: undefined }, //no identityId,
			body: { accessRights: AccessRights.Read }
		};

		await subscriptionRoutes.requestSubscription(req, res, nextMock);
		expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
		expect(res.send).toHaveBeenCalledWith({ error: 'no channelAddress or identityId provided' });
	});

	it('should return bad request since no channelAddress is provided', async () => {
		spyOn(subscriptionService, 'getSubscription').and.returnValue({}); // already a subscription is found!
		const req: any = {
			params: {}, // no channelAddress
			user: { identityId: 'did:iota1234' },
			body: { accessRights: AccessRights.Read }
		};

		await subscriptionRoutes.requestSubscription(req, res, nextMock);
		expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
		expect(res.send).toHaveBeenCalledWith({ error: 'no channelAddress or identityId provided' });
	});

	it('should return bad request since already a subscription is requested', async () => {
		spyOn(subscriptionService, 'getSubscription').and.returnValue({}); // already a subscription is found!
		const req: any = {
			params: { channelAddress: 'testaddress' },
			user: { identityId: 'did:iota1234' },
			body: { accessRights: AccessRights.Read }
		};

		await subscriptionRoutes.requestSubscription(req, res, nextMock);
		expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
		expect(res.send).toHaveBeenCalledWith('subscription already requested');
	});

	it('should not create a subscription since publicKey already used', async () => {
		const loggerSpy = spyOn(LoggerMock, 'error');
		const foundSubscription: Subscription = {
			accessRights: AccessRights.Read,
			channelAddress: 'testaddress',
			identityId: 'did:iota:1234',
			isAuthorized: false,
			publicKey: 'testpublickey',
			state: 'teststate',
			subscriptionLink: 'testlink',
			type: SubscriptionType.Subscriber
		};
		const seed: string = undefined;
		const presharedKey: string = undefined;
		spyOn(subscriptionService, 'getSubscription').and.returnValue(null);
		const getSubscriptionByPublicKeySpy = spyOn(subscriptionService, 'getSubscriptionByPublicKey').and.returnValue(foundSubscription); // found some subscription so should return an error
		const exportSubscriptionSpy = spyOn(streamsService, 'exportSubscription').and.returnValue('teststate');

		const requestSubscriptionSpy = spyOn(streamsService, 'requestSubscription').and.returnValue({
			subscriber: null,
			subscriptionLink: 'testlink',
			publicKey: 'testpublickey',
			seed: 'testseed'
		});
		const req: any = {
			params: { channelAddress: 'testaddress' },
			user: { identityId: 'did:iota:1234' },
			body: { accessRights: AccessRights.Read }
		};

		await subscriptionRoutes.requestSubscription(req, res, nextMock);

		expect(requestSubscriptionSpy).toHaveBeenCalledWith('testaddress', seed, presharedKey);
		expect(getSubscriptionByPublicKeySpy).toHaveBeenCalledWith('testaddress', 'testpublickey');
		expect(exportSubscriptionSpy).not.toHaveBeenCalled();
		expect(loggerSpy).toHaveBeenCalledWith(new Error('public key already used'));
		expect(nextMock).toHaveBeenCalledWith(new Error('could not request the subscription'));
	});

	it('should create a subscription', async () => {
		const seed: string = undefined;
		const presharedKey: string = undefined;
		spyOn(subscriptionService, 'getSubscription').and.returnValue(null);
		const subscriptionServiceAddSpy = spyOn(subscriptionService, 'addSubscription');
		const getSubscriptionByPublicKeySpy = spyOn(subscriptionService, 'getSubscriptionByPublicKey').and.returnValue(null);
		const exportSubscriptionSpy = spyOn(streamsService, 'exportSubscription').and.returnValue('teststate');
		const addChannelSubscriberIdSpy = spyOn(channelInfoService, 'addChannelSubscriberId');

		const requestSubscriptionSpy = spyOn(streamsService, 'requestSubscription').and.returnValue({
			subscriber: null,
			subscriptionLink: 'testlink',
			publicKey: 'testpublickey',
			seed: 'testseed'
		});
		const req: any = {
			params: { channelAddress: 'testaddress' },
			user: { identityId: 'did:iota:1234' },
			body: { accessRights: AccessRights.Read }
		};

		await subscriptionRoutes.requestSubscription(req, res, nextMock);

		const expectedSubscription: Subscription = {
			accessRights: AccessRights.Read,
			channelAddress: 'testaddress',
			identityId: 'did:iota:1234',
			isAuthorized: false,
			publicKey: 'testpublickey',
			state: 'teststate',
			subscriptionLink: 'testlink',
			type: SubscriptionType.Subscriber
		};

		expect(requestSubscriptionSpy).toHaveBeenCalledWith('testaddress', seed, presharedKey);
		expect(exportSubscriptionSpy).toHaveBeenCalled();
		expect(getSubscriptionByPublicKeySpy).toHaveBeenCalledWith('testaddress', 'testpublickey');
		expect(subscriptionServiceAddSpy).toHaveBeenCalledWith(expectedSubscription);
		expect(addChannelSubscriberIdSpy).toHaveBeenCalledWith('testaddress', 'did:iota:1234');
		expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
		expect(res.send).toHaveBeenCalledWith({ seed: 'testseed', subscriptionLink: 'testlink' });
	});

	it('should create a subscription using a preshared key', async () => {
		const seed: string = undefined;
		const presharedKey = 'd57921c36648c411db5048b652ec11b8';
		spyOn(subscriptionService, 'getSubscription').and.returnValue(null);
		const subscriptionServiceAddSpy = spyOn(subscriptionService, 'addSubscription');
		const getSubscriptionByPublicKeySpy = spyOn(subscriptionService, 'getSubscriptionByPublicKey').and.returnValue(null);
		const exportSubscriptionSpy = spyOn(streamsService, 'exportSubscription').and.returnValue('teststate');
		const addChannelSubscriberIdSpy = spyOn(channelInfoService, 'addChannelSubscriberId');

		const requestSubscriptionSpy = spyOn(streamsService, 'requestSubscription').and.returnValue({
			subscriber: null,
			subscriptionLink: 'testlink',
			publicKey: 'testpublickey',
			seed: 'testseed',
			pskId: 'testpskid'
		});
		const req: any = {
			params: { channelAddress: 'testaddress' },
			user: { identityId: 'did:iota:1234' },
			body: { accessRights: AccessRights.Audit, presharedKey }
		};

		await subscriptionRoutes.requestSubscription(req, res, nextMock);

		const expectedSubscription: Subscription = {
			channelAddress: 'testaddress',
			identityId: 'did:iota:1234',
			publicKey: 'testpublickey',
			state: 'teststate',
			subscriptionLink: 'testlink',
			type: SubscriptionType.Subscriber,
			// differences for auditor
			accessRights: AccessRights.Audit, // access rights is audit
			keyloadLink: 'testaddress', // keyload link is channel address
			isAuthorized: true, // is directly authorized
			pskId: 'testpskid' // has preshared key
		};

		expect(requestSubscriptionSpy).toHaveBeenCalledWith('testaddress', seed, presharedKey);
		expect(getSubscriptionByPublicKeySpy).toHaveBeenCalledWith('testaddress', 'testpublickey');
		expect(exportSubscriptionSpy).toHaveBeenCalled();
		expect(subscriptionServiceAddSpy).toHaveBeenCalledWith(expectedSubscription);
		expect(addChannelSubscriberIdSpy).toHaveBeenCalledWith('testaddress', 'did:iota:1234');
		expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
		expect(res.send).toHaveBeenCalledWith({ seed: 'testseed', subscriptionLink: 'testlink' });
	});

	it('should create a subscription using a preshared key but not having ReadAndWrite rights', async () => {
		const seed: string = undefined;
		const presharedKey = 'd57921c36648c411db5048b652ec11b8';
		spyOn(subscriptionService, 'getSubscription').and.returnValue(null);
		const subscriptionServiceAddSpy = spyOn(subscriptionService, 'addSubscription');
		const getSubscriptionByPublicKeySpy = spyOn(subscriptionService, 'getSubscriptionByPublicKey').and.returnValue(null);
		const exportSubscriptionSpy = spyOn(streamsService, 'exportSubscription').and.returnValue('teststate');
		const addChannelSubscriberIdSpy = spyOn(channelInfoService, 'addChannelSubscriberId');

		const requestSubscriptionSpy = spyOn(streamsService, 'requestSubscription').and.returnValue({
			subscriber: null,
			subscriptionLink: 'testlink',
			publicKey: undefined, // no public key since uses presharedkey
			seed: 'testseed',
			pskId: 'testpskid'
		});
		const req: any = {
			params: { channelAddress: 'testaddress' },
			user: { identityId: 'did:iota:1234' },
			body: { accessRights: AccessRights.ReadAndWrite, presharedKey } // should not consider these ReadAndWrite rights if subscription request has presharedKey
		};

		await subscriptionRoutes.requestSubscription(req, res, nextMock);

		const expectedSubscription: Subscription = {
			channelAddress: 'testaddress',
			identityId: 'did:iota:1234',
			state: 'teststate',
			subscriptionLink: 'testlink',
			type: SubscriptionType.Subscriber,
			// differences for auditor
			accessRights: AccessRights.Audit, // access rights is always audit for presharedKey set
			keyloadLink: 'testaddress', // keyload link is channel address
			isAuthorized: true, // is directly authorized
			pskId: 'testpskid' // has preshared key
		};

		expect(requestSubscriptionSpy).toHaveBeenCalledWith('testaddress', seed, presharedKey);
		expect(getSubscriptionByPublicKeySpy).not.toHaveBeenCalled(); // not called since it has no public key because of preshared key
		expect(exportSubscriptionSpy).toHaveBeenCalled();
		expect(subscriptionServiceAddSpy).toHaveBeenCalledWith(expectedSubscription);
		expect(addChannelSubscriberIdSpy).toHaveBeenCalledWith('testaddress', 'did:iota:1234');
		expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
		expect(res.send).toHaveBeenCalledWith({ seed: 'testseed', subscriptionLink: 'testlink' });
	});
});
