import * as proc from 'child_process';

const MPLAYER_ARGS = [
  '-msgmodule',
  '-msglevel',
  'all=6:statusline=4',
  '-idle',
  '-slave',
  '-fs',
  '-noborder',
  '-nofontconfig',
];

/**
 * MPlayerManager
 * 
 * Object which manages the mplayer process
 * and provides low level access to executing commands
 * to mplayer and receiving data from the mplayer process
 */
export class MPlayerManager {

  private mplayerProc: proc.ChildProcess;
  private ready: boolean = false;
  private busy: boolean = false;

  /**
   * constructor
   * 
   * @param log function to log data
   */
  constructor(private log: (line: string) => void) { }

  /**
   * doCriticalOperation
   * 
   * Perform an arbitrary asynchronous operation, preventing other critical
   * operations from executing while a critical operation is outstanding
   * 
   * @param op operation function to execute
   * @param processData function to callback to process mplayer data
   * @param timeout timeout length in ms for this operation
   * @returns a promise resolved when the operation completes or rejected if it fails or times out
   */
  public doCriticalOperation<T>(
    op: (exec: (...args: (string | number)[]) => Promise<void>) => Promise<void>,
    processData: (data: string, resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void,
    timeout: number = 0
  ): Promise<T> {
    if (this.busy) {
      const msg = 'Busy - cannot execute operation';
      this.log(msg);
      return Promise.reject(msg);
    }

    this.busy = true;

    return this.doOperation<T>(op, processData, timeout)
      .then((value) => {
        this.busy = false;
        return value;
      }).catch((reason) => {
        this.busy = false;
        return Promise.reject(reason);
      });
  }

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
    op: (exec: (...args: (string | number)[]) => Promise<void>) => Promise<void>,
    processData: (data: string, resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void,
    timeout: number = 0
  ): Promise<T> {

    return new Promise<T>((resolve, reject) => {

      this.readyMPlayer().then(() => {
        let timer: NodeJS.Timer;

        const onExit = (code: number, signal: string) => {
          if (timer) {
            clearTimeout(timer);
          }
          reject(`MPLAYER exited (${code} - ${signal})`);
        }

        const onError = (err: Error) => {
          if (timer) {
            clearTimeout(timer);
          }
          reject(err);
        }

        this.mplayerProc.on('exit', onExit);
        this.mplayerProc.on('error', onError);

        op((...args) => this.exec(...args)).then(() => {
          if (timeout) {
            timer = setTimeout(() => {
              reject('Timed out');
            }, timeout);
          }

          const onData = (chunk: string | Buffer) => {
            chunk = chunk.toString();

            let done = false;
            for (const data of chunk.split('\n')) {
              this.log(`data received: ${data}`);
              processData(data, (value?: T | PromiseLike<T>) => {
                resolve(value);
                done = true;
              }, (reason?: any) => {
                reject(reason);
                done = true;
              });

              if (done) {
                if (timer) {
                  clearTimeout(timer);
                }
                this.mplayerProc.stdout.removeListener('data', onData);
                this.mplayerProc.stderr.removeListener('data', onData);
                this.mplayerProc.removeListener('exit', onExit);
                this.mplayerProc.removeListener('error', onError);

                break;
              }
            }
          }

          this.mplayerProc.stdout.on('data', onData);
          this.mplayerProc.stderr.on('data', onData);
        }, (reason) => {
          this.mplayerProc.removeListener('exit', onExit);
          this.mplayerProc.removeListener('error', onError);

          reject(reason);
        });
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
      this.mplayerProc.on('exit', (code, signal) => {
        resolve();
      });

      this.mplayerProc.on('error', (err) => {
        reject(err);
      });

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
  private exec(...args: (string | number)[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const cmd = `${args.join(' ')}`;
      this.log(`Executing: '${cmd}'`);

      const onError = (err: Error) => {
        reject(err);
      }
      this.mplayerProc.stdin.on('error', onError);

      const noDrain = this.mplayerProc.stdin.write(`${cmd}\n`, () => {
        if (noDrain) {
          this.mplayerProc.stdin.removeListener('error', onError);
          resolve();
        }
      });

      if (!noDrain) {
        this.mplayerProc.stdin.once('drain', () => {
          resolve();
        });
      }
    });
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
        return;
      }

      const spawnMPlayer = () => {
        this.mplayerProc = proc.spawn('mplayer', MPLAYER_ARGS);

        const handleProcCompletion = () => {
          if (this.mplayerProc) {
            this.mplayerProc.removeAllListeners();
            this.mplayerProc.stdout.removeAllListeners();
            this.mplayerProc.stderr.removeAllListeners();
            this.mplayerProc = undefined;
          }

          this.ready = false;
        }

        this.mplayerProc.on('exit', (code, signal) => {
          this.log(`MPLAYER exit: ${code} ${signal}`);
          handleProcCompletion();
        });
        this.mplayerProc.on('error', (err) => {
          this.log(`MPLAYER error: ${err}`);
          handleProcCompletion();
        });

        const onData = (chunk: string | Buffer) => {
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

        const onExit = (code: number, signal: string) => {
          reject(`MPLAYER exited (${code} - ${signal})`);
        }

        const onError = (err: Error) => {
          reject(err);
        }

        this.mplayerProc.stdout.on('data', onData);
        this.mplayerProc.on('exit', onExit);
        this.mplayerProc.on('error', onError);
      }

      this.shutdown().then(spawnMPlayer, spawnMPlayer);
    });
  }
}