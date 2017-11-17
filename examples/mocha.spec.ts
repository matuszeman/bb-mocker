import './init';

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);

const expect = chai.expect;

class UserRepository {
  users = [];
  async create(params: {name: string}) {
    const u = {
      id: Math.ceil(Math.random() * 100),
      name: params.name
    };
    this.users.push(u);

    console.log('Creating user...'); //XXX
    //await new Promise((resolve) => setTimeout(resolve, 500));
    console.log('...done'); //XXX

    return u;
  }

  async findByName(params: {name: string}) {
    return this.users.find((user) => user.name === params.name);
  }
}

class MailerService {
  async sendTemplate(params: {template: string, vars: object}) {
    console.log('Sending email...'); //XXX
    //await new Promise((resolve) => setTimeout(resolve, 500));
    console.log('... done'); //XXX
    return {
      sent: true
    }
  }
}

class UserService {
  constructor(protected mailerService: MailerService, protected userRepository: UserRepository) {
  }

  async register(params: {name: string}) {
    const user = await this.userRepository.findByName({name: params.name});
    if (user) {
      throw new Error('User exists');
    }

    const doc = await this.userRepository.create({
      name: params.name
    });

    await this.mailerService.sendTemplate({
      template: 'registration',
      vars: {
        id: doc.id,
        name: doc.name
      }
    });

    return {
      id: doc.id
    }
  }
}

describe('Example: userService', () => {
  let registeredUser;
  let userRepository: UserRepository, mailerService: MailerService, userService: UserService;

  beforeEach(async function() {
    userRepository = new UserRepository();
    mailerService = new MailerService();
    userService = new UserService(mailerService, userRepository);
  });

  beforeEach(async function() {
    this.mock({
      'mailerService.sendTemplate': {
        obj: mailerService,
        method: 'sendTemplate'
      },
      'userRepository.create': {
        obj: userRepository,
        method: 'create'
      },
      'userRepository.findByName': {
        obj: userRepository,
        method: 'findByName'
      }
    });

    //this.rec();
    this.play();

    registeredUser = await userService.register({
      name: 'registered'
    });
  });

  it('#register - registers user', async function() {
    const ret = await userService.register({
      name: 'buum'
    });
  });

  it('#register - throws when already registered with the same name', async function() {
    try {
      await userService.register({
        name: 'registered'
      });
      throw new Error('Does not throw');
    } catch (e) {
      if (e.message !== 'User exists') {
        throw e;
      }
    }
  });
});
