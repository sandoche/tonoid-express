# @tonoid/express

![Twitter URL](https://img.shields.io/twitter/url/http/shields.io.svg?style=social)
![GitHub stars](https://img.shields.io/github/stars/melalj/tonoid-express.svg?style=social&label=Star&maxAge=2592003)

![npm](https://img.shields.io/npm/dt/@tonoid/express.svg) ![npm](https://img.shields.io/npm/v/@tonoid/express.svg) ![npm](https://img.shields.io/npm/l/@tonoid/express.svg) ![David](https://img.shields.io/david/melalj/tonoid-express.svg)

Express plugin for [@tonoid/helpers](https://github.com/melalj/tonoid-helpers)

## Init options

- `port`: (Number, defaults: `process.env.EXPRESS_PORT || 80`) Express http port.
- `host`: (String, defaults: `process.env.EXPRESS_HOST || '0.0.0.0`) Express http host.
- `extraMiddleware(app)`: (Function) Extra Middle to add to the express app before setting the endpoints
- `isHTML`: (Boolean, default: `false`) If the error message should render in HTML
- `jsonLog`: (Boolean, default: `process.env.NODE_ENV === 'production`) If we want to output the logs in JSON format (useful when we use Stackdriver)
- `endpoints`: (defaults: `[]`):
  - `endpoints[].path`: Endpoint path
  - `endpoints[].handler`: Endpoint handler (function)

## Exported context attributes

- `.close()`: Close mongo client
- `.getRouter()`: Get database instance
- `.app`: Express app instance
- `.httpServer`: http server instance
- `.asyncHandler()`: Async handler alias

## Usage example

You may check a full example on the folder `example`.

```js
const { init } = require('@tonoid/helpers');
const express = require('@tonoid/express');

const rootHandler = ({ getRouter, asyncHandler }) => {
  const router = getRouter();

  router.get('/', asyncHandler((req, res) => {
    return { root: true };
  }));

  router.get('/foo', asyncHandler((req, res) => {
    return { foo: true };
  }));

  return router;
};

init([
  express({
    port: 3000,
    endpoints: [
      {
        path: '/',
        handler: rootHandler,
      },
    ],
  }),
]);

```

## Credits

This module is maintained by [Simo Elalj](https://twitter.com/simoelalj) @[tonoid](https://www.tonoid.com)
