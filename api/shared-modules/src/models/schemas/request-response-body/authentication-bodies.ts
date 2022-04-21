import { Type } from '@sinclair/typebox';

export const ProveOwnershipPostBodySchema = Type.Object({
	signedNonce: Type.String({ minLength: 128, maxLength: 128 })
});

export const VerifyJwtBodySchema = Type.Object({
	jwt: Type.String({ minLength: 1 })
});

export const NonceSchema = Type.Object({
	nonce: Type.String({ minLength: 40, maxLength: 40 })
});
