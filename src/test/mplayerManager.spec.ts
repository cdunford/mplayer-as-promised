import { MPlayerManager } from '../lib/mplayerManager';

import * as proc from 'child_process';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

const expect = chai.expect;

describe('MPlayerManager.shutdown', () => {

  let mgr: MPlayerManager;
  let on: sinon.SinonStub;
  let kill: sinon.SinonStub;
  beforeEach(() => {
    mgr = new MPlayerManager((line) => console.log(line));

    on = sinon.stub();
    kill = sinon.stub();
    (<any>mgr).mplayerProc = {
      on: on,
      kill: kill,
    }
  });

  it('should resolve the promise if the process is already shutdown', (done) => {
    (<any>mgr).mplayerProc = undefined;
    mgr.shutdown().then(() => {
      done();
    }).catch((reason) => {
      done(`Promise rejected: ${reason}`);
    });
  });

  it('should resolve the promise if the process shuts down successfully', (done) => {
    on.callsFake((event: string, fn: Function) => {
      if (event === 'exit') {
        fn(1, 'signal');
      }
    });

    mgr.shutdown().then(() => {
      expect(kill).to.be.calledOnce;
      done();
    }).catch((reason) => {
      done(`Promise rejected: ${reason}`);
    });
  });

  it('should reject the promise if the process shutdown fails', (done) => {
    on.callsFake((event: string, fn: Function) => {
      if (event === 'error') {
        fn('failed to shutdown');
      }
    });

    mgr.shutdown().then(() => {
      done('Promise resolved unexpectedly');
    }).catch((reason) => {
      expect(kill).to.be.calledOnce;
      expect(reason).to.eq('failed to shutdown');
      done();
    });
  });
});

describe('MPlayerManager.doCriticalOperation', () => {
  let mgr: MPlayerManager;
  let doOp: sinon.SinonStub;
  beforeEach(() => {
    mgr = new MPlayerManager((line) => console.log(line));
    doOp = sinon.stub();
    mgr.doOperation = doOp;
  });

  it('should reject if we\'re already busy', (done) => {
    (<any>mgr).busy = true;

    mgr.doCriticalOperation<void>((exec) => {
      return Promise.resolve();
    }, (data, resolve, reject) => {
      return;
    }).then(() => {
      done('Unexpected promise resolution');
    }, (reason) => {
      expect(reason).to.eq('Busy - cannot execute operation');
      done();
    });
  });

  it('should resolve and not be busy if the underlying operation resolves', (done) => {
    doOp.callsFake((op: Function, processData: Function, timeout?: number) => {
      return Promise.resolve('Yay!');
    });

    mgr.doCriticalOperation<string>((exec) => {
      return Promise.resolve();
    }, (data, resolve, reject) => {
      return;
    }).then((value) => {
      expect(value).to.eq('Yay!');
      expect((<any>mgr).busy).to.eq(false);
      done();
    }, (reason) => {
      done(`Promise rejected: ${reason}`);
    });
  });

  it('should reject and not be busy if the underlying operation rejects', (done) => {
    doOp.callsFake((op: Function, processData: Function, timeout?: number) => {
      return Promise.reject('boo!');
    });

    mgr.doCriticalOperation<string>((exec) => {
      return Promise.resolve();
    }, (data, resolve, reject) => {
      return;
    }).then((value) => {
      done('Unexpected promise resolution');
    }, (reason) => {
      expect(reason).to.eq('boo!');
      expect((<any>mgr).busy).to.eq(false);
      done();
    });
  });

  it('a subsequent operation should reject if an operation is already outstanding', (done) => {
    doOp.callsFake((op: Function, processData: Function, timeout?: number) => {
      return new Promise((resolve, reject) => {
        return;
      });
    });

    mgr.doCriticalOperation<string>((exec) => {
      return Promise.resolve();
    }, (data, resolve, reject) => {
      return;
    });

    mgr.doCriticalOperation<string>((exec) => {
      return Promise.resolve();
    }, (data, resolve, reject) => {
      return;
    }).then((value) => {
      done('Unexpected promise resolution');
    }, (reason) => {
      expect(reason).to.eq('Busy - cannot execute operation');
      done();
    });
  });
});

