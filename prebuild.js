var fs = require('fs-extra');

fs.exists('dist', (exists) => {
  if (exists) {
    console.log('Removing build dir');
    fs.remove('dist', (err) => {
      if (err) {
        console.log(`Removing build dir faild: ${err}`);
      } else {
        console.log('Removed build dir');
      }
    })
  }
});
