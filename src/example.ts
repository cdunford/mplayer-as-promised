import { MPlayer, MPlayerMediaItem } from './lib/index';

//Create the MPlayer object
const mplayer = new MPlayer();

//Open a file
mplayer.openFile('/path/to/file.wav').then((item) => onItemOpen(item), (reason) => console.log(reason));

const onItemOpen = (item: MPlayerMediaItem) => {
  setTimeout(() => {
    //Pause the item
    item.pause().then(() => onItemPause(item), (reason) => console.log(reason));
  }, 5000);
}

const onItemPause = (item: MPlayerMediaItem) => {
  setTimeout(() => {
    //Play the item again
    item.play().then(() => onItemPlay(item), (reason) => console.log(reason));
  }, 5000);
}

const onItemPlay = (item: MPlayerMediaItem) => {
  setTimeout(() => {
    //Seek to the 1 minute mark
    item.seekTo(60).then(() => onItemSeekTo(item), (reason) => console.log(reason));
  }, 5000)
}

const onItemSeekTo = (item: MPlayerMediaItem) => {
  //Get the current position of the item
  item.getCurrentTime().then((time) => {
    console.log(`Current position: ${time}`);

    setTimeout(() => {
      //Seek forward 2 minutes
      item.seekBy(120).then(() => onItemSeekBy(item), (reason) => console.log(reason));
    }, 5000);

  }, (reason) => console.log(reason));
}

const onItemSeekBy = (item: MPlayerMediaItem) => {
  //Get the current position (percent) of the item
  item.getCurrentPercent().then((percent) => {
    console.log(`Current position: ${percent}%`);

    //Wait for the item to complete
    item.listen().then(() => onItemComplete(item), (reason) => console.log(reason));

  }, (reason) => console.log(reason));
}

const onItemComplete = (item: MPlayerMediaItem) => {
  //shutdown mplayer
  mplayer.shutdown().then(() => console.log('Shutdown!'), (reason) => console.log(reason));
}