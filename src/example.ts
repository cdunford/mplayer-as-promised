import { MPlayer, MPlayerMediaItem } from './lib/index';

const mplayer = new MPlayer(true);
let mitem: MPlayerMediaItem;
mplayer.openFile('FILENAME')
  .then((item) => {
    console.log(`Playing ${item.fileName}`);
    mitem = item;
  }, (err) => {
    console.log(`UH OH - ${err}`);
  });

setTimeout(() => {
  mitem.pause().then(() => {
    console.log('Paused!');

    setTimeout(() => {
      mitem.play().then(() => {
        console.log('Playing!');
      })
    }, 2000);
  })
}, 2000);

setTimeout(() => {
  mplayer.shutdown().then(() => {
    console.log('shutdown complete');
  }, (reason: any) => {
    console.log(`shutdown failed: ${reason}`);
  });
}, 45000);