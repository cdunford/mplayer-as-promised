import { MPlayer } from './lib/index';

let mplayer = new MPlayer(true);
mplayer.openFile('FILENAME')
  .then(() => {
    console.log('Playing!');
  }, (err) => {
    console.log(`UH OH - ${err}`);
  });