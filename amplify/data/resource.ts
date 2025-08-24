import { type ClientSchema, a, defineData } from "@aws-amplify/backend";


/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any user authenticated via an API key can "create", "read",
"update", and "delete" any "Todo" records.
=========================================================================*/
const schema = a.schema({
  Todo: a
    .model({
      content: a.string(),
    })
    .authorization(allow => [allow.owner()]),
  
  SalesOpportunity: a
    .model({
      companyName: a.string(),
      contactName: a.string(),
      value: a.float(),
    })
    .authorization(allow => [allow.owner()]),

    // New Portfolio model for tracking stock purchases
    Portfolio: a
        .model({
            ticker: a.string(),
            amount: a.integer(),        // Number of shares
            purchaseDate: a.timestamp(),  // Store as milliseconds since epoch
            purchasePrice: a.float(),   // Price per share as float to handle decimals
        })
        .authorization(allow => [allow.owner()]),

    // Product table with unique productId, name, and list price
    Product: a
        .model({
            productId: a.string().required(),
            productName: a.string().required(),
            listPrice: a.float().required(),
            barcode: a.string(), // Optional string for barcode
            isSellable: a.boolean().required().default(false),
            inventory: a.hasMany('Inventory', 'productId'),
            orderItems: a.hasMany('OrderItem', 'productId'),
        })
        .authorization(allow => [allow.owner()])
        .identifier(['productId']), // Makes productId the primary key instead of auto-generated id

    // Inventory table to track stock levels for products
    Inventory: a
        .model({
            productId: a.string().required(),
            stockLevel: a.integer().required(),
            lastUpdated: a.timestamp(),
            product: a.belongsTo('Product', 'productId'), // Foreign key relationship
        })
        .authorization(allow => [allow.owner()]),

    // Order table to track sold products with timestamps
    Order: a
        .model({
            orderDate: a.timestamp().required(),
            totalAmount: a.float(),
            status: a.string(), // e.g., 'pending', 'completed', 'cancelled'
            orderItems: a.hasMany('OrderItem', 'orderId'), // One order can have many items
        })
        .authorization(allow => [allow.owner()]),

    // OrderItem table to handle individual products within an order
    OrderItem: a
        .model({
            orderId: a.string().required(),
            productId: a.string().required(),
            quantity: a.integer().required(),
            unitPrice: a.float().required(),
            subtotal: a.float().required(),
            order: a.belongsTo('Order', 'orderId'),
            product: a.belongsTo('Product', 'productId'),
        })
        .authorization(allow => [allow.owner()]),


});

export type Schema = ClientSchema<typeof schema>;

export const data: ReturnType<typeof defineData> = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
    // API Key is used for a.allow.public() rules
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
