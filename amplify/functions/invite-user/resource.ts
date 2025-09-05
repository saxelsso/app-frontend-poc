import { defineFunction } from '@aws-amplify/backend';
import { auth } from '../../auth/resource';

export const inviteUser = defineFunction({
    entry: './handler.ts',
    name: 'inviteUser',
    timeoutSeconds: 60,
    runtime: 22,
    environment: {
        USER_POOL_ID: 'eu-north-1_Vr3rKeWdS'
    },
});