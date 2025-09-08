import { Amplify } from 'aws-amplify';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import type { Schema } from "../data/resource"
import { env } from "$amplify/env/echo-service";
import { generateClient } from "aws-amplify/data";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);

Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

export const handler: Schema["echoService"]["functionHandler"] = async (event) => {
    // arguments typed from `.arguments()`
    const { echoString } = event.arguments

    const notes = await client.models.Notes.list()
    console.log("Notes in the database:", notes);

    return `Hello, ${echoString}!  Number of notes: ${notes.data.length}`;
}