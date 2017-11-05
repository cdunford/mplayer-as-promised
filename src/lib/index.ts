import { MPlayerManager } from './mplayerManager'

const DEFAULT_OP_TIMEOUT = 2000;
const OPEN_OP_TIMEOUT = 8000;

/**
 * MPlayerMediaItem
 * 
 * Class the represents a media item that can be played
 */
export class MPlayerMediaItem {
  private playing = true;

  /**
   * constructor
   * 
   * @param file the file this item represents 
   * @param mplayer MPlayerManager used to interact with mplayer
   * @param log function to use to log
   */
  protected constructor(
    private file: string,
    protected mplayer: MPlayerManager,
    private log: (line: string) => void
  ) { }

  /**
   * fileName
   * 
   * @returns the file this item represents
   */
  public get fileName(): string {
    return this.file;
  }

  /**
   * isPlaying
   * 
   * @returns whether the media is playing
   */
  public get isPlaying(): boolean {
    if (!this.mplayer) {
      return false;
    }

    return this.playing;
  }

  /**
   * getCurrentTime
   * 
   * @returns a promise that resolves with the current time position of the item
   */
  public getCurrentTime(): Promise<number> {
    if (!this.mplayer) {
      return Promise.reject('Not in a valid state');
    }

    return this.mplayer.doCriticalOperation<number>((exec) => {
      return exec('pausing_keep_force', 'get_property', 'time_pos');
    }, (data, resolve, reject) => {
      if (data.includes('GLOBAL: ANS_time_pos=')) {
        resolve(parseFloat(data.match(/GLOBAL: ANS_time_pos=([0-9\.]+)/)[1]));
      }
    }, DEFAULT_OP_TIMEOUT);
  }

  /**
   * getCurrentPercent
   * 
   * @returns a promise that resolves with the current percentage complete of the item
   */
  public getCurrentPercent(): Promise<number> {
    if (!this.mplayer) {
      return Promise.reject('Not in a valid state');
    }

    return this.mplayer.doCriticalOperation<number>((exec) => {
      return exec('pausing_keep_force', 'get_property', 'percent_pos');
    }, (data, resolve, reject) => {
      if (data.includes('GLOBAL: ANS_percent_pos=')) {
        resolve(parseFloat(data.match(/GLOBAL: ANS_percent_pos=([0-9\.]+)/)[1]));
      }
    }, DEFAULT_OP_TIMEOUT);
  }

  /**
   * pause
   * 
   * pauses the media
   * 
   * @returns a promise that resolves when the media is paused
   */
  public pause(): Promise<void> {
    this.log(`Pausing ${this.file}`);

    if (!this.mplayer) {
      return Promise.reject('Not in a valid state');
    } else if (!this.playing) {
      return Promise.resolve();
    }

    return this.mplayer.doCriticalOperation<void>((exec) => {
      return exec('pause');
    }, (data, resolve, reject) => {
      if (/CPLAYER:[\s\S]*=====  PAUSE  =====/.test(data)) {
        this.playing = false;
        resolve();
      }
    }, DEFAULT_OP_TIMEOUT);
  }

  /**
   * play
   * 
   * plays the media
   * 
   * @returns a promise that resolves when the media is playing
   */
  public play(): Promise<void> {
    this.log(`Playing ${this.file}`);

    if (!this.mplayer) {
      return Promise.reject('Not in a valid state');
    } else if (this.playing) {
      return Promise.resolve();
    }

    return this.mplayer.doCriticalOperation<void>((exec) => {
      return exec('pause').then(() => {
        this.mplayer.doOperation<void>((innerExec) => {
          return innerExec('pausing_keep_force', 'get_property', 'pause');
        }, (data, resolve, reject) => {
          if (data.includes('GLOBAL: ANS_pause=no')) {
            resolve();
          }
        }, DEFAULT_OP_TIMEOUT);
      });
    }, (data, resolve, reject) => {
      if (data.includes('GLOBAL: ANS_pause=no')) {
        this.playing = true;
        resolve();
      }
    }, DEFAULT_OP_TIMEOUT);
  }

