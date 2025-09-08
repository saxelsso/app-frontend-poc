import type { Schema } from "../../data/resource"
import { env } from "$amplify/generated/env/echo-service";

export const handler: Schema["echoService"]["functionHandler"] = async (event) => {
    // arguments typed from `.arguments()`
    const { echoString } = event.arguments
    // return typed from `.returns()`
    return `Hello, ${echoString}!`
}