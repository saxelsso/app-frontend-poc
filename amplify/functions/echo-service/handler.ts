import { Amplify } from 'aws-amplify';
import type { Schema } from "../../data/resource"
import { env } from "$amplify/env/echoService";
import { generateClient } from "aws-amplify/data";
import amplifyOutputs from '../../../amplify_outputs.json';

Amplify.configure(
    amplifyOutputs
);

const client = generateClient<Schema>();

export const handler: Schema["echoService"]["functionHandler"] = async (event) => {
    // arguments typed from `.arguments()`
    const { echoString } = event.arguments

    const notes = await client.models.Notes.list()
    console.log("Notes in the database:", notes);

    return `Hello, ${echoString}!`
}