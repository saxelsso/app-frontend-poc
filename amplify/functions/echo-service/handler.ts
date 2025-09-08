import { Amplify } from 'aws-amplify';
import type { Schema } from "../../data/resource"
import { env } from "$amplify/env/echoService";
import { generateClient } from "aws-amplify/data";

Amplify.configure(
    {/* resource configuration */},
    {
        Auth: {
            credentialsProvider: {
                // instruct the client library to read credentials from the environment
                getCredentialsAndIdentityId: async () => ({
                    credentials: {
                        accessKeyId: env.AWS_ACCESS_KEY_ID,
                        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
                        sessionToken: env.AWS_SESSION_TOKEN,
                    },
                }),
                clearCredentialsAndIdentityId: () => {
                    /* noop */
                },
            },
        },
    }
);

const client = generateClient<Schema>();

export const handler: Schema["echoService"]["functionHandler"] = async (event) => {
    // arguments typed from `.arguments()`
    const { echoString } = event.arguments

    const notes = await client.models.Notes.list()
    console.log("Notes in the database:", notes);

    return `Hello, ${echoString}!`
}