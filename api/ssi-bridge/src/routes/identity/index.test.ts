import { IdentityRoutes } from '.';
import * as UserDb from '../../database/user';
import * as IdentityDocsDb from '../../database/identity-keys';
import { IdentityConfig } from '../../models/config';
import { UserPersistence, UserType, User, UserSearch, IdentityClaim, UserRoles } from '@iota/is-shared-modules';
import { getDateFromString, getDateStringFromDate } from '@iota/is-shared-modules/node';
import { AuthorizationService } from '../../services/authorization-service';
import { SsiService } from '../../services/ssi-service';
import { UserService } from '../../services/user-service';
import { TestCredentialMock, TestUsersMock, UserIdentityMock } from '../../test/mocks/identities';
import { StatusCodes } from 'http-status-codes';
import { LoggerMock } from '../../test/mocks/logger';
import { IdentityConfigMock } from '../../test/mocks/config';
import { VerificationService } from '../../services/verification-service';
import { ConfigurationServiceMock } from '../../test/mocks/service-mocks';

describe('test user routes', () => {
	const serverSecret = 'very-secret-secret';
	let sendMock: any,
		sendStatusMock: any,
		nextMock: any,
		res: any,
		userService: UserService,
		userRoutes: IdentityRoutes,
		ssiService: SsiService,
		verificationService: VerificationService;

	beforeEach(() => {
		sendMock = jest.fn();
		sendStatusMock = jest.fn();
		nextMock = jest.fn();

		const identityConfig: IdentityConfig = IdentityConfigMock;
		ssiService = SsiService.getInstance(identityConfig, LoggerMock);
		userService = new UserService(ssiService as any, serverSecret, LoggerMock);
		verificationService = new VerificationService(ssiService, userService, LoggerMock, ConfigurationServiceMock);
		const authorizationService = new AuthorizationService();
		userRoutes = new IdentityRoutes(userService, authorizationService, verificationService, LoggerMock);
		jest.spyOn(userService, 'getIdentityId').mockImplementation(() => null);

		res = {
			send: sendMock,
			sendStatus: sendStatusMock,
			status: jest.fn(() => res)
		};
	});
	describe('test search route', () => {
		it('should call searchUser with expected user search', async () => {
			const expectedUserSearch: UserSearch = {
				type: UserType.Person,
				index: 1,
				limit: 1,
				username: 'charlie',
				creator: 'did:iota:testIdentity',
				registrationDate: getDateFromString('2021-02-12T14:58:05+01:00')
			};
			const searchUserSpy = jest.spyOn(UserDb, 'searchUsers').mockImplementationOnce(async () => []);
			const req: any = {
				params: {},
				query: {
					type: 'Person',
					'registration-date': '2021-02-12T14:58:05+01:00',
					limit: '1',
					index: '1',
					username: 'charlie',
					creator: 'did:iota:testIdentity',
					'subscribed-channel-ids': ['test-address', 'test-address2']
				},
				body: null
			};

			await userRoutes.searchUsers(req, res, nextMock);

			expect(searchUserSpy).toHaveBeenCalledWith(expectedUserSearch);
			expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
			expect(res.send).toHaveBeenCalledWith([]);
		});

		it('should return expected users without claims and verifiable credentials from user search', async () => {
			const expectedUserSearch: UserSearch = {
				type: UserType.Person
			};
			const searchUserSpy = jest.spyOn(UserDb, 'searchUsers').mockImplementationOnce(async () => [
				{
					username: 'test-user1',
					id: 'did:iota:1234',
					claim: { name: 'thisnameisprivate', type: 'testtype' },
					verifiableCredentials: [TestCredentialMock]
				},
				{
					username: 'test-user2',
					id: 'did:iota:12345',
					verifiableCredentials: [TestCredentialMock]
				},
				{
					username: 'test-user3',
					id: 'did:iota:12346',
					claim: { name: 'somehiddenname', type: 'youseeme' }
				}
			]);
			const req: any = {
				params: {},
				query: {
					type: 'Person'
				},
				body: null
			};

			// without credentials or claim
			const expectedSearchResult = [
				{
					username: 'test-user1',
					id: 'did:iota:1234',
					claim: { type: 'testtype' },
					numberOfCredentials: 1
				},
				{
					username: 'test-user2',
					id: 'did:iota:12345',
					claim: { type: undefined },
					numberOfCredentials: 1
				},
				{
					username: 'test-user3',
					id: 'did:iota:12346',
					claim: { type: 'youseeme' },
					numberOfCredentials: 0
				}
			];

			await userRoutes.searchUsers(req, res, nextMock);

			expect(searchUserSpy).toHaveBeenCalledWith(expectedUserSearch);
			expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
			expect(res.send).toHaveBeenCalledWith(expectedSearchResult);
		});
	});

	describe('test GET user', () => {
		it('should return bad request if no user id is given as parameter', async () => {
			const req: any = {
				params: {},
				body: null
			};

			await userRoutes.getUser(req, res, nextMock);
			expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
			expect(res.send).toHaveBeenCalledWith({ error: 'no id provided' });
		});
		it('should return expected user', async () => {
			const date = getDateFromString('2021-02-12T14:58:05+01:00');
			const user: UserPersistence = {
				id: 'did:iota:2QQd1DN1ZjnXnvSAaAjk1VveBNUYDw7eE9bTTCC4RbG4',
				username: 'first-user',
				claim: { type: UserType.Person, firstName: 'Tom', lastName: 'Tomson' } as IdentityClaim,
				registrationDate: date
			};
			const getUserSpy = jest.spyOn(UserDb, 'getUser').mockImplementationOnce(async () => user);
			const req: any = {
				params: { id: 'did:iota:2QQd1DN1ZjnXnvSAaAjk1VveBNUYDw7eE9bTTCC4RbG4' },
				body: null,
				user: TestUsersMock[0]
			};

			await userRoutes.getUser(req, res, nextMock);

			expect(getUserSpy).toHaveBeenCalledTimes(1);
			expect(sendMock).toHaveBeenCalledWith({
				id: 'did:iota:2QQd1DN1ZjnXnvSAaAjk1VveBNUYDw7eE9bTTCC4RbG4',
				username: 'first-user',
				claim: { type: 'Person', firstName: 'Tom', lastName: 'Tomson' },
				registrationDate: getDateStringFromDate(date)
			});
		});

		it('should not return private claim but public fields', async () => {
			const requestUser = TestUsersMock[0];
			const date = getDateFromString('2021-02-12T14:58:05+01:00');
			const user: UserPersistence = {
				id: 'did:iota:2QQd1DN1ZjnXnvSAaAjk1VveBNUYDw7eE9bTTCC4RbG4',
				username: 'first-user',
				claim: { type: UserType.Person, firstName: 'Tom', lastName: 'Tomson' } as IdentityClaim,
				registrationDate: date,
				hidden: true
			};
			const getUserSpy = jest.spyOn(UserDb, 'getUser').mockImplementationOnce(async () => user);
			const req: any = {
				params: { id: 'did:iota:2QQd1DN1ZjnXnvSAaAjk1VveBNUYDw7eE9bTTCC4RbG4' },
				body: null,
				user: requestUser
			};

			const expectedResponse: User = {
				id: 'did:iota:2QQd1DN1ZjnXnvSAaAjk1VveBNUYDw7eE9bTTCC4RbG4',
				username: 'first-user',
				claim: undefined, // claim is undefined since user id and requester is different
				registrationDate: getDateStringFromDate(date),
				hidden: true
			};
			await userRoutes.getUser(req, res, nextMock);

			expect(getUserSpy).toHaveBeenCalledTimes(1);
			expect(sendMock).toHaveBeenCalledWith(expectedResponse);
		});

		it('should also return private claims since requestUser is same user as requested user', async () => {
			const requestUser = TestUsersMock[0];
			const date = getDateFromString('2021-02-12T14:58:05+01:00');
			const user: UserPersistence = {
				id: requestUser.id,
				username: 'first-user',
				claim: { type: UserType.Person, firstName: 'Tom', lastName: 'Tomson' } as IdentityClaim,
				registrationDate: date,
				hidden: true
			};
			const getUserSpy = jest.spyOn(UserDb, 'getUser').mockImplementationOnce(async () => user);
			const req: any = {
				params: { id: requestUser.id }, // same id as requestUser
				body: null,
				user: requestUser
			};

			const expectedResponse: User = {
				id: requestUser.id,
				username: 'first-user',
				claim: { type: UserType.Person, firstName: 'Tom', lastName: 'Tomson' } as IdentityClaim, // claim is not undefined since is the same user
				registrationDate: getDateStringFromDate(date),
				hidden: true
			};
			await userRoutes.getUser(req, res, nextMock);

			expect(getUserSpy).toHaveBeenCalledTimes(1);
			expect(sendMock).toHaveBeenCalledWith(expectedResponse);
		});

		it('should call next(err) if an error occurs when reading from db', async () => {
			const loggerSpy = jest.spyOn(LoggerMock, 'error');
			const getUserSpy = jest.spyOn(UserDb, 'getUser').mockImplementationOnce(async () => {
				throw new Error('Test error');
			});
			const req: any = {
				params: { id: 'did:iota:2QQd1DN1ZjnXnvSAaAjk1VveBNUYDw7eE9bTTCC4RbG4' },
				body: null,
				user: TestUsersMock[0]
			};

			await userRoutes.getUser(req, res, nextMock);

			expect(getUserSpy).toHaveBeenCalledTimes(1);
			expect(sendMock).not.toHaveBeenCalled();
			expect(loggerSpy).toHaveBeenCalledWith(new Error('Test error'));
			expect(nextMock).toHaveBeenCalledWith(new Error('could not get the identity'));
		});
	});

	describe('test POST user', () => {
		const validBody: User = {
			id: 'did:iota:EMjd32WoJqWMHnktc3TrjdMH6brTovTe5bGpPrVuDdKi', // must be same as in UserIdentityMock.id
			username: 'first-user',
			claim: { type: UserType.Person, firstName: 'Tom', lastName: 'Sonson' } as IdentityClaim,
			registrationDate: '2021-02-12T14:58:05+01:00'
		};

		it('should return bad request if no valid body is given', async () => {
			const req: any = {
				params: {},
				body: null
			};

			await userRoutes.addUser(req, res, nextMock);
			expect(nextMock).toHaveBeenCalled();
		});

		it('should return 404 since no user added', async () => {
			const loggerSpy = jest.spyOn(LoggerMock, 'error');
			const decodeUserSpy = jest.spyOn(userService, 'decodeUserId').mockImplementationOnce(() => UserIdentityMock.userData.creator);
			const addUserSpy = jest.spyOn(UserDb, 'addUser').mockImplementationOnce(async () => ({ result: { n: 0 } } as any)); // no user added
			const getLatestDocSpy = jest
				.spyOn(ssiService, 'getLatestIdentityDoc')
				.mockImplementationOnce(async () => ({ document: UserIdentityMock.document, messageId: 'mymessageid' } as any));
			const getPublicKeySpy = jest.spyOn(ssiService, 'getPublicKey').mockImplementationOnce(async () => UserIdentityMock.keys.sign.public);

			const req: any = {
				headers: { authorization: 'Bearer test'},
				params: {},
				body: validBody
			};

			await userRoutes.addUser(req, res, nextMock);

			expect(decodeUserSpy).toHaveBeenCalledWith('Bearer test');
			expect(getLatestDocSpy).toHaveBeenCalledTimes(1);
			expect(getPublicKeySpy).toHaveBeenCalledTimes(1);
			expect(addUserSpy).toHaveBeenCalledTimes(1);
			expect(loggerSpy).toHaveBeenCalledWith(new Error('could not create user identity!'));
			expect(nextMock).toHaveBeenCalledWith(new Error('could not add the identity'));
		});
		it('should add user', async () => {
			const getLatestDocSpy = jest
				.spyOn(ssiService, 'getLatestIdentityDoc')
				.mockImplementationOnce(async () => ({ document: UserIdentityMock.document, messageId: 'mymessageid' } as any));
			const getPublicKeySpy = jest.spyOn(ssiService, 'getPublicKey').mockImplementationOnce(async () => UserIdentityMock.keys.sign.public);
			const addUserSpy = jest.spyOn(UserDb, 'addUser').mockImplementationOnce(async () => ({ result: { n: 1 } } as any));
			const decodeUserSpy = jest.spyOn(userService, 'decodeUserId').mockImplementationOnce(() => UserIdentityMock.userData.creator);

			const req: any = {
				headers: { authorization: 'Bearer test'},
				params: {},
				body: validBody
			};

			await userRoutes.addUser(req, res, nextMock);

			expect(decodeUserSpy).toHaveBeenCalledWith('Bearer test');
			expect(getLatestDocSpy).toHaveBeenCalledTimes(1);
			expect(getPublicKeySpy).toHaveBeenCalledTimes(1);
			expect(addUserSpy).toHaveBeenCalledTimes(1);
			expect(sendStatusMock).toHaveBeenCalledWith(201);
		});

		it('should call next(err) if an error occurs when adding to db', async () => {
			const loggerSpy = jest.spyOn(LoggerMock, 'error');
			const getLatestDocSpy = jest
				.spyOn(ssiService, 'getLatestIdentityDoc')
				.mockImplementationOnce(async () => ({ document: UserIdentityMock.document, messageId: 'mymessageid' } as any));
			const getPublicKeySpy = jest.spyOn(ssiService, 'getPublicKey').mockImplementationOnce(async () => UserIdentityMock.keys.sign.public);
			const addUserSpy = jest.spyOn(UserDb, 'addUser').mockImplementationOnce(async () => {
				throw new Error('Test error');
			});
			const decodeUserSpy = jest.spyOn(userService, 'decodeUserId').mockImplementationOnce(() => UserIdentityMock.userData.creator);

			const req: any = {
				headers: { authorization: 'Bearer test'},
				params: {},
				body: validBody
			};

			await userRoutes.addUser(req, res, nextMock);

			expect(decodeUserSpy).toHaveBeenCalledWith('Bearer test');
			expect(getLatestDocSpy).toHaveBeenCalledTimes(1);
			expect(getPublicKeySpy).toHaveBeenCalledTimes(1);
			expect(addUserSpy).toHaveBeenCalledTimes(1);
			expect(sendMock).not.toHaveBeenCalled();
			expect(loggerSpy).toHaveBeenCalledWith(new Error('Test error'));
			expect(nextMock).toHaveBeenCalledWith(new Error('could not add the identity'));
		});
	});

	describe('test create-identity route', () => {
		it('should send result for valid body', async () => {
			const identitySpy = jest
				.spyOn(ssiService, 'createIdentity')
				.mockImplementationOnce(async () => ({ id: UserIdentityMock.document.doc.id, keys: UserIdentityMock.keys }));
			const decodeUserSpy = jest.spyOn(userService, 'decodeUserId').mockImplementationOnce(() => UserIdentityMock.userData.creator);
			const saveIdentitySpy = jest
				.spyOn(IdentityDocsDb, 'saveIdentityKeys')
				.mockImplementationOnce(async () => ({ result: { n: 1 } } as any));
			const userSpy = jest.spyOn(userService, 'addUser').mockImplementationOnce(async () => ({ result: { n: 1 } } as any));
			const req: any = {
				params: {},
				body: {
					username: 'test-username',
					claim: { type: 'Person', firstName: 'Mister', lastName: 'Subscriber' }
				},
				headers: { authorization: 'Bearer test' }
			};

			const expectedUser = {
				claim: { type: 'Person', firstName: 'Mister', lastName: 'Subscriber' },
				id: 'did:iota:EMjd32WoJqWMHnktc3TrjdMH6brTovTe5bGpPrVuDdKi',
				username: 'test-username',
				creator: UserIdentityMock.userData.creator
			};
			await userRoutes.createIdentity(req, res, nextMock);
			expect(identitySpy).toHaveBeenCalledWith();
			expect(userSpy).toHaveBeenCalledWith(expectedUser);
			expect(decodeUserSpy).toHaveBeenCalledWith('Bearer test');
			expect(saveIdentitySpy).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
			expect(res.send).toHaveBeenCalledWith({
				id: UserIdentityMock.document.doc.id,
				keys: UserIdentityMock.keys
			});
		});

		it('should save the identity since it is called to with storeIdentity=true', async () => {
			const identitySpy = jest
				.spyOn(ssiService, 'createIdentity')
				.mockImplementationOnce(async () => ({ id: UserIdentityMock.document.doc.id, keys: UserIdentityMock.keys }));
			const decodeUserSpy = jest.spyOn(userService, 'decodeUserId').mockImplementationOnce(() => UserIdentityMock.userData.creator);
			const saveIdentitySpy = jest.spyOn(IdentityDocsDb, 'saveIdentityKeys');
			const userSpy = jest.spyOn(userService, 'addUser').mockImplementationOnce(async () => ({ result: { n: 1 } } as any));
			const req: any = {
				params: {},
				body: {
					username: 'test-username',
					claim: { type: 'Person', firstName: 'Mister', lastName: 'Subscriber' },
					storeIdentity: true
				},
				headers: { authorization: 'Bearer test' }
			};

			const expectedUser = {
				claim: { type: 'Person', firstName: 'Mister', lastName: 'Subscriber' },
				storeIdentity: true,
				id: 'did:iota:EMjd32WoJqWMHnktc3TrjdMH6brTovTe5bGpPrVuDdKi',
				username: 'test-username',
				creator: UserIdentityMock.userData.creator
			};
			await userRoutes.createIdentity(req, res, nextMock);

			expect(identitySpy).toHaveBeenCalledWith();
			expect(userSpy).toHaveBeenCalledWith(expectedUser);
			expect(decodeUserSpy).toHaveBeenCalledWith('Bearer test');
			expect(saveIdentitySpy).toHaveBeenCalledWith({ id: UserIdentityMock.document.doc.id, keys: UserIdentityMock.keys }, serverSecret);
			expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
			expect(res.send).toHaveBeenCalledWith({
				id: UserIdentityMock.document.doc.id,
				keys: UserIdentityMock.keys
			});
		});
	});

	describe('test PUT user', () => {
		const validBody: User = {
			id: 'did:iota:2QQd1DN1ZjnXnvSAaAjk1VveBNUYDw7eE9bTTCC4RbG4',
			username: 'first-user',
			claim: { type: UserType.Person, firstName: 'Tom', lastName: 'Sonson' } as IdentityClaim,
			registrationDate: '2021-02-12T14:58:05+01:00'
		};

		it('should return bad request if no valid body is given', async () => {
			const req: any = {
				params: {},
				body: null
			};

			await userRoutes.updateUser(req, res, nextMock);
			expect(nextMock).toHaveBeenCalled();
		});

		it('should return 404 since no user updated', async () => {
			const updateUserSpy = jest.spyOn(UserDb, 'updateUser').mockImplementationOnce(async () => ({ result: { n: 0 } } as any));

			const req: any = {
				user: { id: validBody.id },
				params: {},
				body: validBody
			};

			await userRoutes.updateUser(req, res, nextMock);

			expect(updateUserSpy).toHaveBeenCalledTimes(1);
			expect(res.send).toHaveBeenCalledWith({ error: 'No user found to update!' });
			expect(res.status).toHaveBeenCalledWith(404);
		});

		it('is not authorized to update the user', async () => {
			const loggerSpy = jest.spyOn(LoggerMock, 'error');
			const updateUserSpy = jest.spyOn(UserDb, 'updateUser').mockImplementationOnce(async () => ({ result: { n: 1 } } as any));

			const req: any = {
				user: { id: 'did:iota:123456789' }, // different request id than user to update
				params: {},
				body: validBody
			};

			await userRoutes.updateUser(req, res, nextMock);

			expect(updateUserSpy).toHaveBeenCalledTimes(0);
			expect(loggerSpy).toHaveBeenCalledWith(new Error('not allowed!'));
			expect(nextMock).toHaveBeenCalledWith(new Error('could not update the identity'));
		});

		it('should update expected user', async () => {
			const updateUserSpy = jest.spyOn(UserDb, 'updateUser').mockImplementationOnce(async () => ({ result: { n: 1 } } as any));

			const req: any = {
				user: { id: validBody.id },
				params: {},
				body: validBody
			};

			await userRoutes.updateUser(req, res, nextMock);

			expect(updateUserSpy).toHaveBeenCalledTimes(1);
			expect(sendStatusMock).toHaveBeenCalledWith(200);
		});

		test.each([UserRoles.Admin, UserRoles.Manager, UserRoles.User])(
			'admins can set the role of user to manager, admin or user',
			async (role) => {
				const updateUserSpy = jest.spyOn(UserDb, 'updateUser').mockImplementationOnce(async () => ({ result: { n: 1 } } as any));

				const req: any = {
					user: { id: 'did:iota:12345', role: UserRoles.Admin },
					params: {},
					body: { ...validBody, role: role }
				};

				await userRoutes.updateUser(req, res, nextMock);

				expect(updateUserSpy).toHaveBeenCalledTimes(1);
				expect(sendStatusMock).toHaveBeenCalledWith(200);
			}
		);

		test.each([UserRoles.Admin, UserRoles.Manager])('manager can not update role to manager or admin', async (role) => {
			const loggerSpy = jest.spyOn(LoggerMock, 'error');
			const updateUserSpy = jest.spyOn(UserDb, 'updateUser').mockImplementationOnce(async () => ({ result: { n: 1 } } as any));

			const req: any = {
				user: { id: validBody.id, role: UserRoles.Manager },
				params: {},
				body: { ...validBody, role: role }
			};

			await userRoutes.updateUser(req, res, nextMock);

			expect(updateUserSpy).toHaveBeenCalledTimes(0);
			expect(loggerSpy).toHaveBeenCalledWith(new Error('not allowed to update role!'));
			expect(nextMock).toHaveBeenCalledWith(new Error('could not update the identity'));
		});

		test.each([UserRoles.Admin, UserRoles.Manager])('user can not update role to manager or admin', async (role) => {
			const loggerSpy = jest.spyOn(LoggerMock, 'error');
			const updateUserSpy = jest.spyOn(UserDb, 'updateUser').mockImplementationOnce(async () => ({ result: { n: 1 } } as any));

			const req: any = {
				user: { id: validBody.id, role: UserRoles.User },
				params: {},
				body: { ...validBody, role: role }
			};

			await userRoutes.updateUser(req, res, nextMock);

			expect(updateUserSpy).toHaveBeenCalledTimes(0);
			expect(loggerSpy).toHaveBeenCalledWith(new Error('not allowed to update role!'));
			expect(nextMock).toHaveBeenCalledWith(new Error('could not update the identity'));
		});

		it('should call next(err) if an error occurs when updating the db', async () => {
			const loggerSpy = jest.spyOn(LoggerMock, 'error');
			const updateUserSpy = jest.spyOn(UserDb, 'updateUser').mockImplementationOnce(async () => {
				throw new Error('Test error');
			});
			const req: any = {
				user: { id: validBody.id },
				params: {},
				body: validBody
			};

			await userRoutes.updateUser(req, res, nextMock);

			expect(updateUserSpy).toHaveBeenCalledTimes(1);
			expect(sendMock).not.toHaveBeenCalled();
			expect(loggerSpy).toHaveBeenCalledWith(new Error('Test error'));
			expect(nextMock).toHaveBeenCalledWith(new Error('could not update the identity'));
		});
	});

	describe('test DELETE user', () => {
		it('should return bad request if no address is given as parameter', async () => {
			const req: any = {
				params: {},
				body: null
			};

			await userRoutes.deleteUser(req, res, nextMock);
			expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
			expect(res.send).toHaveBeenCalledWith({ error: 'no id provided' });
		});

		it('is not authorized to delete different user', async () => {
			const loggerSpy = jest.spyOn(LoggerMock, 'error');
			const deleteUserSpy = jest.spyOn(UserDb, 'deleteUser');

			const req: any = {
				user: { id: 'did:iota:123456789' },
				params: { id: 'did:iota:2QQd1DN1ZjnXnvSAaAjk1VveBNUYDw7eE9bTTCC4RbG4' },
				body: null
			};

			await userRoutes.deleteUser(req, res, nextMock);

			expect(deleteUserSpy).toHaveBeenCalledTimes(0);
			expect(loggerSpy).toHaveBeenCalledWith(new Error('not allowed!'));
			expect(nextMock).toHaveBeenCalledWith(new Error('could not delete the identity'));
		});

		it('should delete expected user', async () => {
			const deleteUserSpy = jest.spyOn(UserDb, 'deleteUser').mockImplementation(async () => null);
			const revokeVerifiableCredentialsSpy = jest
				.spyOn(verificationService, 'revokeVerifiableCredentials')
				.mockImplementation(async () => null);

			const req: any = {
				user: { id: 'did:iota:2QQd1DN1ZjnXnvSAaAjk1VveBNUYDw7eE9bTTCC4RbG4' },
				params: { id: 'did:iota:2QQd1DN1ZjnXnvSAaAjk1VveBNUYDw7eE9bTTCC4RbG4' },
				body: null
			};

			await userRoutes.deleteUser(req, res, nextMock);

			expect(deleteUserSpy).toHaveBeenCalledTimes(1);
			expect(revokeVerifiableCredentialsSpy).toHaveBeenCalledTimes(0);
			expect(sendStatusMock).toHaveBeenCalledWith(200);
		});

		it('should delete expected user and revoke all credentials', async () => {
			const deleteUserSpy = jest.spyOn(UserDb, 'deleteUser').mockImplementation(async () => null);
			const revokeVerifiableCredentialsSpy = jest
				.spyOn(verificationService, 'revokeVerifiableCredentials')
				.mockImplementation(async () => null);

			const req: any = {
				user: { id: 'did:iota:2QQd1DN1ZjnXnvSAaAjk1VveBNUYDw7eE9bTTCC4RbG4' },
				params: { id: 'did:iota:2QQd1DN1ZjnXnvSAaAjk1VveBNUYDw7eE9bTTCC4RbG4' },
				query: { 'revoke-credentials': 'true' }, // revoke-credentials is true so it should be called
				body: null
			};

			await userRoutes.deleteUser(req, res, nextMock);

			expect(deleteUserSpy).toHaveBeenCalledTimes(1);
			expect(revokeVerifiableCredentialsSpy).toHaveBeenCalledTimes(1);
			expect(sendStatusMock).toHaveBeenCalledWith(200);
		});

		it('should call next(err) if an error occurs when removing from db', async () => {
			const loggerSpy = jest.spyOn(LoggerMock, 'error');
			const deleteUserSpy = jest.spyOn(UserDb, 'deleteUser').mockImplementationOnce(async () => {
				throw new Error('Test error');
			});
			const req: any = {
				user: { id: 'did:iota:2QQd1DN1ZjnXnvSAaAjk1VveBNUYDw7eE9bTTCC4RbG4' },
				params: { id: 'did:iota:2QQd1DN1ZjnXnvSAaAjk1VveBNUYDw7eE9bTTCC4RbG4' },
				body: null
			};
			await userRoutes.deleteUser(req, res, nextMock);

			expect(deleteUserSpy).toHaveBeenCalledTimes(1);
			expect(sendMock).not.toHaveBeenCalled();
			expect(loggerSpy).toHaveBeenCalledWith(new Error('Test error'));
			expect(nextMock).toHaveBeenCalledWith(new Error('could not delete the identity'));
		});
	});
	afterEach(() => {
		jest.resetAllMocks();
		jest.resetModules();
	});
});
