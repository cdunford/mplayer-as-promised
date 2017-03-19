import * as proc from 'child_process';

const MPLAYER_ARGS = [
  '-msgmodule',
  '-msglevel',
  'all=6:statusline=4',
  '-idle',
  '-slave',
  '-fs',
  '-noborder',
];

const DEFAULT_OP_TIMEOUT = 2000;

/**
 * MPlayerManager
 * 
 * Object which manages the mplayer process
 * and provides low level access to executing commands
 * to mplayer and receiving data from the mplayer process
 */
export class MPlayerManager {

  private mplayerProc: proc.ChildProcess;
  private busy: boolean = false;
  private ready: boolean = false;

  /**
   * constructor
   * 
   * @param log function to log data
   */
  constructor(private log: (line: string) => void) { }

  /**
   * doOperation
   * 
   * Perform an arbitrary asynchronous operation
   * 
   * @param op operation function to execute
   * @param processData function to callback to process mplayer data
   * @param timeout timeout length in ms for this operation
   * @returns a promise resolved when the operation completes or rejected if it fails or times out
   */
  public doOperation<T>(
    op: (exec: (args: string[]) => void) => void,
    processData: (data: string, resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void,
    timeout: number = DEFAULT_OP_TIMEOUT
  ): Promise<T> {

    return new Promise<T>((resolve, reject) => {

      this.readyMPlayer().then(() => {
        let onData: (chunk: string | Buffer) => void;
        let onExit: (code: number, signal: string) => void;
        let onError: (err: Error) => void;

        let cleanup = () => {
          this.mplayerProc.stdout.removeListener('data', onData);
          this.mplayerProc.stderr.removeListener('data', onData);
          this.mplayerProc.removeListener('exit', onExit);
          this.mplayerProc.removeListener('error', onError);
        }

        onData = (chunk) => {
          chunk = chunk.toString();

          let done = false;
          for (const data of chunk.split('\n')) {
            this.log(`data received: ${data}`);
            processData(data, (value?: T | PromiseLike<T>) => {
              cleanup();
              resolve(value);

              done = true;
            }, (reason?: any) => {
              cleanup();
              reject(reason);

              done = true;
            });

            if (done) {
              break;
            }
          }
        }

        onExit = (code, signal) => {
          reject(`MPLAYER exited (${code} - ${signal})`);
        }

        onError = (err) => {
          reject(err);
        }

        this.mplayerProc.stdout.on('data', onData);
        this.mplayerProc.stderr.on('data', onData);
        this.mplayerProc.on('exit', onExit);
        this.mplayerProc.on('error', onError);

        op((args) => this.exec(args));
      }, (reason) => {
        reject(reason);
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
    if (!this.mplayerProc) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      let onExit: (code: number, signal: string) => void;
      let onError: (err: Error) => void;

      onExit = (code, signal) => {
        resolve();
      }

      onError = (err) => {
        reject(err);
      }

      this.mplayerProc.on('exit', onExit);
      this.mplayerProc.on('error', onError);
      this.mplayerProc.kill();
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
   * readyMPlayer
   * 
   * @returns a promise that resolves when mplayer is ready, or is
   *          is rejected if mplayer fails to start
   */
  private readyMPlayer(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.ready && this.mplayerProc) {
        resolve();
      }

      this.shutdown();
      this.mplayerProc = proc.spawn('mplayer', MPLAYER_ARGS);

      let onProcExit: (code: number, signal: string) => void;
      let onProcErr: (err: Error) => void;
      let handleProcCompletion = () => {
        if (this.mplayerProc) {
          this.mplayerProc.removeAllListeners();
          this.mplayerProc.stdout.removeAllListeners();
          this.mplayerProc.stderr.removeAllListeners();
          this.mplayerProc = undefined;
        }

        this.ready = false;
      }
      onProcExit = (code, signal) => {
        this.log(`MPLAYER exit: ${code} ${signal}`);
        handleProcCompletion();
      }

      onProcErr = (err) => {
        this.log(`MPLAYER error: ${err}`);
        handleProcCompletion();
      }
      this.mplayerProc.on('exit', onProcExit);
      this.mplayerProc.on('error', onProcErr);

      let onData: (chunk: string | Buffer) => void;
      let onExit: (code: number, signal: string) => void;
      let onError: (err: Error) => void;

      onData = (chunk) => {
        chunk = chunk.toString();
        for (const data of chunk.split('\n')) {
          this.log(`data received: ${data}`);
          if (data.includes('CPLAYER: MPlayer')) {
            this.mplayerProc.stdout.removeListener('data', onData);
            this.mplayerProc.removeListener('exit', onExit);
            this.mplayerProc.removeListener('error', onError);

            this.log('MPLAYER ready');
            this.ready = true;
            resolve();
            break;
          }
        }
      }

      onExit = (code, signal) => {
        reject(`MPLAYER exited (${code} - ${signal})`);
      }

      onError = (err) => {
        reject(err);
      }

      this.mplayerProc.stdout.on('data', onData);
      this.mplayerProc.on('exit', onExit);
      this.mplayerProc.on('error', onError);
    });
  }
}