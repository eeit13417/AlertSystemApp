// backend/test/example_test.js
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.CRON_SCHEDULE = '*/5 * * * *'; // Cron schedule for testing

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const mongoose = require('mongoose');

// Try to be compatible with different project path naming
let Admin, Stock, mailer, cron;
try { Admin = require('../models/Admin'); } catch { Admin = require('../models/Admin'); }
try { Stock = require('../models/Stock'); } catch { Stock = require('../models/Stock'); }
try { mailer = require('../utils/mailer'); } catch { mailer = require('../utils/mailer'); }
try { cron = require('node-cron'); } catch { cron = { schedule: () => ({}) }; }

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Controllers / Jobs / App
const authCtrl = require('../controllers/authController');
const stockCtrl = require('../controllers/stockController');
const { startLowStockCron, runLowStockNotify } = require('../jobs/lowStockCron');
const app = require('../server'); // server.js has module.exports = app

// Make find(...) chainable with .lean()
const asLean = (data) => ({ lean: sinon.stub().resolves(data) });
const asLeanReject = (err) => ({ lean: sinon.stub().rejects(err) });

/* -------------------------- Auth Controller -------------------------- */
describe('Auth Controller', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => sandbox.restore());

  it('registerAdmin: success registration', async () => {
    const req = { body: { name: 'A', email: 'a@a.com', password: '1234', role: 'admin' } };
    const res = { status: sandbox.stub().returnsThis(), json: sandbox.spy() };

    sandbox.stub(Admin, 'findOne').resolves(null);
    sandbox.stub(Admin, 'create').resolves({ id: 'uid1', name: 'A', email: 'a@a.com', role: 'admin' });
    sandbox.stub(jwt, 'sign').returns('tok123');

    await authCtrl.registerAdmin(req, res);

    expect(res.status.calledWith(201)).to.be.true;
    const body = res.json.firstCall.args[0];
    expect(body).to.include({ id: 'uid1', name: 'A', email: 'a@a.com', role: 'admin' });
    expect(body.token).to.equal('tok123');
  });

  it('registerAdmin: email already exists -> 400', async () => {
    const req = { body: { name: 'A', email: 'a@a.com', password: '1234' } };
    const res = { status: sandbox.stub().returnsThis(), json: sandbox.spy() };
    sandbox.stub(Admin, 'findOne').resolves({ id: 'exist' });

    await authCtrl.registerAdmin(req, res);
    expect(res.status.calledWith(400)).to.be.true;
    expect(res.json.calledWithMatch({ message: 'Admin already exists' })).to.be.true;
  });

  it('loginAdmin: successful login', async () => {
    const req = { body: { email: 'a@a.com', password: '1234' } };
    const res = { status: sandbox.stub().returnsThis(), json: sandbox.spy() };

    sandbox.stub(Admin, 'findOne').resolves({ id: 'uid1', name: 'A', email: 'a@a.com', password: 'hashed', role: 'admin' });
    sandbox.stub(bcrypt, 'compare').resolves(true);
    sandbox.stub(jwt, 'sign').returns('tok123');

    await authCtrl.loginAdmin(req, res);
    expect(res.status.called).to.be.false;
    expect(res.json.firstCall.args[0].token).to.equal('tok123');
  });

  it('loginAdmin: wrong password -> 401', async () => {
    const req = { body: { email: 'a@a.com', password: 'wrong' } };
    const res = { status: sandbox.stub().returnsThis(), json: sandbox.spy() };

    sandbox.stub(Admin, 'findOne').resolves({ id: 'uid1', email: 'a@a.com', password: 'hashed', role: 'admin' });
    sandbox.stub(bcrypt, 'compare').resolves(false);

    await authCtrl.loginAdmin(req, res);
    expect(res.status.calledWith(401)).to.be.true;
    expect(res.json.calledWithMatch({ message: 'Invalid email or password' })).to.be.true;
  });

  it('getadmin: retrieve own data', async () => {
    const req = { admin: { id: 'me' } };
    const res = { status: sandbox.stub().returnsThis(), json: sandbox.spy() };

    sandbox.stub(Admin, 'findById').resolves({
      id: 'me', name: 'Me', email: 'me@x.com', password: 'p', notification: true, role: 'admin'
    });

    await authCtrl.getadmin(req, res);
    expect(res.status.calledWith(200)).to.be.true;
    const body = res.json.firstCall.args[0];
    expect(body).to.include({ name: 'Me', email: 'me@x.com', notification: true, role: 'admin' });
  });

  it('getAdmins: return active admin list', async () => {
    const req = {};
    const res = { status: sandbox.stub().returnsThis(), json: sandbox.spy() };

    sandbox.stub(Admin, 'find').resolves([{ id: 1 }, { id: 2 }]);
    await authCtrl.getAdmins(req, res);

    expect(res.json.calledWithMatch([{ id: 1 }, { id: 2 }])).to.be.true;
  });

  it('updateAdmin: regular admin updates own email/notification settings', async () => {
    const me = { id: 'me', role: 'admin' };
    const target = {
      id: 'me', name: 'Me', email: 'old@x.com', notification: false, role: 'admin',
      save: sandbox.stub().resolvesThis()
    };
    const req = { admin: { id: 'me' }, body: { email: 'new@x.com', notification: true } };
    const res = { status: sandbox.stub().returnsThis(), json: sandbox.spy() };

    sandbox.stub(Admin, 'findById')
      .onFirstCall().resolves(me)
      .onSecondCall().resolves(target);

    await authCtrl.updateAdmin(req, res);

    expect(target.email).to.equal('new@x.com');
    expect(target.notification).to.equal(true);
    expect(target.save.calledOnce).to.be.true;
    const body = res.json.firstCall.args[0];
    expect(body.token).to.be.a('string');
  });

  it('updateAdmin: super admin updates other user’s role/status (ensure at least one super)', async () => {
    const me = { id: 'super1', role: 'super' };
    const target = {
      id: 'user2', role: 'admin', status: 1, email: 'u@x.com',
      save: sandbox.stub().resolvesThis()
    };
    const req = { admin: { id: 'super1' }, body: { id: 'user2', role: 'admin', status: 1 } };
    const res = { status: sandbox.stub().returnsThis(), json: sandbox.spy() };

    sandbox.stub(Admin, 'findById')
      .onFirstCall().resolves(me)
      .onSecondCall().resolves(target);
    sandbox.stub(Admin, 'countDocuments').resolves(2);

    await authCtrl.updateAdmin(req, res);

    expect(target.role).to.equal('admin');
    expect(target.status).to.equal(1);
    expect(target.save.calledOnce).to.be.true;
  });

  it('updateAdmin: attempt to demote last super admin -> 400', async () => {
    const me = { id: 'super1', role: 'super' };
    const target = { id: 'super1', role: 'super', status: 1, save: sandbox.stub().resolvesThis() };
    const req = { admin: { id: 'super1' }, body: { id: 'super1', role: 'admin' } };
    const res = { status: sandbox.stub().returnsThis(), json: sandbox.spy() };

    sandbox.stub(Admin, 'findById')
      .onFirstCall().resolves(me)
      .onSecondCall().resolves(target);
    sandbox.stub(Admin, 'countDocuments').resolves(1); // Only one super admin left

    await authCtrl.updateAdmin(req, res);
    expect(res.status.calledWith(400)).to.be.true;
    expect(res.json.calledWithMatch({ message: 'At least one super admin is required' })).to.be.true;
  });
});

