import { defineAuth } from '@aws-amplify/backend';
import { AuthResource } from '@aws-amplify/backend/plugin-types';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth: AuthResource = defineAuth({
  loginWith: {
    email: true,
  },
});
