---
applyTo: "amplify/**/*,app/**/*"
---

Environment variables and secrets
Amplify Functions support setting environment variables and secrets on the environment property of defineFunction.

Note: do not store secret values in environment variables. Environment variables values are rendered in plaintext to the build artifacts located at .amplify/artifacts and may be emitted to CloudFormation stack event messages. To store secrets skip to the secrets section

Note: Environment variables and secrets configuration in defineFunction is not supported for Custom Functions.

Environment variables
Environment variables can be configured in defineFunction using the environment property.

amplify/functions/say-hello/resource.ts
import { defineFunction } from '@aws-amplify/backend';

export const sayHello = defineFunction({
  environment: {
    NAME: 'World'
  }
});
Any environment variables specified here will be available to the function at runtime.

Some environment variables are constant across all branches and deployments. But many environment values differ between deployment environments. Branch-specific environment variables can be configured for Amplify hosting deployments.

Suppose you created a branch-specific environment variable in hosting called "API_ENDPOINT" which had a different value for your "staging" vs "prod" branch. If you wanted that value to be available to your function you can pass it to the function using

amplify/functions/say-hello/resource.ts
export const sayHello = defineFunction({
  environment: {
    NAME: "World",
    API_ENDPOINT: process.env.API_ENDPOINT
  }
});
Accessing environment variables
Within your function handler, you can access environment variables using the normal process.env global object provided by the Node runtime. However, this does not make it easy to discover what environment variables will be available at runtime. Amplify generates an env symbol that can be used in your function handler and provides typings for all variables that will be available at runtime. Copy the following code to use it.

amplify/functions/say-hello/handler.ts
import { env } from '$amplify/env/say-hello'; // the import is '$amplify/env/<function-name>'

export const handler = async (event) => {
  // the env object has intellisense for all environment variables that are available to the function
  return `Hello, ${env.NAME}!`;
};
Learn more
Understanding the "env" symbol and how to manually configure your Amplify project to use it
Generated env files
When you configure your function with environment variables or secrets, Amplify's backend tooling generates a file using the function's name in .amplify/generated with references to your environment variables and secrets, as well as environment variables predefined by the Lambda runtime. This provides a type-safe experience for working with environment variables that does not require typing process.env manually.

Note: generated files are created before deployments when executing ampx sandbox or ampx pipeline-deploy

For example, if you have a function with the following definition:

amplify/functions/say-hello/resource.ts
import { defineFunction } from "@aws-amplify/backend";

export const sayHello = defineFunction({
  name: "say-hello",
  environment: {
    NAME: "World",
  },
});
Upon starting your next deployment, Amplify will create a file at the following location:

.amplify/generated/env/say-hello.ts
Using the TypeScript path alias, $amplify, you can import the file in your function's handler:

amplify/functions/say-hello/handler.ts
import { env } from "$amplify/env/say-hello"

export const handler = async (event) => {
  // the env object has intellisense for all environment variables that are available to the function
  return `Hello, ${env.NAME}!`;
};
Encountering issues with this file? Visit the troubleshooting guide for Cannot find module $amplify/env/<function-name>

Secrets
Sometimes it is necessary to provide a secret value to a function. For example, it may need a database password or an API key to perform some business use case. Environment variables should NOT be used for this because environment variable values are included in plaintext in the function configuration. Instead, secret access can be used.

Before using a secret in a function, you need to define a secret. After you have defined a secret, you can reference it in your function config.

amplify/functions/say-hello/resource.ts
import { defineFunction, secret } from '@aws-amplify/backend';

export const sayHello = defineFunction({
  environment: {
    NAME: "World",
    API_ENDPOINT: process.env.API_ENDPOINT,
    API_KEY: secret('MY_API_KEY') // this assumes you created a secret named "MY_API_KEY"
  }
});
You can use this secret value at runtime in your function the same as any other environment variable. However, you will notice that the value of the environment variable is not stored as part of the function configuration. Instead, the value is fetched when your function runs and is provided in memory.

amplify/functions/say-hello/handler.ts
import { env } from '$amplify/env/say-hello';

export const handler = async (event) => {
  const request = new Request(env.API_ENDPOINT, {
    headers: {
      // this is the value of secret named "MY_API_KEY"
      Authorization: `Bearer ${env.API_KEY}`
    }
  })
  // ...
  return `Hello, ${env.NAME}!`;
};

---

Configure Functions
defineFunction comes out-of-the-box with sensible but minimal defaults. The following options are provided to tweak the function configuration.

Note: The following options are not supported for Custom Functions except for resourceGroupName.

name
By default, functions are named based on the directory the defineFunction call is placed in. In the above example, defining the function in amplify/functions/my-demo-function/resource.ts will cause the function to be named my-demo-function by default.

If an entry is specified, then the name defaults to the basename of the entry path. For example, an entry of ./signup-trigger-handler.ts would cause the function name to default to signup-trigger-handler.

This optional property can be used to explicitly set the name of the function.

amplify/functions/my-demo-function/resource.ts
export const myDemoFunction = defineFunction({
  entry: './demo-function-handler.ts',
  name: 'overrideName' // explicitly set the name to override the default naming behavior
});
timeoutSeconds
By default, functions will time out after 3 seconds. This can be configured to any whole number of seconds up to 15 minutes.

amplify/functions/my-demo-function/resource.ts
export const myDemoFunction = defineFunction({
  timeoutSeconds: 60 // 1 minute timeout
});
memoryMB
By default, functions have 512 MB of memory allocated to them. This can be configured from 128 MB up to 10240 MB. Note that this can increase the cost of function invocation. For more pricing information see here.

amplify/functions/my-demo-function/resource.ts
export const myDemoFunction = defineFunction({
  memoryMB: 256 // allocate 256 MB of memory to the function.
});
ephemeralStorageSizeMB
By default, functions have 512MB of ephemeral storage to them. This can be configured from 512 MB upto 10240 MB. Note that this can increase the cost of function invocation. For more pricing information visit the Lambda pricing documentation.

amplify/functions/my-demo-function/resource.ts
export const myDemoFunction = defineFunction({
  ephemeralStorageSizeMB: 1024 // allocate 1024 MB of ephemeral storage to the function.
});
runtime
Currently, only Node runtimes are supported by defineFunction. However, you can change the Node version that is used by the function. The default is the oldest Node LTS version that is supported by AWS Lambda (currently Node 18).

If you wish to use an older version of Node, keep an eye on the Lambda Node version deprecation schedule. As Lambda removes support for old Node versions, you will have to update to newer supported versions.

amplify/functions/my-demo-function/resource.ts
export const myDemoFunction = defineFunction({
  runtime: 20 // use Node 20
});
entry
By default, Amplify will look for your function handler in a file called handler.ts in the same directory as the file where defineFunction is called. To point to a different handler location, specify an entry value.

amplify/functions/my-demo-function/resource.ts
export const myDemoFunction = defineFunction({
  entry: './path/to/handler.ts' // this path should either be absolute or relative to the current file
});
resourceGroupName
By default, functions are grouped together in a resource group named function. You can override this to group related function with other Amplify resources like auth, data, storage, or separate them into your own custom group. This is typically useful when you have resources that depend on each other and you want to group them together.

amplify/functions/my-demo-function/resource.ts
export const myDemoFunction = defineFunction({
  resourceGroupName: 'data'
});


