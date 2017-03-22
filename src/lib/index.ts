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

  protected constructor(
    private file: string,
    private mplayer: MPlayerManager
  ) { }

  public get fileName(): string {
    return this.file;
  }
}

class InternalMPlayerMediaItem extends MPlayerMediaItem {
  public constructor(file: string, mplayer: MPlayerManager) {
    super(file, mplayer);
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
        resolve(new InternalMPlayerMediaItem(fileName, this.mplayer));
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