  /**
   * seekTo
   * 
   * Seek to a specific time
   * 
   * @param time the time to seek to (in seconds)
   * @returns a promise resolved when seeking is complete or rejected if the time is invalid
   */
  public seekTo(time: number): Promise<void> {
    this.log(`Seeking to ${time}`);

    return this.doSeek(time, 2);
  }

  /**
   * seekBy
   * 
   * Seek by a specified number of seconds
   * 
   * @param offset the number of seconds to seek (negative value seeks backwards)
   * @returns a promise resolved when seeking is complete or rejected if the time is invalid
   */
  public seekBy(offset: number): Promise<void> {
    this.log(`Seeking by ${offset}`);

    return this.doSeek(offset, 0);
  }

  /**
   * getVolume
   * 
   * @description get the current volume level of the track
   * @returns a promise resolved with the volume level, or rejected if
   *          there is an error
   */
  public getVolume(): Promise<number> {
    if (!this.mplayer) {
      return Promise.reject('Not in a valid state');
    }

    return this.mplayer.doCriticalOperation<number>((exec) => {
      return exec('pausing_keep_force', 'get_property', 'volume');
    }, (data, resolve, reject) => {
      if (data.includes('GLOBAL: ANS_volume=')) {
        resolve(parseFloat(data.match(/GLOBAL: ANS_volume=([0-9\.]+)/)[1]));
      }
    }, DEFAULT_OP_TIMEOUT);
  }

  /**
    * setVolume
    * 
    * @description sets the volume level of the track
    * @param volume the volume level to set; a float between 0 and 100
    * @returns a promise resolved when the volume is set successfully or
    *          rejected if there is an error
    */
  public setVolume(volume: number): Promise<void> {
    this.log(`Setting volume to ${volume}`);
    if (!this.mplayer) {
      return Promise.reject('Not in a valid state');
    }

    if (volume < 0) {
      volume = 0;
    } else if (volume > 100) {
      volume = 100;
    }

    return this.mplayer.doCriticalOperation<void>((exec) => {
      return exec('pausing_keep_force', 'volume', volume, 1).then(() => {
        this.mplayer.doOperation<void>((innerExec) => {
          return innerExec('pausing_keep_force', 'get_property', 'volume');
        }, (data, resolve, reject) => {
          if (data.includes('GLOBAL: ANS_volume=')) {
            resolve();
          }
        }, DEFAULT_OP_TIMEOUT);
      });
    }, (data, resolve, reject) => {
      if (data.includes('GLOBAL: ANS_volume=')) {
        resolve();
      }
    }, DEFAULT_OP_TIMEOUT);
  }

  /**
   * stop
   * 
   * Stops the media
   * 
   * @returns a promise resolved when the media is stopped
   */
  public stop(): Promise<void> {
    if (!this.mplayer) {
      return Promise.reject('Not in a valid state');
    }

    return this.mplayer.doCriticalOperation<void>((exec) => {
      return exec('stop');
    }, (data, resolve, reject) => {
      if (data.includes('GLOBAL: EOF code:')) {
        resolve();
      }
    }, DEFAULT_OP_TIMEOUT);
  }

  /**
   * listen
   * 
   * @returns a promise resolved when the item finishes or is rejected when the item is forcibly stopped
   */
  public listen(): Promise<void> {
    if (!this.mplayer) {
      return Promise.reject('Not in a valid state');
    }

    return this.mplayer.doOperation<void>((exec) => {
      return Promise.resolve();
    }, (data, resolve, reject) => {
      if (data.includes('GLOBAL: EOF code: 0') || data.includes('GLOBAL: EOF code: 1')) {
        resolve();
      } else if (data.includes('GLOBAL: EOF code:')) {
        reject('Playback ended prematurely');
      }
    });
  }