/* ------------------------- Stock Controller -------------------------- */
describe('Stock Controller', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => sandbox.restore());

  it('getStocks: return list with status=1', async () => {
    const req = {};
    const res = { status: sandbox.stub().returnsThis(), json: sandbox.spy() };

    const fake = [{ id: 1 }, { id: 2 }];
    sandbox.stub(Stock, 'find').withArgs({ status: 1 }).resolves(fake);

    await stockCtrl.getStocks(req, res);
    expect(res.json.calledWith(fake)).to.be.true;
  });

  it('checkLowStock: return items with quantity < 10', async () => {
    const req = {};
    const res = { status: sandbox.stub().returnsThis(), json: sandbox.spy() };

    const low = [{ title: 'A', quantity: 3 }];
    sandbox.stub(Stock, 'find')
      .withArgs({ status: 1, quantity: { $lt: 10 } })
      .resolves(low);

    await stockCtrl.checkLowStock(req, res);
    expect(res.json.calledWith(low)).to.be.true;
  });

  it('addStock: create with req.admin.id', async () => {
    const req = {
      admin: { id: 'me' },
      body: { title: 'N', quantity: 5, createDate: new Date(), status: 1, updateDate: new Date() }
    };
    const res = { status: sandbox.stub().returnsThis(), json: sandbox.spy() };

    const created = { id: 'sid', ...req.body, managerId: 'me' };
    sandbox.stub(Stock, 'create').resolves(created);

    await stockCtrl.addStock(req, res);
    expect(res.status.calledWith(201)).to.be.true;
    expect(res.json.calledWith(created)).to.be.true;
  });

  it('updateStock: successful update', async () => {
    const id = new mongoose.Types.ObjectId().toString();
    const stock = {
      _id: id,
      title: 'Old', quantity: 1, createDate: new Date(), status: 1, updateDate: new Date(), managerId: 'me',
      save: sandbox.stub().resolvesThis()
    };

    const req = { admin: { id: 'adminX' }, params: { id }, body: { title: 'New', quantity: 9, status: 1 } };
    const res = { status: sandbox.stub().returnsThis(), json: sandbox.spy() };

    sandbox.stub(Stock, 'findById').withArgs(id).resolves(stock);

    await stockCtrl.updateStock(req, res);
    expect(stock.title).to.equal('New');
    expect(stock.quantity).to.equal(9);
    expect(stock.managerId).to.equal('adminX');
    expect(stock.save.calledOnce).to.be.true;
  });

  it('updateStock: not found -> 404', async () => {
    const id = new mongoose.Types.ObjectId().toString();
    const req = { admin: { id: 'a' }, params: { id }, body: {} };
    const res = { status: sandbox.stub().returnsThis(), json: sandbox.spy() };

    sandbox.stub(Stock, 'findById').withArgs(id).resolves(null);

    await stockCtrl.updateStock(req, res);
    expect(res.status.calledWith(404)).to.be.true;
    expect(res.json.calledWithMatch({ message: 'Task not found' })).to.be.true;
  });
});

