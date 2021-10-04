import { StatusCodes } from 'http-status-codes';
import { SubscriptionRoutes } from '..';
import { AccessRights, SubscriptionType } from '../../../models/schemas/subscription';
import { Subscription } from '../../../models/types/subscription';
import { ChannelInfoService } from '../../../services/channel-info-service';
import { StreamsService } from '../../../services/streams-service';
import { SubscriptionService } from '../../../services/subscription-service';
import { UserService } from '../../../services/user-service';
import { StreamsConfigMock } from '../../../test/mocks/config';
import { LoggerMock } from '../../../test/mocks/logger';

describe('test getSubscriptions and getSubscriptionByIdentity routes', () => {
	let sendMock: any, sendStatusMock: any, nextMock: any, res: any;
	let subscriptionRoutes: SubscriptionRoutes, streamsService: StreamsService;
	let channelInfoService: ChannelInfoService, userService: UserService, subscriptionService: SubscriptionService;
	const subscriptionMock: Subscription = {
		accessRights: AccessRights.Read,
		channelAddress: 'testaddress',
		identityId: 'did:iota:1234',
		isAuthorized: false,
		publicKey: 'testpublickey',
		state: 'teststate',
		subscriptionLink: 'testlink',
		type: SubscriptionType.Subscriber
	};

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

	it('should bad request since no channelAddress is provided', async () => {
		const req: any = {
			params: {}, // missing channelAddress
			user: {},
			body: {}
		};
		await subscriptionRoutes.getSubscriptions(req, res, nextMock);
		expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
		expect(res.send).toHaveBeenCalledWith({ error: 'no channelAddress provided' });
	});

	it('should return ok with subscription', async () => {
		spyOn(subscriptionService, 'getSubscriptions').and.returnValue([subscriptionMock]);
		const channelAddress = 'testaddress';
		const req: any = {
			params: { channelAddress },
			user: { identityId: 'did:iota:1234' },
			body: undefined
		};
		await subscriptionRoutes.getSubscriptions(req, res, nextMock);
		expect(subscriptionService.getSubscriptions).toHaveBeenCalledWith(channelAddress, undefined);
		expect(res.send).toHaveBeenCalledWith([subscriptionMock]);
		expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
	});

	it('should return ok with service receiving isAuthorized equals true', async () => {
		spyOn(subscriptionService, 'getSubscriptions').and.returnValue([subscriptionMock]);
		const channelAddress = 'testaddress';
		const isAuthorized = 'true';
		const req: any = {
			params: { channelAddress },
			query: { 'is-authorized': isAuthorized },
			user: { identityId: 'did:iota:1234' },
			body: undefined
		};
		await subscriptionRoutes.getSubscriptions(req, res, nextMock);
		expect(subscriptionService.getSubscriptions).toHaveBeenCalledWith(channelAddress, true);
		expect(res.send).toHaveBeenCalledWith([subscriptionMock]);
		expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
	});

	it('should return ok with service receiving isAuthorized equals false', async () => {
		spyOn(subscriptionService, 'getSubscriptions').and.returnValue([subscriptionMock]);
		const channelAddress = 'testaddress';
		const isAuthorized = 'false';
		const req: any = {
			params: { channelAddress },
			query: { 'is-authorized': isAuthorized },
			user: { identityId: 'did:iota:1234' },
			body: undefined
		};
		await subscriptionRoutes.getSubscriptions(req, res, nextMock);
		expect(subscriptionService.getSubscriptions).toHaveBeenCalledWith(channelAddress, false);
		expect(res.send).toHaveBeenCalledWith([subscriptionMock]);
		expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
	});

	it('should return bad request since params are missing', async () => {
		const req: any = {
			params: {}, // missing channelAddress and identityId
			user: { identityId: 'did:iota:1234' },
			body: undefined
		};
		await subscriptionRoutes.getSubscriptionByIdentity(req, res, nextMock);
		expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
		expect(res.send).toHaveBeenCalledWith({ error: 'no channelAddress or identityId provided' });
	});

	it('should return bad request since params are missing', async () => {
		spyOn(subscriptionService, 'getSubscription').and.returnValue(subscriptionMock);
		const channelAddress = 'did:iota:1234';
		const identityId = 'did:iota:5678';
		const req: any = {
			params: { channelAddress, identityId },
			user: { identityId: 'did:iota:1234' },
			body: undefined
		};
		await subscriptionRoutes.getSubscriptionByIdentity(req, res, nextMock);
		expect(subscriptionService.getSubscription).toHaveBeenCalledWith(channelAddress, identityId);
		expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
		expect(res.send).toHaveBeenCalledWith(subscriptionMock);
	});
});

