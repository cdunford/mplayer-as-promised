import { MPlayer, MPlayerMediaItem } from '../lib/index'
import { MPlayerManager } from '../lib/mplayerManager'

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

chai.use(sinonChai);
const expect = chai.expect;

describe('MPlayer.openFile', () => {
  let mplayer: MPlayer;
  let mgr: any;

  beforeEach(() => {
    mplayer = new MPlayer(true);

    mgr = sinon.createStubInstance(MPlayerManager);
    (<any>mplayer).mplayer = mgr;
  });

  it('should resolve promise when playback successful', (done) => {
    mgr.doCriticalOperation.callsFake((
      op: (exec: (...args: (string | number)[]) => void) => void,
      processData: (data: string, resolve: (value?: MPlayerMediaItem | PromiseLike<MPlayerMediaItem>) => void, reject: (reason?: any) => void) => void,
      timeout?: number) => {
      return new Promise<MPlayerMediaItem>((resolve, reject) => {

        const opSpy = sinon.spy();
        op(opSpy);
        expect(opSpy).to.have.been.calledOnce;
        expect(opSpy.getCall(0).args[0]).to.eq('loadfile');
        expect(opSpy.getCall(0).args[1]).to.eq('"bob"');

        processData('CPLAYER: Starting playback...', resolve, reject);
      });
    });

    mgr.doOperation.callsFake((
      op: (exec: (...args: (string | number)[]) => void) => void,
      processData: (data: string, resolve: (value?: MPlayerMediaItem | PromiseLike<MPlayerMediaItem>) => void, reject: (reason?: any) => void) => void,
      timeout?: number) => {
      return new Promise<void>((resolve, reject) => {
        return;
      });
    });

    mplayer.openFile('bob').then((item) => {
      expect(item.fileName).to.eq('bob');
      done();
    }).catch((reason) => {
      done(`Promise rejected ${reason}`);
    });
  });

  it('should reject promise if file not found', (done) => {
    mgr.doCriticalOperation.callsFake((
      op: (exec: (...args: (string | number)[]) => void) => void,
      processData: (data: string, resolve: (value?: MPlayerMediaItem | PromiseLike<MPlayerMediaItem>) => void, reject: (reason?: any) => void) => void,
      timeout?: number) => {
      return new Promise<MPlayerMediaItem>((resolve, reject) => {

        const opSpy = sinon.spy();
        op(opSpy);
        expect(opSpy).to.have.been.calledOnce;
        expect(opSpy.getCall(0).args[0]).to.eq('loadfile');
        expect(opSpy.getCall(0).args[1]).to.eq('"bob"');

        processData('OPEN: File not found "bob"', resolve, reject);
      });
    });

    mplayer.openFile('bob').then((item) => {
      done('Promise unexpectedly resolved');
    }).catch((reason) => {
      expect(reason).to.eq('File not found "bob"');
      done();
    });
  });

  it('should reject promise if file failed to open', (done) => {
    mgr.doCriticalOperation.callsFake((
      op: (exec: (...args: (string | number)[]) => void) => void,
      processData: (data: string, resolve: (value?: MPlayerMediaItem | PromiseLike<MPlayerMediaItem>) => void, reject: (reason?: any) => void) => void,
      timeout?: number) => {
      return new Promise<MPlayerMediaItem>((resolve, reject) => {

        const opSpy = sinon.spy();
        op(opSpy);
        expect(opSpy).to.have.been.calledOnce;
        expect(opSpy.getCall(0).args[0]).to.eq('loadfile');
        expect(opSpy.getCall(0).args[1]).to.eq('"bob"');

        processData('OPEN: Failed to open "bob"', resolve, reject);
      });
    });

    mplayer.openFile('bob').then((item) => {
      done('Promise unexpectedly resolved');
    }).catch((reason) => {
      expect(reason).to.eq('Failed to open "bob"');
      done();
    });
  });

  it('should reject promise on timeout', (done) => {
    mgr.doCriticalOperation.callsFake((
      op: (exec: (args: string[]) => void) => void,
      processData: (data: string, resolve: (value?: MPlayerMediaItem | PromiseLike<MPlayerMediaItem>) => void, reject: (reason?: any) => void) => void,
      timeout?: number) => {
      return new Promise<MPlayerMediaItem>((resolve, reject) => {

        const opSpy = sinon.spy();
        op(opSpy);
        expect(opSpy).to.have.been.calledOnce;
        expect(opSpy.getCall(0).args[0]).to.eq('loadfile');
        expect(opSpy.getCall(0).args[1]).to.eq('"bob"');

        reject('Timed out');
      });
    });

    mplayer.openFile('bob').then((item) => {
      done('Promise unexpectedly resolved');
    }).catch((reason) => {
      expect(reason).to.eq('Timed out');
      done();
    });
  });
});