describe('MPlayerManager.doOperation', () => {
  let mgr: MPlayerManager;
  let mplayerProc: any;
  let spawn: sinon.SinonStub;

  beforeEach(() => {
    mgr = new MPlayerManager((line) => console.log(line));

    spawn = sinon.stub();
    (<any>proc).spawn = spawn;

    mplayerProc = {
      on: sinon.stub(),
      removeListener: sinon.stub(),
      removeAllListeners: sinon.stub(),
      stdout: {
        on: sinon.stub(),
        removeListener: sinon.stub(),
        removeAllListeners: sinon.stub(),
      },
      stderr: {
        on: sinon.stub(),
        removeListener: sinon.stub(),
        removeAllListeners: sinon.stub(),
      }
    };
  });

  it('should reject promise on timeout', (done) => {
    spawn.withArgs('mplayer', sinon.match.any).returns(mplayerProc);
    mplayerProc.stdout.on.withArgs('data', sinon.match.any).onCall(0).callsFake((evt: string, cb: Function) => {
      setTimeout(() => {
        cb('CPLAYER: MPlayer');
      }, 10);
    });

    mgr.doOperation<void>((exec) => {
      return new Promise<void>((resolve, reject) => {
        resolve();
      });
    }, (data, resolve, reject) => {
      return;
    }, 10).then(() => {
      done('Unexpected promise resolution')
    }, (reason) => {
      expect(reason).to.eq('Timed out');
      done();
    });
  });

  it('should reject promise on mplayer error', (done) => {
    spawn.withArgs('mplayer', sinon.match.any).returns(mplayerProc);
    mplayerProc.on.withArgs('error', sinon.match.any).callsFake((evt: string, cb: Function) => {
      setTimeout(() => {
        cb('AHHHH');
      }, 10);
    });

    mgr.doOperation<void>((exec) => {
      return new Promise<void>((resolve, reject) => {
        resolve();
      });
    }, (data, resolve, reject) => {
      return;
    }).then(() => {
      done('Unexpected promise resolution')
    }, (reason) => {
      expect(reason).to.eq('AHHHH');
      expect(mplayerProc.removeAllListeners).to.have.been.calledOnce;
      expect(mplayerProc.stdout.removeAllListeners).to.have.been.calledOnce;
      expect(mplayerProc.stderr.removeAllListeners).to.have.been.calledOnce;

      done();
    });
  });

  it('should reject promise on mplayer exit', (done) => {
    spawn.withArgs('mplayer', sinon.match.any).returns(mplayerProc);
    mplayerProc.on.withArgs('exit', sinon.match.any).callsFake((evt: string, cb: Function) => {
      setTimeout(() => {
        cb(55, 'signal!');
      }, 10);
    });

    mgr.doOperation<void>((exec) => {
      return new Promise<void>((resolve, reject) => {
        resolve();
      });
    }, (data, resolve, reject) => {
      return;
    }).then(() => {
      done('Unexpected promise resolution')
    }, (reason) => {
      expect(reason).to.eq('MPLAYER exited (55 - signal!)');
      expect(mplayerProc.removeAllListeners).to.have.been.calledOnce;
      expect(mplayerProc.stdout.removeAllListeners).to.have.been.calledOnce;
      expect(mplayerProc.stderr.removeAllListeners).to.have.been.calledOnce;

      done();
    });
  });

  it('should resolve promise when operation completes successfully', (done) => {
    spawn.withArgs('mplayer', sinon.match.any).returns(mplayerProc);
    mplayerProc.stdout.on.withArgs('data', sinon.match.any).onCall(0).callsFake((evt: string, cb: Function) => {
      setTimeout(() => {
        cb('CPLAYER: MPlayer');
      }, 10);
    });

    mplayerProc.stdout.on.withArgs('data', sinon.match.any).onCall(1).callsFake((evt: string, cb: Function) => {
      setTimeout(() => {
        cb('Some stuff');
      }, 10);
    });

    mgr.doOperation<string>((exec) => {
      return new Promise<void>((resolve, reject) => {
        resolve();
      });
    }, (data, resolve, reject) => {
      expect(data).to.eq('Some stuff');
      resolve('bob');
    }).then((value) => {
      expect(value).to.eq('bob');
      done();
    }, (reason) => {
      done(`Promise rejected: ${reason}`);
    });
  });

  it('should reject promise on error after ready', (done) => {
    spawn.withArgs('mplayer', sinon.match.any).returns(mplayerProc);
    mplayerProc.stdout.on.withArgs('data', sinon.match.any).onCall(0).callsFake((evt: string, cb: Function) => {
      setTimeout(() => {
        cb('CPLAYER: MPlayer');
      }, 5);
    });

    mplayerProc.on.withArgs('error', sinon.match.any).callsFake((evt: string, cb: Function) => {
      setTimeout(() => {
        cb('oh no');
      }, 50);
    });

    mgr.doOperation<void>((exec) => {
      return new Promise<void>((resolve, reject) => {
        resolve();
      });
    }, (data, resolve, reject) => {
      return;
    }, 2000).then(() => {
      done('Unexpected promise resolution')
    }, (reason) => {
      expect(reason).to.eq('oh no');
      expect(mplayerProc.removeAllListeners).to.have.been.calledOnce;
      expect(mplayerProc.stdout.removeAllListeners).to.have.been.calledOnce;
      expect(mplayerProc.stderr.removeAllListeners).to.have.been.calledOnce;

      done();
    });
  });

  it('should reject promise on exit after ready', (done) => {
    spawn.withArgs('mplayer', sinon.match.any).returns(mplayerProc);
    mplayerProc.stdout.on.withArgs('data', sinon.match.any).onCall(0).callsFake((evt: string, cb: Function) => {
      setTimeout(() => {
        cb('CPLAYER: MPlayer');
      }, 5);
    });

    mplayerProc.on.withArgs('exit', sinon.match.any).callsFake((evt: string, cb: Function) => {
      setTimeout(() => {
        cb(55, 'hello');
      }, 50);
    });

    mgr.doOperation<void>((exec) => {
      return new Promise<void>((resolve, reject) => {
        resolve();
      });
    }, (data, resolve, reject) => {
      return;
    }, 2000).then(() => {
      done('Unexpected promise resolution')
    }, (reason) => {
      expect(reason).to.eq('MPLAYER exited (55 - hello)');
      expect(mplayerProc.removeAllListeners).to.have.been.calledOnce;
      expect(mplayerProc.stdout.removeAllListeners).to.have.been.calledOnce;
      expect(mplayerProc.stderr.removeAllListeners).to.have.been.calledOnce;

      done();
    });
  });
});