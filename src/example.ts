import { MPlayer } from './lib/index';

let mplayer = new MPlayer(true);
mplayer.openFile('FILENAME')
  .then(() => {
    console.log('Playing!');
  }, (err) => {
    console.log(`UH OH - ${err}`);
  });

setTimeout(() => {
  mplayer.shutdown().then(() => {
    console.log('shutdown complete');
  }, (reason: any) => {
    console.log(`shutdown failed: ${reason}`);
  });
}, 10000);