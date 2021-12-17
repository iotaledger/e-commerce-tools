import { Manager, IdentityKeys, UserRoles } from 'iota-is-sdk';

import { defaultManagerConfig } from './configuration';

async function setup() {

    // Create db connection
    const manager = new Manager(defaultManagerConfig);

    // Get root identity directly from db
    let rootIdentityWithKeys: IdentityKeys = await manager.getRootIdentity();

    await manager.setRole(rootIdentityWithKeys.id, UserRoles.Admin);

    await manager.close();
}

setup();