/* --------------------------- Jobs: lowStock -------------------------- */
describe('Jobs: lowStockCron', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => sandbox.restore());

  it('runLowStockNotify: send email normally (once per recipient)', async function () {
    this.timeout(5000);

    const nodemailer = require('nodemailer');

    try { delete require.cache[require.resolve('../jobs/lowStockCron')]; } catch {}
    try { delete require.cache[require.resolve('../utils/mailer')]; } catch {}

    const fakeTransport = { sendMail: sandbox.stub().resolves() };
    sandbox.stub(nodemailer, 'createTransport').returns(fakeTransport);

    const Stock = require('../models/Stock');
    const Admin = require('../models/Admin');
    sandbox.stub(Stock, 'find').returns(asLean([
      { title: 'A', quantity: 3 },
      { title: 'B', quantity: 2 },
    ]));
    sandbox.stub(Admin, 'find').returns(asLean([
      { email: 'u1@x.com', name: 'U1' },
      { email: 'u2@x.com', name: 'U2' },
    ]));

    const { runLowStockNotify } = require('../jobs/lowStockCron');

    await runLowStockNotify();

    expect(fakeTransport.sendMail.callCount).to.equal(2);

    try { delete require.cache[require.resolve('../jobs/lowStockCron')]; } catch {}
    try { delete require.cache[require.resolve('../utils/mailer')]; } catch {}
  });

});

/* ----------------------------- Route -------------------------------- */
describe('Route: POST /api/stock/notify-now', () => {
  const sandbox = sinon.createSandbox();
  const request = require('supertest');

  afterEach(() => sandbox.restore());

  it('responds with ok:true successfully', async () => {
    sandbox.stub(Stock, 'find').returns(asLean([]));
    sandbox.stub(Admin, 'find').returns(asLean([]));
    sandbox.stub(mailer, 'sendLowStockEmail').resolves();

    const res = await request(app).post('/api/stock/notify-now').send({});
    expect(res.status).to.equal(200);
    expect(res.body.ok).to.equal(true);
  });

  it('error occurs -> 500', async () => {
    sandbox.stub(Stock, 'find').returns(asLeanReject(new Error('boom')));

    const res = await request(app).post('/api/stock/notify-now').send({});
    expect(res.status).to.equal(500);
    expect(res.body.ok).to.equal(false);
    expect(res.body.error).to.equal('boom');
  });
});
