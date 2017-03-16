import * as proc from 'child_process';

const mplayerArgs = [
  '-msgmodule',
  '-msglevel',
  'statusline=1',
  '-idle',
  '-slave',
  '-fs',
  '-noborder',
];

type PromiseResolve<T> = (value?: T | PromiseLike<T>) => void;
type PromiseReject<T> = (reason?: any) => void;

export class MPlayer {

  private mplayerProc: proc.ChildProcess;
  private isPlaying: boolean = false;

  private ready: Promise<void>;
  private readyResolve: PromiseResolve<void>;

  private playResolve: PromiseResolve<void>;

  /**
   * constructor
   * 
   * @param logEnabled whether the object should log to the console
   */
  constructor(private logEnabled: boolean = false) {
    this.ready = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
    });

    this.mplayerProc = proc.spawn('mplayer', mplayerArgs);
    this.mplayerProc.stdout.on('data', (chunk: string) => this.onData(chunk));
    this.mplayerProc.stderr.on('data', (chunk: string) => this.onError(chunk));
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

    return this.ready.then(() => {
      this.exec(['loadfile', `"${fileName}"`]);

      return new Promise<void>((resolve, reject) => {
        this.playResolve = resolve;
      });
    });
  }

  private exec(args: string[]): void {
    let cmd = `${args.join(' ')}\n`;
    this.log(`Executing: '${cmd}'`);

    this.mplayerProc.stdin.write(cmd);
  }

  /**
   * onData
   * 
   * Handles stdout data read from mplayer
   * 
   * @param chunk data received
   */
  private onData(chunk: string): void {
    this.log(`Received data: ${chunk}`);

    if (chunk.includes('CPLAYER: MPlayer')) {
      this.readyResolve();
    } else if (chunk.includes('CPLAYER: Starting playback...')) {
      if (this.playResolve) {
        this.playResolve();
        this.playResolve = undefined;
        this.isPlaying = true;
      }
    }
  }

  /**
   * onError
   * 
   * Handles stderr data read from mplayer
   * 
   * @param chunk data received
   */
  private onError(chunk: string): void {
    this.log(`ERROR: ${chunk}`);
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