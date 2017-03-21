import { MPlayerManager } from '../lib/mplayerManager';

import * as proc from 'child_process';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

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
      chai.expect(kill).to.be.calledOnce;
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
      chai.expect(kill).to.be.calledOnce;
      chai.expect(reason).to.eq('failed to shutdown');
      done();
    });
  });
});