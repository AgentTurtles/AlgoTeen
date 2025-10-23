import { getAlpacaCredentials } from '../src/lib/userStore.js';

(async () => {
  try {
    const res = await getAlpacaCredentials('00000000-0000-0000-0000-000000000000');
    console.log('res:', res);
  } catch (err) {
    console.error('ERROR>', err.message);
    if (err.data) console.error('ERR_DATA>', JSON.stringify(err.data, null, 2));
    console.error(err.stack);
    process.exitCode = 1;
  }
})();
