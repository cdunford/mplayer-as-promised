import { MPlayerManager, PromiseResolver } from './mplayerManager'

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
   */
  public openFile(fileName: string): Promise<void> {
    this.log(`Opening file '${fileName}'`);

    return this.mplayer.doOperation<void>(() => {
      this.mplayer.exec(['loadfile', `"${fileName}"`]);
    }, (data, resolver) => {
      if (data.includes('CPLAYER: Starting playback...')) {
        resolver.resolve();
        return true;
      }

      return false;
    }, (err, resolver) => {
      if (err.includes('OPEN: File not found')
        || err.includes('OPEN: Failed to open')) {
        resolver.reject(err.match(/OPEN: (.*)/)[1]);
        return true;
      }

      return false;
    });
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