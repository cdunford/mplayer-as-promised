import { MPlayerImpl } from '../lib/index'
import { MPlayerManager } from '../lib/mplayerManager'

import * as TypeMoq from 'typemoq';

class MPlayerTest extends MPlayerImpl {
  constructor(mgr: MPlayerManager) {
    super(true, mgr)
  }
}

describe('MPlayer', () => {
  let mplayer: MPlayerTest;
  let mgrMock: TypeMoq.IMock<MPlayerManager>;

  beforeEach(() => {
    mgrMock = TypeMoq.Mock.ofType<MPlayerManager>(undefined, TypeMoq.MockBehavior.Strict);
    mplayer = new MPlayerTest(mgrMock.object);
  });

  it('should resolve promise when playback successful', (done) => {
    mgrMock.setup(x => x.doOperation<void>(TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny()))
      .callback((op, processData, timeout) => {
        op((args: string[]) => {
          chai.expect(args[0]).to.equal('loadfile');
          chai.expect(args[1]).to.equal('"myfile"');
        });
      }).returns((op, processData, timeout) => {
        return new Promise<void>((resolve, reject) => {
          processData('CPLAYER: Starting playback...', (value?: void | PromiseLike<void>) => {
            resolve();
          }, (reason?: any) => {
            reject(reason);
          });
        });
      });

    mplayer.openFile('myfile').then(() => {
      done();
    });
  });
});