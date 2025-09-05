import type { Schema } from "../../data/resource"
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
  AdminListGroupsForUserCommand
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient()

export const handler: Schema["inviteUser"]["functionHandler"] = async (event, context) => {

    const { invitedUser, groupName } = event.arguments;

    const userPoolId = process.env.USER_POOL_ID || "eu-north-1_Vr3rKeWdS"; 

    if (typeof invitedUser !== "string") {
        throw new Error("invitedUser must be a string");
    }

    const command = new AdminListGroupsForUserCommand({
        Username: invitedUser,
        UserPoolId: userPoolId
    });

    const response = await client.send(command);
    console.log('processed', response.$metadata.requestId);

    const groups = response.Groups?.map(g => g.GroupName) || [];
    // add invitee to group
    // await addUserToGroup(inviteeUsername, groupName);

    return `Invited ${invitedUser} to ${groupName}! Groups: ${groups.join(", ")}`
};