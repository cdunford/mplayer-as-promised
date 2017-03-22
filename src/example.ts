import { MPlayer } from './lib/index';

let mplayer = new MPlayer(true);
mplayer.openFile('V:/Music/Alice in Chains/(1990) Facelift/05 - I Can’t Remember.mp3')
  .then((item) => {
    console.log(`Playing ${item.fileName}`);
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