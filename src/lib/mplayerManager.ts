import * as proc from 'child_process';

const mplayerArgs = [
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
 * PromiseResolver
 * 
 * Type encompassing the resolve and reject
 * functions for a Promise
 */
export type PromiseResolver<T> = {
  resolve: (value?: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

/**
 * IMPlayerOperation
 * 
 * Interface for objects that can 
 * consume data (stdout) and errors (stderr)
 * from mplayer
 */
interface IMPlayerDataConsumer {
  /**
   * handleData
   * 
   * handle data from mplayer
   * 
   * @param data the data to handle
   * @returns true if the data was consumed, false otherwise
   */
  handleData(data: string): boolean;

  /**
   * handleError
   * 
   * handle an error from mplayer
   * 
   * @param err the error to handle
   * @returns true if the error was consumed, false otherwise
   */
  handleError(err: string): boolean;
}

/**
 * MPlayerOperation
 * 
 * Object that manages the Promise for a single
 * asynchronous MPlayer operation
 */
class MPlayerOperation<T> implements IMPlayerDataConsumer {

  public promise: Promise<T>;
  private resolver: PromiseResolver<T>;
  private timer: NodeJS.Timer;

  /**
   * 
   * @param processData function which processes mplayer data
   * @param processError function which processes mplayer error
   * @param processTimeout function which processes operation timeout
   * @param timeout the timeout in ms for this operation
   */
  constructor(
    private processData: (data: string, resolver: PromiseResolver<T>) => boolean,
    private processError: (err: string, resolver: PromiseResolver<T>) => boolean,
    private processTimeout: (resolver: PromiseResolver<T>) => void,
    timeout: number
  ) {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolver = {
        resolve: resolve,
        reject: reject,
      }
    });

    this.timer = setTimeout(() => {
      this.processTimeout(this.resolver);
    }, timeout);
  }

  /**
   * handleData
   * 
   * handle data from mplayer
   * 
   * @param data the data to handle
   * @returns true if the data was consumed, false otherwise
   */
  public handleData(data: string) {
    if (this.processData(data, this.resolver)) {
      clearTimeout(this.timer);
      return true;
    }

    return false;
  }

  /**
   * handleError
   * 
   * handle an error from mplayer
   * 
   * @param err the error to handle
   * @returns true if the error was consumed, false otherwise
   */
  public handleError(err: string) {
    if (this.processError(err, this.resolver)) {
      clearTimeout(this.timer);
      return true;
    }

    return false;
  }
}

/**
 * MPlayerManager
 * 
 * Object which manages the mplayer process
 * and provides low level access to executing commands
 * to mplayer and receiving data from the mplayer process
 */
export class MPlayerManager {

  private mplayerProc: proc.ChildProcess;

  private ready: Promise<void>;
  private readyResolver: PromiseResolver<void>;

  private activeOp: IMPlayerDataConsumer;

  /**
   * constructor
   * 
   * @param log function to log data
   */
  constructor(private log: (string) => void) {
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
   * doOperation
   * 
   * Perform an arbitrary asynchronous operation
   * 
   * @param op operation function to execute
   * @param processData function to callback to process mplayer data
   * @param processError function to callback to process mplayer error
   * @param timeout timeout length in ms for this operation
   * @returns a promise resolved when the operation completes or rejected if it fails or times out
   */
  public doOperation<T>(
    op: () => void,
    processData: (data: string, resolver: PromiseResolver<T>) => boolean,
    processError: (err: string, resolver: PromiseResolver<T>) => boolean,
    timeout: number = DEFAULT_OP_TIMEOUT
  ): Promise<T> {
    if (this.activeOp) {
      return Promise.reject('Pending operation outstanding');
    }

    let operation = new MPlayerOperation<T>(processData, processError, (resolver) => {
      resolver.reject('Timed out');
      this.activeOp = undefined;
    }, timeout);

    this.activeOp = operation;

    this.ready.then(() => {
      op();
    });

    return operation.promise;
  }

  /**
   * exec
   * 
   * Execute a command to mplayer with args
   * 
   * @param args an array of args to pass to mplayer, including the command name
   */
  public exec(args: string[]): void {
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

      if (this.activeOp && this.activeOp.handleData(data)) {
        this.activeOp = undefined;
        continue;
      }

      if (data.includes('CPLAYER: MPlayer')) {
        this.readyResolver.resolve();
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

      if (this.activeOp && this.activeOp.handleError(err)) {
        this.activeOp = undefined;
        continue;
      }
    }
  }
}