describe('test addSubscription route', () => {
	let sendMock: any, sendStatusMock: any, nextMock: any, res: any;
	let subscriptionRoutes: SubscriptionRoutes, streamsService: StreamsService;
	let channelInfoService: ChannelInfoService, userService: UserService, subscriptionService: SubscriptionService;
	const subscriptionMock: Subscription = {
		accessRights: AccessRights.Read,
		channelAddress: 'testaddress',
		identityId: 'did:iota:1234',
		isAuthorized: false,
		publicKey: 'testpublickey',
		state: 'teststate',
		subscriptionLink: 'testlink',
		type: SubscriptionType.Subscriber
	};

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

	it('should return bad request since params are missing', async () => {
		const req: any = {
			params: {},
			user: { identityId: 'did:iota:1234' },
			body: subscriptionMock
		};
		await subscriptionRoutes.addSubscription(req, res, nextMock);
		expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
		expect(res.send).toHaveBeenCalledWith({ error: 'no channelAddress, identityId or publicKey provided' });
	});

	it('should return bad request since subscription has no publicKey', async () => {
		// shallow object copy
		const subscriptionMockWithoutPublicKey = Object.assign({}, subscriptionMock);
		delete subscriptionMockWithoutPublicKey.publicKey;
		const channelAddress = '1234234234';
		const identityId = 'did:iota:5678';
		const req: any = {
			params: { channelAddress, identityId },
			user: { identityId: 'did:iota:1234' },
			body: subscriptionMockWithoutPublicKey
		};
		await subscriptionRoutes.addSubscription(req, res, nextMock);
		expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
		expect(res.send).toHaveBeenCalledWith({ error: 'no channelAddress, identityId or publicKey provided' });
	});

	it('should return bad request since subscription has already been added', async () => {
		spyOn(subscriptionService, 'getSubscription').and.returnValue(subscriptionMock);
		const channelAddress = '1234234234';
		const identityId = 'did:iota:5678';
		const req: any = {
			params: { channelAddress, identityId },
			user: { identityId: 'did:iota:1234' },
			body: subscriptionMock
		};
		await subscriptionRoutes.addSubscription(req, res, nextMock);
		expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
		expect(res.send).toHaveBeenCalledWith({ error: 'subscription already added' });
	});

	it('should return created', async () => {
		spyOn(subscriptionService, 'addSubscription').and.returnValue(undefined);
		spyOn(subscriptionService, 'getSubscription').and.returnValue(undefined);
		const channelAddress = '1234234234';
		const identityId = 'did:iota:5678';
		const req: any = {
			params: { channelAddress, identityId },
			user: { identityId: 'did:iota:1234' },
			body: subscriptionMock
		};
		await subscriptionRoutes.addSubscription(req, res, nextMock);
		expect(subscriptionService.addSubscription).toHaveBeenCalledWith(subscriptionMock);
		expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
		expect(res.send).toHaveBeenCalledWith(subscriptionMock);
	});
});

describe('test updateSubscription route', () => {
	let sendMock: any, sendStatusMock: any, nextMock: any, res: any;
	let subscriptionRoutes: SubscriptionRoutes, streamsService: StreamsService;
	let channelInfoService: ChannelInfoService, userService: UserService, subscriptionService: SubscriptionService;
	const subscriptionMock: Subscription = {
		accessRights: AccessRights.Read,
		channelAddress: 'testaddress',
		identityId: 'did:iota:1234',
		isAuthorized: false,
		publicKey: 'testpublickey',
		state: 'teststate',
		subscriptionLink: 'testlink',
		type: SubscriptionType.Subscriber
	};

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

	it('should return bad request since params are missing', async () => {
		const req: any = {
			params: {},
			user: { identityId: 'did:iota:1234' },
			body: subscriptionMock
		};
		await subscriptionRoutes.updateSubscription(req, res, nextMock);
		expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
		expect(res.send).toHaveBeenCalledWith({ error: 'no channelAddress or identityId provided' });
	});

	it('should return unauthorized since userIdentityId and subscriberId, userIdentityId and authorId do not match', async () => {
		spyOn(channelInfoService, 'getChannelInfo').and.returnValue({ authorId: 'did:iota:91011' });
		const channelAddress = '1234234234';
		const identityId = 'did:iota:5678';
		const req: any = {
			params: { channelAddress, identityId },
			user: { identityId: 'did:iota:1234' },
			body: subscriptionMock
		};
		await subscriptionRoutes.updateSubscription(req, res, nextMock);
		expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
		expect(res.send).toHaveBeenCalledWith({ error: 'not authorized to update the subscription' });
	});

	it('should return not found since so subscription with channelAddress and identityId does not exist', async () => {
		spyOn(channelInfoService, 'getChannelInfo').and.returnValue({ authorId: 'did:iota:91011' });
		spyOn(subscriptionService, 'getSubscription').and.returnValue(undefined);
		const channelAddress = '1234234234';
		const identityId = 'did:iota:1234';
		const req: any = {
			params: { channelAddress, identityId },
			user: { identityId: 'did:iota:1234' },
			body: subscriptionMock
		};
		await subscriptionRoutes.updateSubscription(req, res, nextMock);
		expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
		expect(res.send).toHaveBeenCalledWith({ error: 'no subscription found' });
	});

	it('should return ok', async () => {
		spyOn(channelInfoService, 'getChannelInfo').and.returnValue({ authorId: 'did:iota:91011' });
		spyOn(subscriptionService, 'getSubscription').and.returnValue({ channelAddress: '1234234234' });
		spyOn(subscriptionService, 'updateSubscription').and.returnValue(undefined);
		const channelAddress = 'did:iota:1234';
		const identityId = 'did:iota:1234';
		const req: any = {
			params: { channelAddress, identityId },
			user: { identityId: 'did:iota:1234' },
			body: subscriptionMock
		};
		await subscriptionRoutes.updateSubscription(req, res, nextMock);

		expect(subscriptionService.updateSubscription).toHaveBeenCalledWith(channelAddress, identityId, subscriptionMock);
		expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
		expect(res.send).toHaveBeenCalledWith();
	});
});


