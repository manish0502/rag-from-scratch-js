// Qdrant binary + dashboard download karta hai.
// npm start khud call kar leta hai, par alag se chalana ho to:
//
//   npm run setup

import { ensureQdrant } from '../src/helpers/setup.js';

const did = await ensureQdrant();
if (!did) console.log('Qdrant pehle se maujood hai — kuch download nahi kiya');