describe('MPlayer.shutdown', () => {
  let mplayer: MPlayer;
  let mgr: any;

  beforeEach(() => {
    mplayer = new MPlayer(true);

    mgr = sinon.createStubInstance(MPlayerManager);
    (<any>mplayer).mplayer = mgr;
  });

  it('should reject promise if shutdown fails', (done) => {
    mgr.shutdown.callsFake(() => {
      return new Promise<void>((resolve, reject) => {
        resolve();
      });
    });

    mplayer.shutdown().then(() => {
      done();
    }).catch((reason) => {
      done('Promise rejected: ${reason}');
    });
  });

  it('should resolve promise if shutdown successful', (done) => {
    mgr.shutdown.callsFake(() => {
      return new Promise<void>((resolve, reject) => {
        reject('error shutting down mplayer');
      });
    });

    mplayer.shutdown().then(() => {
      done('Promise unexpectedly resolved');
    }).catch((reason) => {
      expect(reason).to.eq('error shutting down mplayer');
      done();
    });
  });
});

class MPlayerMediaItemTest extends MPlayerMediaItem {
  public constructor(
    file: string,
    mplayer: MPlayerManager) {
    super(file, mplayer, (line) => console.log(line));
  }
}

describe('MPlayerMediaItem.play', () => {
  let item: MPlayerMediaItem;
  let mgr: any;

  beforeEach(() => {
    mgr = sinon.createStubInstance(MPlayerManager);
    item = new MPlayerMediaItemTest('bob.wav', mgr);
  });

  it('should resolve if already playing', (done) => {
    expect(item.isPlaying).to.be.true;

    item.play().then(() => {
      expect(item.isPlaying).to.be.true;
      done();
    }, (reason) => {
      done(`Promise rejected: ${reason}`);
    });
  });

  it('should resolve if play succeeds', (done) => {
    (<any>item).playing = false;
    let playProcessData: Function;
    let playResolve: Function;
    let playReject: Function;

    mgr.doCriticalOperation.callsFake((
      op: (exec: (...args: (string | number)[]) => void) => void,
      processData: (data: string, resolve: (value?: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => void,
      timeout?: number) => {
      return new Promise<void>((resolve, reject) => {
        playProcessData = processData;
        playResolve = resolve;
        playReject = reject;

        const opSpy = sinon.stub();
        opSpy.returns(Promise.resolve());

        op(opSpy);
        expect(opSpy).to.have.been.calledOnce;
        expect(opSpy.getCall(0).args[0]).to.eq('pause');
      });
    });

    mgr.doOperation.callsFake((
      op: (exec: (args: string[]) => void) => void,
      processData: (data: string, resolve: (value?: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => void,
      timeout?: number) => {
      return new Promise<void>((resolve, reject) => {
        const opSpy = sinon.stub();

        op(opSpy);
        expect(opSpy).to.have.been.calledOnce;
        expect(opSpy.getCall(0).args[0]).to.eq('pausing_keep_force');
        expect(opSpy.getCall(0).args[1]).to.eq('get_property');
        expect(opSpy.getCall(0).args[2]).to.eq('pause');

        processData('GLOBAL: ANS_pause=no', resolve, reject);
        playProcessData('GLOBAL: ANS_pause=no', playResolve, playReject);
      });
    });

    item.play().then(() => {
      expect(item.isPlaying).to.be.true;
      done();
    }, (reason) => {
      done(`Promise rejected: ${reason}`);
    });
  });
});

describe('MPlayerMediaItem.pause', () => {
  let item: MPlayerMediaItem;
  let mgr: any;

  beforeEach(() => {
    mgr = sinon.createStubInstance(MPlayerManager);
    item = new MPlayerMediaItemTest('bob.wav', mgr);
  });

  it('should resolve if already paused', (done) => {
    (<any>item).playing = false;

    item.pause().then(() => {
      expect(item.isPlaying).to.be.false;
      done();
    }, (reason) => {
      done(`Promise rejected: ${reason}`);
    });
  });

  it('should resolve if pause succeeds', (done) => {

    mgr.doCriticalOperation.callsFake((
      op: (exec: (...args: (string | number)[]) => void) => void,
      processData: (data: string, resolve: (value?: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => void,
      timeout?: number) => {
      return new Promise<void>((resolve, reject) => {

        const opSpy = sinon.stub();
        opSpy.returns(Promise.resolve());

        op(opSpy);
        expect(opSpy).to.have.been.calledOnce;
        expect(opSpy.getCall(0).args[0]).to.eq('pause');

        processData('CPLAYER:   =====  PAUSE  =====', resolve, reject);
      });
    });

    item.pause().then(() => {
      expect(item.isPlaying).to.be.false;
      done();
    }, (reason) => {
      done(`Promise rejected: ${reason}`);
    });
  });
});

describe('MPlayerMediaItem.seekTo', () => {
  let item: MPlayerMediaItem;
  let mgr: any;

  beforeEach(() => {
    mgr = sinon.createStubInstance(MPlayerManager);
    item = new MPlayerMediaItemTest('bob.wav', mgr);
  });

  it('should resolve if it succeeds', (done) => {

    mgr.doCriticalOperation.callsFake((
      op: (exec: (...args: (string | number)[]) => void) => void,
      processData: (data: string, resolve: (value?: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => void,
      timeout?: number) => {
      return new Promise<void>((resolve, reject) => {

        const opSpy = sinon.stub();
        opSpy.returns(Promise.resolve());

        op(opSpy);
        expect(opSpy).to.have.been.calledOnce;
        expect(opSpy.getCall(0).args[0]).to.eq('pausing_keep');
        expect(opSpy.getCall(0).args[1]).to.eq('seek');
        expect(opSpy.getCall(0).args[2]).to.eq(15);
        expect(opSpy.getCall(0).args[3]).to.eq(2);

        processData('CPLAYER: Position: 15 %', resolve, reject);
      });
    });

    item.seekTo(15).then(() => {
      done();
    }, (reason) => {
      done(`Promise rejected: ${reason}`);
    });
  });
});

describe('MPlayerMediaItem.seekBy', () => {
  let item: MPlayerMediaItem;
  let mgr: any;

  beforeEach(() => {
    mgr = sinon.createStubInstance(MPlayerManager);
    item = new MPlayerMediaItemTest('bob.wav', mgr);
  });

  it('should resolve if it succeeds', (done) => {

    mgr.doCriticalOperation.callsFake((
      op: (exec: (...args: (string | number)[]) => void) => void,
      processData: (data: string, resolve: (value?: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => void,
      timeout?: number) => {
      return new Promise<void>((resolve, reject) => {

        const opSpy = sinon.stub();
        opSpy.returns(Promise.resolve());

        op(opSpy);
        expect(opSpy).to.have.been.calledOnce;
        expect(opSpy.getCall(0).args[0]).to.eq('pausing_keep');
        expect(opSpy.getCall(0).args[1]).to.eq('seek');
        expect(opSpy.getCall(0).args[2]).to.eq(-20);
        expect(opSpy.getCall(0).args[3]).to.eq(0);

        processData('CPLAYER: Position: 15 %', resolve, reject);
      });
    });

    item.seekBy(-20).then(() => {
      done();
    }, (reason) => {
      done(`Promise rejected: ${reason}`);
    });
  });
});

describe('MPlayerMediaItem.stop', () => {
  let item: MPlayerMediaItem;
  let mgr: any;

  beforeEach(() => {
    mgr = sinon.createStubInstance(MPlayerManager);
    item = new MPlayerMediaItemTest('bob.wav', mgr);
  });

  it('should resolve if it succeeds', (done) => {
    mgr.doCriticalOperation.callsFake((
      op: (exec: (...args: (string | number)[]) => void) => void,
      processData: (data: string, resolve: (value?: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => void,
      timeout?: number) => {
      return new Promise<void>((resolve, reject) => {

        const opSpy = sinon.stub();
        opSpy.returns(Promise.resolve());

        op(opSpy);
        expect(opSpy).to.have.been.calledOnce;
        expect(opSpy.getCall(0).args[0]).to.eq('stop');

        processData('GLOBAL: EOF code: 4', resolve, reject);
      });
    });

    item.stop().then(() => {
      done();
    }, (reason) => {
      done(`Promise rejected: ${reason}`);
    })
  });
});

describe('MPlayerMediaItem.listen', () => {
  let item: MPlayerMediaItem;
  let mgr: any;

  beforeEach(() => {
    mgr = sinon.createStubInstance(MPlayerManager);
    item = new MPlayerMediaItemTest('bob.wav', mgr);
  });

  it('should resolve if it succeeds', (done) => {
    mgr.doOperation.callsFake((
      op: (exec: (...args: (string | number)[]) => void) => void,
      processData: (data: string, resolve: (value?: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => void,
      timeout?: number) => {
      return new Promise<void>((resolve, reject) => {

        const opSpy = sinon.stub();
        opSpy.returns(Promise.resolve());
        op(opSpy);

        processData('GLOBAL: EOF code: 0', resolve, reject);
      });
    });

    item.listen().then(() => {
      done();
    }, (reason) => {
      done(`Promise rejected: ${reason}`);
    })
  });
});

describe('MPlayerMediaItem.getCurrentTime', () => {
  let item: MPlayerMediaItem;
  let mgr: any;

  beforeEach(() => {
    mgr = sinon.createStubInstance(MPlayerManager);
    item = new MPlayerMediaItemTest('bob.wav', mgr);
  });

  it('should resolve if it succeeds', (done) => {
    mgr.doCriticalOperation.callsFake((
      op: (exec: (...args: (string | number)[]) => void) => void,
      processData: (data: string, resolve: (value?: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => void,
      timeout?: number) => {
      return new Promise<void>((resolve, reject) => {

        const opSpy = sinon.stub();
        opSpy.returns(Promise.resolve());

        op(opSpy);
        expect(opSpy).to.have.been.calledOnce;
        expect(opSpy.getCall(0).args[0]).to.eq('pausing_keep_force');
        expect(opSpy.getCall(0).args[1]).to.eq('get_property');
        expect(opSpy.getCall(0).args[2]).to.eq('time_pos');

        processData('GLOBAL: ANS_time_pos=15.2', resolve, reject);
      });
    });

    item.getCurrentTime().then((value) => {
      expect(value).to.eq(15.2);
      done();
    }, (reason) => {
      done(`Promise rejected: ${reason}`);
    })
  });
});

describe('MPlayerMediaItem.getCurrentPercent', () => {
  let item: MPlayerMediaItem;
  let mgr: any;

  beforeEach(() => {
    mgr = sinon.createStubInstance(MPlayerManager);
    item = new MPlayerMediaItemTest('bob.wav', mgr);
  });

  it('should resolve if it succeeds', (done) => {
    mgr.doCriticalOperation.callsFake((
      op: (exec: (...args: (string | number)[]) => void) => void,
      processData: (data: string, resolve: (value?: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => void,
      timeout?: number) => {
      return new Promise<void>((resolve, reject) => {

        const opSpy = sinon.stub();
        opSpy.returns(Promise.resolve());

        op(opSpy);
        expect(opSpy).to.have.been.calledOnce;
        expect(opSpy.getCall(0).args[0]).to.eq('pausing_keep_force');
        expect(opSpy.getCall(0).args[1]).to.eq('get_property');
        expect(opSpy.getCall(0).args[2]).to.eq('percent_pos');

        processData('GLOBAL: ANS_percent_pos=33', resolve, reject);
      });
    });

    item.getCurrentPercent().then((value) => {
      expect(value).to.eq(33);
      done();
    }, (reason) => {
      done(`Promise rejected: ${reason}`);
    })
  });
});


describe('MPlayerMediaItem.getLength', () => {
  let item: MPlayerMediaItem;
  let mgr: any;

  beforeEach(() => {
    mgr = sinon.createStubInstance(MPlayerManager);
    item = new MPlayerMediaItemTest('bob.wav', mgr);
  });

  it('should resolve if it succeeds', (done) => {
    mgr.doCriticalOperation.callsFake((
      op: (exec: (...args: (string | number)[]) => void) => void,
      processData: (data: string, resolve: (value?: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => void,
      timeout?: number) => {
      return new Promise<void>((resolve, reject) => {

        const opSpy = sinon.stub();
        opSpy.returns(Promise.resolve());

        op(opSpy);
        expect(opSpy).to.have.been.calledOnce;
        expect(opSpy.getCall(0).args[0]).to.eq('pausing_keep_force');
        expect(opSpy.getCall(0).args[1]).to.eq('get_property');
        expect(opSpy.getCall(0).args[2]).to.eq('length');

        processData('GLOBAL: ANS_length=120.7', resolve, reject);
      });
    });

    item.getLength().then((value) => {
      expect(value).to.eq(120.7);
      done();
    }, (reason) => {
      done(`Promise rejected: ${reason}`);
    })
  });
});

describe('MPlayerMediaItem.getMetadata', () => {
  let item: MPlayerMediaItem;
  let mgr: any;

  beforeEach(() => {
    mgr = sinon.createStubInstance(MPlayerManager);
    item = new MPlayerMediaItemTest('bob.wav', mgr);
  });

  it('should resolve if it succeeds', (done) => {
    mgr.doCriticalOperation.callsFake((
      op: (exec: (...args: (string | number)[]) => void) => void,
      processData: (data: string, resolve: (value?: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => void,
      timeout?: number) => {
      return new Promise<void>((resolve, reject) => {

        const opSpy = sinon.stub();
        opSpy.returns(Promise.resolve());

        op(opSpy);
        expect(opSpy).to.have.been.calledOnce;
        expect(opSpy.getCall(0).args[0]).to.eq('pausing_keep_force');
        expect(opSpy.getCall(0).args[1]).to.eq('get_property');
        expect(opSpy.getCall(0).args[2]).to.eq('metadata');

        processData('GLOBAL: ANS_metadata=Title,Everything In Its Right Place ,Artist,Radiohead   ,Album,Kid A ,Year,2000   ,Comment,,Track,1,Genre,Other', resolve, reject);
      });
    });

    item.getMetadata().then((value) => {
      expect(value).to.eql({
        title: 'Everything In Its Right Place',
        artist: 'Radiohead',
        album: 'Kid A',
        year: 2000,
        comment: '',
        track: 1,
        genre: 'Other'
      });
      done();
    }, (reason) => {
      done(`Promise rejected: ${reason}`);
    })
  });
});
