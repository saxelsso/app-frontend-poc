# Modern Serverless Application Development

A proof-of-concept showcase demonstrating how to build powerful serverless applications with AI integration — all without traditional server infrastructure.

## Overview

This application demonstrates how modern development tools can be combined to create powerful serverless applications with AI capabilities. Built with Vue.js, Vuetify, and AWS Amplify, this project serves as a reference for developers looking to leverage cloud-native services without managing server infrastructure.

## Technology Stack

- **Claude Code**: AI-assisted development for faster implementation and problem-solving
- **AWS Amplify**: Serverless backend with authentication and data storage capabilities
- **Vue 3**: Modern reactive frontend framework with composition API
- **Vuetify**: Material Design component framework for Vue.js with pre-built UI components
- **GitHub Codespaces**: Cloud development environment for seamless collaboration

## Key Features

- **Authentication**: Secure user authentication via Amazon Cognito
- **API**: GraphQL endpoint powered by AWS AppSync
- **Database**: Real-time NoSQL database with Amazon DynamoDB
- **Serverless Architecture**: No server maintenance or infrastructure management
- **Automatic Scaling**: Scales based on application load
- **Cost Efficiency**: Pay-per-use pricing model

## Benefits Over Traditional Development

- No server maintenance or infrastructure management
- Automatic scaling based on application load
- Reduced operational costs with pay-per-use model
- Faster development cycles with AI assistance
- Enhanced security through managed services

## Development

- Build: `npm run build`
- Dev server: `npm run dev`
- Type check: `npm run type-check`
- Preview build: `npm run preview`

### Environment Variables

This project uses environment variables for configuration. Create a `.env` file in the root directory with the following variables:

```
VITE_WEATHER_API_KEY=your_weather_api_key_here
```

A `.env.example` file is provided as a template. You can get a free Weather API key from [weatherapi.com](https://www.weatherapi.com/).

## Deploying to AWS

For detailed instructions on deploying your application, refer to the [deployment section](https://docs.amplify.aws/vue/start/quickstart/#deploy-a-fullstack-app-to-aws) of the AWS Amplify documentation.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the MIT-0 License. See the LICENSE file.