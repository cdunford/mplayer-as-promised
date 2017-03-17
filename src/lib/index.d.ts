declare module 'mplayer-as-promised' {
  export class MPlayer {
    constructor(logEnabled?: boolean);
    openFile(fileName: string): Promise<void>;
  }
}