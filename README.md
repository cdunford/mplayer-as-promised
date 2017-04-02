# mplayer-as-promised
Simple mplayer (http://www.mplayerhq.hu/) wrapper for use in node written in Typescript and presenting a promise-heavy API. The library currently is geared towards audio playback applications.

## Usage

Import the module and create an instance of the MPlayer object
```typescript
import { MPlayer, MPlayerMediaItem } from 'mplayer-as-promised'

const mplayer = new MPlayer();
```

Open a file for playback (playback starts when the file is opened)
```typescript
let item: MPlayerMediaItem;
mplayer.openFile('/path/to/file.wav').then((value) => {
  console.log('Playing!');
  item = value;
});
```

Pause a playing item
```typescript
item.pause().then(() => {
  console.log('Paused!');
});
```

Play a paused item
```typescript
item.play().then(() => {
  console.log('Playing again!');
});
```

Stop an item (the item cannot be replayed - openFile() must be called again)
```typescript
item.stop().then(() => {
  console.log('Stopped!');
});
```

Listen to an item (resolves when the item is complete or stop() has been called)
```typescript
item.listen().then(() => {
  console.log('Finished!');
});
```

Seek to a specific time in an item (in seconds)
```typescript
item.seekTo(120).then(() => {
  console.log('At the 2 minute mark!');
});
```

Seek by an offset from the current position (in seconds)
```typescript
item.seekBy(-20).then(() => {
  console.log('Went back 20 seconds!');
});
```

Get the current position in the track in seconds
```typescript
item.getCurrentTime().then((time) => {
  console.log(`Currently at ${time} seconds`);
});
```

Get the current position in the track as a percentage
```typescript
item.getCurrentPercent().then((percent) => {
  console.log(`Currently at ${percent} %`);
});
```

Shutdown mplayer
```typescript
mplayer.shutdown().then(() => {
  console.log('Shutdown!');
});
```