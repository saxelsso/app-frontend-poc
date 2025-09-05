import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { inviteUser } from './functions/invite-user/resource'; // Import your function
import * as iam from "aws-cdk-lib/aws-iam"

export const backend = defineBackend({
  auth,
  data,
  inviteUser,
});

const inviteUserLambda = backend.inviteUser.resources.lambda
const userPoolArn = backend.auth.resources.userPool.userPoolArn;
const userPoolIdent = backend.auth.resources.userPool.userPoolId;

const statement = new iam.PolicyStatement({
  sid: "AllowAddUserToCognitoGroup",
  actions: [
    "cognito-idp:AdminAddUserToGroup",
    "cognito-idp:AdminListGroupsForUser"
  ],
  resources: [userPoolArn],
});


inviteUserLambda.addToRolePolicy(statement)