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
      op: (exec: (args: string[]) => void) => void,
      processData: (data: string, resolve: (value?: MPlayerMediaItem | PromiseLike<MPlayerMediaItem>) => void, reject: (reason?: any) => void) => void,
      timeout?: number) => {
      return new Promise<MPlayerMediaItem>((resolve, reject) => {

        const opSpy = sinon.spy();
        op(opSpy);
        expect(opSpy).to.have.been.calledOnce;
        expect(opSpy.getCall(0).args[0][0]).to.eq('loadfile');
        expect(opSpy.getCall(0).args[0][1]).to.eq('"bob"');

        processData('CPLAYER: Starting playback...', resolve, reject);
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
      op: (exec: (args: string[]) => void) => void,
      processData: (data: string, resolve: (value?: MPlayerMediaItem | PromiseLike<MPlayerMediaItem>) => void, reject: (reason?: any) => void) => void,
      timeout?: number) => {
      return new Promise<MPlayerMediaItem>((resolve, reject) => {

        const opSpy = sinon.spy();
        op(opSpy);
        expect(opSpy).to.have.been.calledOnce;
        expect(opSpy.getCall(0).args[0][0]).to.eq('loadfile');
        expect(opSpy.getCall(0).args[0][1]).to.eq('"bob"');

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
      op: (exec: (args: string[]) => void) => void,
      processData: (data: string, resolve: (value?: MPlayerMediaItem | PromiseLike<MPlayerMediaItem>) => void, reject: (reason?: any) => void) => void,
      timeout?: number) => {
      return new Promise<MPlayerMediaItem>((resolve, reject) => {

        const opSpy = sinon.spy();
        op(opSpy);
        expect(opSpy).to.have.been.calledOnce;
        expect(opSpy.getCall(0).args[0][0]).to.eq('loadfile');
        expect(opSpy.getCall(0).args[0][1]).to.eq('"bob"');

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
        expect(opSpy.getCall(0).args[0][0]).to.eq('loadfile');
        expect(opSpy.getCall(0).args[0][1]).to.eq('"bob"');

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