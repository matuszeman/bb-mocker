import {BbMocker} from '../src/services/bb-mocker';
import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';

beforeEach(function() {
  const mocker = new BbMocker();
  this.mocker = mocker;

  this.mock = (mocks: any, options?: {mode?: string}) => {
    mocker.mock({mocks});

    const mode = _.get(options, 'mode', 'replay');
    if (mode === 'replay') {
      this.setupMocks();
    } else if (mode === 'update') {
      this.setupSpies();
    } else {
      throw new Error('Invalid setup mode: ' + mode + ', valid: update, replay');
    }
  };

  const currentTest = this.currentTest;

  this.setupMocks = () => {
    const calls = getCalls(currentTest.file, currentTest.fullTitle());
    mocker.setupMocks({
      calls
    });
  };

  this.setupSpies = () => {
    mocker.setupSpies();
  };
});

afterEach(async function() {
  const calls = await this.mocker.teardown();
  if (calls) {
    mergeFile({
      file: getFilePath(this.currentTest.file),
      key: this.currentTest.fullTitle(),
      calls
    });
  }
});

afterEach(function() {
  this.mocker.restore();
});

function mergeFile(params: {file: string, calls: any, key: string}) {
  const fileContent = readFile(params.file);

  let testMocks = _.get(fileContent, `${params.key}.mocks`, {});
  testMocks = _.defaults(params.calls, testMocks);

  fileContent[params.key] = {
    updatedAt: new Date().toUTCString(),
    calls: testMocks
  };

  fs.writeFileSync(params.file, JSON.stringify(fileContent, null, 2));
}

function getFilePath(filename) {
  const parseFile = path.parse(filename);
  return [parseFile.dir, `${parseFile.name}.mocker.json`].join(path.sep);
}

function readFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

function getCalls(filename, key) {
  const fileContent = readFile(getFilePath(filename));
  const testContent = fileContent[key];
  if (!testContent) {
    return {};
  }
  return testContent.calls;
}
