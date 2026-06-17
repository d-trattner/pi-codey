'use strict';

const { CodeyRocky } = require('../src');

(async () => {
  const codey = new CodeyRocky();
  try {
    await codey.say('I am your tiny robot messenger.', { mood: 'happy' });
    await codey.react('thinking', 'Hmm...');
    await codey.react('success', 'Done!');
  } finally {
    await codey.close();
  }
})();
