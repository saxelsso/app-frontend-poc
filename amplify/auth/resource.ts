import { defineAuth } from '@aws-amplify/backend';
//import { postConfirmation } from "./post-confirmation/resource"


/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth: ReturnType<typeof defineAuth> = defineAuth({
  loginWith: {
    email: true,
  },
//  groups: ["EVERYONE"],
//  triggers: {
//    postConfirmation,
//  },
//  access: (allow) => [
//    allow.resource(postConfirmation).to(["addUserToGroup"]),
//  ],
})
