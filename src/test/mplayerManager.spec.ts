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

    mgr.doCriticalOperation<void>((args) => {
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

    mgr.doCriticalOperation<string>((args) => {
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

    mgr.doCriticalOperation<string>((args) => {
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

    mgr.doCriticalOperation<string>((args) => {
      return Promise.resolve();
    }, (data, resolve, reject) => {
      return;
    });

    mgr.doCriticalOperation<string>((args) => {
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