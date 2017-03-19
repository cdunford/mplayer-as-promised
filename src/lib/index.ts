import { MPlayerManager } from './mplayerManager'

/**
 * MPlayerImpl
 * 
 * Wrapper that provides a promise based API around
 * MPlayer
 */
export class MPlayerImpl {

  /**
   * constructor
   * 
   * @param logEnabled whether the object should log to the console
   * @param mplayer MPlayerManager used to communicate to mplayer
   */
  protected constructor(
    private logEnabled: boolean,
    private mplayer: MPlayerManager
  ) { }

  /**
   * openFile
   * 
   * Open and start playing a file
   * 
   * @param fileName path to the file to open
   * @returns a promise that resolves when the file is open and  playing,
   *          or is rejected if the file fails to open
   */
  public openFile(fileName: string): Promise<void> {
    this.log(`Opening file '${fileName}'`);

    return this.mplayer.doOperation<void>((exec) => {
      exec(['loadfile', `"${fileName}"`]);
    }, (data, resolve, reject) => {
      if (data.includes('CPLAYER: Starting playback...')) {
        resolve();
      } else if (data.includes('OPEN: File not found')
        || data.includes('OPEN: Failed to open')) {
        reject(data.match(/OPEN: (.*)/)[1]);
      }
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

/**
 * MPlayer
 * 
 * Wrapper that provides a promise based API around
 * MPlayer
 */
export class MPlayer extends MPlayerImpl {

  /**
   * constructor
   * 
   * @param logEnabled whether logging to console is enabled
   */
  public constructor(logEnabled: boolean = false) {
    super(logEnabled, new MPlayerManager((line) => this.log(line)));
  }
}