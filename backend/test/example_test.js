// backend/test/example_test.js
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.CRON_SCHEDULE = '*/5 * * * *'; // 測試排程用

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const mongoose = require('mongoose');

// 嘗試相容不同專案路徑命名
let Admin, Stock, mailer, cron;
try { Admin = require('../models/admin'); } catch { Admin = require('../models/Admin'); }
try { Stock = require('../models/Stock'); } catch { Stock = require('../models/Stock'); }
try { mailer = require('../utils/mailer'); } catch { mailer = require('../mailer'); }
try { cron = require('node-cron'); } catch { cron = { schedule: () => ({}) }; }

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Controllers / Jobs / App
const authCtrl = require('../controllers/authController');
const stockCtrl = require('../controllers/stockController');
const { startLowStockCron, runLowStockNotify } = require('../jobs/lowStockCron');
const app = require('../server'); // server.js 有 module.exports = app

// 讓 find(...) 可以接 .lean()
const asLean = (data) => ({ lean: sinon.stub().resolves(data) });
const asLeanReject = (err) => ({ lean: sinon.stub().rejects(err) });

/* -------------------------- Auth Controller -------------------------- */
describe('Auth Controller', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => sandbox.restore());

  it('registerAdmin: 成功註冊', async () => {
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

  it('registerAdmin: email 已存在 -> 400', async () => {
    const req = { body: { name: 'A', email: 'a@a.com', password: '1234' } };
    const res = { status: sandbox.stub().returnsThis(), json: sandbox.spy() };
    sandbox.stub(Admin, 'findOne').resolves({ id: 'exist' });

    await authCtrl.registerAdmin(req, res);
    expect(res.status.calledWith(400)).to.be.true;
    expect(res.json.calledWithMatch({ message: 'Admin already exists' })).to.be.true;
  });

  it('loginAdmin: 成功登入', async () => {
    const req = { body: { email: 'a@a.com', password: '1234' } };
    const res = { status: sandbox.stub().returnsThis(), json: sandbox.spy() };

    sandbox.stub(Admin, 'findOne').resolves({ id: 'uid1', name: 'A', email: 'a@a.com', password: 'hashed', role: 'admin' });
    sandbox.stub(bcrypt, 'compare').resolves(true);
    sandbox.stub(jwt, 'sign').returns('tok123');

    await authCtrl.loginAdmin(req, res);
    expect(res.status.called).to.be.false;
    expect(res.json.firstCall.args[0].token).to.equal('tok123');
  });

  it('loginAdmin: 密碼錯誤 -> 401', async () => {
    const req = { body: { email: 'a@a.com', password: 'wrong' } };
    const res = { status: sandbox.stub().returnsThis(), json: sandbox.spy() };

    sandbox.stub(Admin, 'findOne').resolves({ id: 'uid1', email: 'a@a.com', password: 'hashed', role: 'admin' });
    sandbox.stub(bcrypt, 'compare').resolves(false);

    await authCtrl.loginAdmin(req, res);
    expect(res.status.calledWith(401)).to.be.true;
    expect(res.json.calledWithMatch({ message: 'Invalid email or password' })).to.be.true;
  });

  it('getadmin: 取得自己的資料', async () => {
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

  it('getAdmins: 回傳啟用中的管理員列表', async () => {
    const req = {};
    const res = { status: sandbox.stub().returnsThis(), json: sandbox.spy() };

    sandbox.stub(Admin, 'find').resolves([{ id: 1 }, { id: 2 }]);
    await authCtrl.getAdmins(req, res);

    expect(res.json.calledWithMatch([{ id: 1 }, { id: 2 }])).to.be.true;
  });

  it('updateAdmin: 一般 admin 更新自己的 email/通知設定', async () => {
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
    expect(body.token).to.be.a('string'); // 自己更新會發新 token
  });

  it('updateAdmin: super admin 更新他人之 role/status（保證至少一位 super）', async () => {
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

  it('updateAdmin: 嘗試把最後一位 super 降為 admin -> 400', async () => {
    // 重點：這裡改測「降權 role」，不是改 status，確保命中現有邏輯
    const me = { id: 'super1', role: 'super' };
    const target = { id: 'super1', role: 'super', status: 1, save: sandbox.stub().resolvesThis() };
    const req = { admin: { id: 'super1' }, body: { id: 'super1', role: 'admin' } };
    const res = { status: sandbox.stub().returnsThis(), json: sandbox.spy() };

    sandbox.stub(Admin, 'findById')
      .onFirstCall().resolves(me)
      .onSecondCall().resolves(target);
    sandbox.stub(Admin, 'countDocuments').resolves(1); // 僅剩 1 位 super

    await authCtrl.updateAdmin(req, res);
    expect(res.status.calledWith(400)).to.be.true;
    expect(res.json.calledWithMatch({ message: 'At least one super admin is required' })).to.be.true;
  });
});

/* ------------------------- Stock Controller -------------------------- */
describe('Stock Controller', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => sandbox.restore());

  it('getStocks: 回傳 status=1 列表', async () => {
    const req = {};
    const res = { status: sandbox.stub().returnsThis(), json: sandbox.spy() };

    const fake = [{ id: 1 }, { id: 2 }];
    sandbox.stub(Stock, 'find').withArgs({ status: 1 }).resolves(fake);

    await stockCtrl.getStocks(req, res);
    expect(res.json.calledWith(fake)).to.be.true;
  });

  it('checkLowStock: 回傳 <10 的品項', async () => {
    const req = {};
    const res = { status: sandbox.stub().returnsThis(), json: sandbox.spy() };

    const low = [{ title: 'A', quantity: 3 }];
    sandbox.stub(Stock, 'find')
      .withArgs({ status: 1, quantity: { $lt: 10 } })
      .resolves(low);

    await stockCtrl.checkLowStock(req, res);
    expect(res.json.calledWith(low)).to.be.true;
  });

  it('addStock: 以 req.admin.id 建立', async () => {
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

  it('updateStock: 成功更新', async () => {
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

  it('updateStock: 找不到 -> 404', async () => {
    const id = new mongoose.Types.ObjectId().toString();
    const req = { admin: { id: 'a' }, params: { id }, body: {} };
    const res = { status: sandbox.stub().returnsThis(), json: sandbox.spy() };

    sandbox.stub(Stock, 'findById').withArgs(id).resolves(null);

    await stockCtrl.updateStock(req, res);
    expect(res.status.calledWith(404)).to.be.true;
    expect(res.json.calledWithMatch({ message: 'Task not found' })).to.be.true; // 與原程式訊息一致
  });
});

/* --------------------------- Jobs: lowStock -------------------------- */
describe('Jobs: lowStockCron', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => sandbox.restore());

    it('runLowStockNotify: 正常寄信（每位收件者一次）', async function () {
  this.timeout(5000); // 保險，理論上用不到

  const nodemailer = require('nodemailer');

  // 先清除快取，等等重新載入時會用到我們 stub 過的 nodemailer
  try { delete require.cache[require.resolve('../jobs/lowStockCron')]; } catch {}
  try { delete require.cache[require.resolve('../utils/mailer')]; } catch {}

  // 用同一個 sandbox（外層已建立）來 stub
  const fakeTransport = { sendMail: sandbox.stub().resolves() };
  sandbox.stub(nodemailer, 'createTransport').returns(fakeTransport);

  // 先準備 Model 的回傳，再載入 job（載入時 mailer 會用假的 transporter）
  const Stock = require('../models/Stock');
  const Admin = require('../models/admin');
  sandbox.stub(Stock, 'find').returns(asLean([
    { title: 'A', quantity: 3 },
    { title: 'B', quantity: 2 },
  ]));
  sandbox.stub(Admin, 'find').returns(asLean([
    { email: 'u1@x.com', name: 'U1' },
    { email: 'u2@x.com', name: 'U2' },
  ]));

  // 重新載入 job，讓它抓到 stub 過的 mailer / nodemailer
  const { runLowStockNotify } = require('../jobs/lowStockCron');

  await runLowStockNotify();

  // 檢查真的「假寄信」了兩次
  expect(fakeTransport.sendMail.callCount).to.equal(2);

  // 清理：避免影響後續測例（外層 afterEach 也會 restore）
  try { delete require.cache[require.resolve('../jobs/lowStockCron')]; } catch {}
  try { delete require.cache[require.resolve('../utils/mailer')]; } catch {}
});

});

/* ----------------------------- Route -------------------------------- */
describe('Route: POST /api/stock/notify-now', () => {
  const sandbox = sinon.createSandbox();
  const request = require('supertest');

  afterEach(() => sandbox.restore());

  it('成功回應 ok:true', async () => {
    // 讓真正的 runLowStockNotify 跑起來也成功（找不到低庫存 → 不寄信 → 回 200）
    sandbox.stub(Stock, 'find').returns(asLean([]));
    sandbox.stub(Admin, 'find').returns(asLean([]));
    sandbox.stub(mailer, 'sendLowStockEmail').resolves();

    const res = await request(app).post('/api/stock/notify-now').send({});
    expect(res.status).to.equal(200);
    expect(res.body.ok).to.equal(true);
  });

  it('發生錯誤 -> 500', async () => {
    // 讓 find().lean() 直接 reject('boom')，控制錯誤訊息
    sandbox.stub(Stock, 'find').returns(asLeanReject(new Error('boom')));

    const res = await request(app).post('/api/stock/notify-now').send({});
    expect(res.status).to.equal(500);
    expect(res.body.ok).to.equal(false);
    expect(res.body.error).to.equal('boom');
  });
});
