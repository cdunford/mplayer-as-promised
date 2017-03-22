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
    private mplayer: MPlayerManager,
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
    return this.playing;
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

    if (!this.playing) {
      return Promise.resolve();
    }

    return this.mplayer.doCriticalOperation<void>((exec) => {
      return exec(['pause']);
    }, (data, resolve, reject) => {
      if (data.includes('CPLAYER:   =====  PAUSE  =====')) {
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

    if (this.playing) {
      return Promise.resolve();
    }

    return this.mplayer.doCriticalOperation<void>((exec) => {
      return exec(['pause']).then(() => {
        this.mplayer.doOperation<void>((innerExec) => {
          return innerExec(['get_property', 'pause']);
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
}

/**
 * MPlayer
 * 
 * Wrapper that provides a promise based API around
 * MPlayer
 */
export class MPlayer {

  private mplayer: MPlayerManager;

  /**
   * constructor
   * 
   * @param logEnabled whether the object should log to the console
   * @param mplayer MPlayerManager used to communicate to mplayer
   */
  public constructor(
    private logEnabled: boolean
  ) {
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

    return this.mplayer.doCriticalOperation<MPlayerMediaItem>((exec) => {
      return exec(['loadfile', `"${fileName}"`]);
    }, (data, resolve, reject) => {
      if (data.includes('CPLAYER: Starting playback...')) {
        resolve(new InternalMPlayerMediaItem(fileName, this.mplayer, (line) => this.log(line)));
      } else if (data.includes('OPEN: File not found')
        || data.includes('OPEN: Failed to open')) {
        reject(data.match(/OPEN: (.*)/)[1]);
      }
    }, OPEN_OP_TIMEOUT);
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