  /**
   * doSeek
   * 
   * Handle common seek behavior
   * 
   * @param value the seek value
   * @param type the type of seek
   * @returns a promise resolved when seeking completes
   */
  private doSeek(value: number, type: number): Promise<void> {
    if (!this.mplayer) {
      return Promise.reject('Not in a valid state');
    }

    return this.mplayer.doCriticalOperation<void>((exec) => {
      return exec('pausing_keep', 'seek', value, type);
    }, (data, resolve, reject) => {
      if (/CPLAYER:[\s\S]*Position/.test(data)) {
        resolve();
      }
    }, DEFAULT_OP_TIMEOUT);
  }
}

/**
 * InternalMPlayerMediaItem
 * 
 * * Class the represents a media item that can be played
 */
class InternalMPlayerMediaItem extends MPlayerMediaItem {

  /**
   * constructor
   * 
   * @param file the file this item represents 
   * @param mplayer MPlayerManager used to interact with mplayer
   */
  public constructor(
    file: string,
    mplayer: MPlayerManager,
    log: (line: string) => void) {
    super(file, mplayer, log);
  }

  /**
   * cleanup
   * 
   * cleans up this item
   */
  public cleanup() {
    this.mplayer = undefined;
  }
}

/**
 * MPlayer
 * 
 * Wrapper that provides a promise based API around
 * MPlayer
 */
export class MPlayer {

  private mplayer: MPlayerManager;
  private activeItem: InternalMPlayerMediaItem;

  /**
   * constructor
   * 
   * @param logEnabled whether the object should log to the console
   * @param mplayer MPlayerManager used to communicate to mplayer
   */
  public constructor(private logEnabled: boolean = false) {
    this.mplayer = new MPlayerManager((line) => this.log(line));
  }

  /**
   * openFile
   * 
   * Open and start playing a file
   * 
   * @param fileName path to the file to open
   * @returns a promise that resolves when the file is open and  playing,
   *          or is rejected if the file fails to open
   */
  public openFile(fileName: string): Promise<MPlayerMediaItem> {
    this.log(`Opening file '${fileName}'`);

    const performOpen = () => {
      return this.mplayer.doCriticalOperation<MPlayerMediaItem>((exec) => {
        return exec('loadfile', `"${fileName}"`);
      }, (data, resolve, reject) => {
        if (data.includes('CPLAYER: Starting playback...')) {
          this.activeItem = new InternalMPlayerMediaItem(fileName, this.mplayer, (line) => this.log(line));
          this.activeItem.listen().then(() => {
            this.activeItem.cleanup();
            this.activeItem = undefined;
          }, () => {
            this.activeItem.cleanup();
            this.activeItem = undefined;
          });
          resolve(this.activeItem);
        } else if (data.includes('OPEN: File not found')
          || data.includes('OPEN: Failed to open')) {
          reject(data.match(/OPEN: (.*)/)[1]);
        }
      }, OPEN_OP_TIMEOUT);
    }

    return new Promise<MPlayerMediaItem>((resolve, reject) => {
      let stop: Promise<void>;
      if (this.activeItem) {
        stop = this.activeItem.stop();
      } else {
        stop = Promise.resolve();
      }

      stop.then(() => {
        performOpen().then((item) => {
          resolve(item);
        }, (reason) => {
          reject(reason);
        });
      }, (reason) => {
        reject(`Failed to stop previous media item: ${reason}`);
      });
    });
  }

  /**
   * shutdown
   * 
   * Shutdown mplayer
   * 
   * @returns a promise resolved when the mplayer process is shutdown
   *          successfully, or rejected when there is an error
   */
  public shutdown(): Promise<void> {
    this.log('Shutting down');
    return this.mplayer.shutdown();
  }

  /**
   * log
   * 
   * Log a line to the console if logging enabled
   * 
   * @param line the line to log
   */
  protected log(line: string): void {
    if (this.logEnabled) {
      console.log(`${new Date().toISOString()}: ${line}`);
    }
  }
}
