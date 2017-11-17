import * as sinon from 'sinon';
import * as errio from 'errio';
import * as _ from 'lodash';

export class BbMocker {
  protected sandbox = sinon.createSandbox();
  protected mocks = {} as any;
  protected state = 'stopped';
  protected recordingMocks = {} as any;

  constructor() {

  }

  mock(params:{mocks: any}) {
    //TODO check if mocks is registered already
    _.merge(this.mocks, params.mocks);
  }

  rec() {
    if (this.state !== 'stopped') {
      throw new Error('Not stopped');
    }

    this.state = 'recording';

    for (const key of _.keys(this.mocks)) {
      let mock = this.mocks[key];
      if (_.isBoolean(mock)) {
        mock = {};
      }

      if (mock.calls) {
        throw new Error('Mock has got calls defined - can not record');
      }

      const methodSpy = this.sandbox.spy(mock.obj, mock.method);

      this.recordingMocks[key] = {
        methodSpy,
        ...mock
      };
    }
  }

  play(params: {calls: any}) {
    if (this.state !== 'stopped') {
      throw new Error('Not stopped');
    }

    this.state = 'playing';

    const currentMockNames = _.keys(this.mocks);
    const callMockNames = _.keys(params.calls);

    const notRecordedMocks = _.difference(callMockNames, currentMockNames);
    if (notRecordedMocks.length > 0) {
      throw new Error('There are no calls defined for: ' + notRecordedMocks.join(', '));
    }

    for (const key of currentMockNames) {
      if (!params.calls[key]) {
        throw new Error('No calls for mock: ' + key);
      }
      const mock = this.mocks[key];
      const callMock = params.calls[key];

      const methodMock = this.sandbox.stub(mock.obj, mock.method);

      for (const callIndex in callMock.calls) {
        const call = callMock.calls[callIndex];

        const mockCall = methodMock.onCall(parseInt(callIndex));

        if (call.error) {
          if (call.async) {
            mockCall.returns(new Promise((resolve, reject) => {
              //setTimeout is needed here otherwise "Unhandled rejection" event is fired
              setTimeout(() => reject(errio.fromObject(call.error)), 0);
            }));
          } else {
            mockCall.throws(errio.fromObject(call.error));
          }
        } else {
          if (call.async) {
            mockCall.returns(Promise.resolve(call.returnValue));
          } else {
            mockCall.returns(call.returnValue);
          }
        }
      }
    }
  }

  async stop() {
    if (this.state === 'stopped') {
      return;
    }

    //play - verify only
    if (this.state === 'playing') {
      this.sandbox.verifyAndRestore();
      this.state = 'stopped';
      return;
    }

    //rec - store spy data
    const mocks = {};

    for (const key of Object.keys(this.recordingMocks)) {
      const mock = this.recordingMocks[key];
      const exp = {
        calls: []
      };
      for (const call of mock.methodSpy.getCalls()) {
        let returnValue, error;
        if (call.exception) {
          error = errio.toObject(call.exception);
        }

        try {
          //can be rejected promise - that's why try/catch block here
          returnValue = await call.returnValue;
        } catch (e) {
          error = errio.toObject(e);
        }

        const callObj = {
          async: call.returnValue instanceof Promise,
          args: call.args,
          returnValue,
          error
        };

        exp.calls.push(callObj);
      }

      mocks[key] = exp;
    }

    this.sandbox.verifyAndRestore();

    return mocks;
  }
}

export default BbMocker;
