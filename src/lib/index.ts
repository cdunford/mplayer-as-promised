import { MPlayerManager, PromiseResolver } from './mplayerManager'

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
   */
  constructor(private logEnabled: boolean = false) {
    this.mplayer = new MPlayerManager((line) => this.log(line));
  }

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
  private log(line: string): void {
    if (this.logEnabled) {
      console.log(`${new Date().toISOString()}: ${line}`);
    }
  }
}