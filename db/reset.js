// DB clear karta hai. Khud se chalti hai, npm start ka hissa nahi.
//
//   npm run db:reset
//   node --env-file=.env db/reset.js

import { startServer } from '../src/helpers/server.js';
import { dropCollection } from '../src/4-store/index.js';
import { COLLECTION } from '../src/helpers/config.js';

await startServer();

const dropped = await dropCollection();

console.log(dropped ? `"${COLLECTION}" delete ho gayi` : `"${COLLECTION}" pehle se hi nahi thi`);
console.log('Dobara bharne ke liye:  npm start');

process.exit(0);
