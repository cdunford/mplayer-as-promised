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

type PromiseResolver<T> = {
  resolve: (value?: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

export class MPlayer {

  private mplayerProc: proc.ChildProcess;
  private isPlaying: boolean = false;

  private ready: Promise<void>;
  private readyResolver: PromiseResolver<void>;

  private openResolver: PromiseResolver<void>;

  /**
   * constructor
   * 
   * @param logEnabled whether the object should log to the console
   */
  constructor(private logEnabled: boolean = false) {
    this.ready = new Promise<void>((resolve, reject) => {
      this.readyResolver = {
        resolve: resolve,
        reject: reject,
      };
    });

    this.mplayerProc = proc.spawn('mplayer', mplayerArgs);
    this.mplayerProc.stdout.on('data', (chunk: string | Buffer) => this.onData(chunk));
    this.mplayerProc.stderr.on('data', (chunk: string | Buffer) => this.onError(chunk));
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

    if (this.openResolver) {
      this.openResolver.reject(`Loading new file '${fileName}' before previous load completed`);
      this.openResolver = undefined;
    }

    return this.ready.then(() => {
      this.exec(['loadfile', `"${fileName}"`]);

      return new Promise<void>((resolve, reject) => {
        this.openResolver = {
          resolve: resolve,
          reject: reject,
        }
      });
    });
  }

  /**
   * exec
   * 
   * Execute a command to mplayer with args
   * 
   * @param args an array of args to pass to mplayer, including the command name
   */
  private exec(args: string[]): void {
    let cmd = `${args.join(' ')}`;
    this.log(`Executing: '${cmd}'`);

    this.mplayerProc.stdin.write(`${cmd}\n`);
  }

  /**
   * onData
   * 
   * Handles stdout data read from mplayer
   * 
   * @param chunk data received
   */
  private onData(chunk: string | Buffer): void {
    chunk = chunk.toString();

    for (const data of chunk.split('\n')) {
      this.log(`Received data: ${data}`);

      if (chunk.includes('CPLAYER: MPlayer')) {
        this.readyResolver.resolve();
      } else if (chunk.includes('CPLAYER: Starting playback...')) {
        if (this.openResolver) {
          this.openResolver.resolve();
          this.openResolver = undefined;
          this.isPlaying = true;
        }
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
  private onError(chunk: string | Buffer): void {
    chunk = chunk.toString();

    for (const err of chunk.split('\n')) {
      this.log(`ERROR: ${err}`);

      if (err.includes('OPEN: File not found')
        || err.includes('OPEN: Failed to open')) {
        if (this.openResolver) {
          this.openResolver.reject(err.match(/OPEN: (.*)/)[1]);
          this.openResolver = undefined;
        }
      }
    }
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