describe('test deleteSubscription route', () => {
	let sendMock: any, sendStatusMock: any, nextMock: any, res: any;
	let subscriptionRoutes: SubscriptionRoutes, streamsService: StreamsService;
	let channelInfoService: ChannelInfoService, userService: UserService, subscriptionService: SubscriptionService;
	const subscriptionMock: Subscription = {
		accessRights: AccessRights.Read,
		channelAddress: 'testaddress',
		identityId: 'did:iota:1234',
		isAuthorized: false,
		publicKey: 'testpublickey',
		state: 'teststate',
		subscriptionLink: 'testlink',
		type: SubscriptionType.Subscriber
	};

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

	it('should return bad request since params are missing', async () => {
		const req: any = {
			params: {},
			user: { identityId: 'did:iota:1234' }
		};
		await subscriptionRoutes.deleteSubscription(req, res, nextMock);
		expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
		expect(res.send).toHaveBeenCalledWith({ error: 'no channelAddress or identityId provided' });
	});

	it('should return unauthorized since userIdentityId and subscriberId, userIdentityId and authorId do not match', async () => {
		spyOn(channelInfoService, 'getChannelInfo').and.returnValue({ authorId: 'did:iota:91011' });
		const channelAddress = '1234234234';
		const identityId = 'did:iota:5678';
		const req: any = {
			params: { channelAddress, identityId },
			user: { identityId: 'did:iota:1234' }
		};
		await subscriptionRoutes.deleteSubscription(req, res, nextMock);
		expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
		expect(res.send).toHaveBeenCalledWith({ error: 'not authorized to delete the subscription' });
	});

	it('should return not found since so subscription with channelAddress and identityId does not exist', async () => {
		spyOn(channelInfoService, 'getChannelInfo').and.returnValue({ authorId: 'did:iota:91011' });
		spyOn(subscriptionService, 'getSubscription').and.returnValue(undefined);
		const channelAddress = '1234234234';
		const identityId = 'did:iota:1234';
		const req: any = {
			params: { channelAddress, identityId },
			user: { identityId: 'did:iota:1234' },
			body: subscriptionMock
		};
		await subscriptionRoutes.deleteSubscription(req, res, nextMock);
		expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
		expect(res.send).toHaveBeenCalledWith({ error: 'no subscription found' });
	});

	it('should return ok', async () => {
		spyOn(channelInfoService, 'getChannelInfo').and.returnValue({ authorId: 'did:iota:91011' });
		spyOn(subscriptionService, 'getSubscription').and.returnValue({ channelAddress: '1234234234' });
		spyOn(subscriptionService, 'deleteSubscription').and.returnValue(undefined);
		const channelAddress = 'did:iota:1234';
		const identityId = 'did:iota:1234';
		const req: any = {
			params: { channelAddress, identityId },
			user: { identityId: 'did:iota:1234' },
			body: subscriptionMock
		};
		await subscriptionRoutes.deleteSubscription(req, res, nextMock);

		expect(subscriptionService.deleteSubscription).toHaveBeenCalledWith(channelAddress, identityId);
		expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
		expect(res.send).toHaveBeenCalledWith();
	});
});