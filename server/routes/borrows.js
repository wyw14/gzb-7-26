const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readJSON, writeJSON } = require('../utils/storage');

const router = express.Router();

router.get('/', (req, res) => {
  const borrows = readJSON('borrows.json', []);
  const instruments = readJSON('instruments.json', []);
  const users = readJSON('users.json', []);
  const reviews = readJSON('reviews.json', []);
  const { borrowerId, ownerId, status, currentUserId } = req.query;
  
  let result = borrows;
  
  if (borrowerId) {
    result = result.filter(b => b.borrowerId === borrowerId);
  }
  if (ownerId) {
    result = result.filter(b => b.ownerId === ownerId);
  }
  if (status) {
    result = result.filter(b => b.status === status);
  }
  
  const enriched = result.map(b => {
    const borrowerReviewed = reviews.some(r => 
      r.targetType === 'borrow' && 
      r.targetId === b.id && 
      r.reviewerId === b.borrowerId
    );
    const ownerReviewed = reviews.some(r => 
      r.targetType === 'borrow' && 
      r.targetId === b.id && 
      r.reviewerId === b.ownerId
    );
    
    let myReviewed = false;
    let canReviewOther = false;
    if (currentUserId) {
      if (currentUserId === b.borrowerId) {
        myReviewed = borrowerReviewed;
        canReviewOther = b.status === 'returned' && !borrowerReviewed;
      } else if (currentUserId === b.ownerId) {
        myReviewed = ownerReviewed;
        canReviewOther = b.status === 'returned' && !ownerReviewed;
      }
    }
    
    return {
      ...b,
      borrowerReviewed,
      ownerReviewed,
      myReviewed,
      canReviewOther,
      instrument: instruments.find(i => i.id === b.instrumentId) || null,
      borrower: users.find(u => u.id === b.borrowerId) || null,
      owner: users.find(u => u.id === b.ownerId) || null
    };
  });
  
  res.json(enriched);
});

router.get('/:id', (req, res) => {
  const borrows = readJSON('borrows.json', []);
  const instruments = readJSON('instruments.json', []);
  const users = readJSON('users.json', []);
  const borrow = borrows.find(b => b.id === req.params.id);
  
  if (!borrow) {
    return res.status(404).json({ error: '借用记录不存在' });
  }
  
  const result = {
    ...borrow,
    instrument: instruments.find(i => i.id === borrow.instrumentId) || null,
    borrower: users.find(u => u.id === borrow.borrowerId) || null,
    owner: users.find(u => u.id === borrow.ownerId) || null
  };
  
  res.json(result);
});

router.post('/preview', (req, res) => {
  const instruments = readJSON('instruments.json', []);
  const users = readJSON('users.json', []);
  
  const { instrumentId, borrowerId, ownerId, startDate, endDate, purpose, handoverLocation } = req.body;
  
  const instrument = instruments.find(i => i.id === instrumentId);
  const borrower = users.find(u => u.id === borrowerId);
  const owner = users.find(u => u.id === ownerId);
  
  if (!instrument || !borrower || !owner) {
    return res.status(400).json({ error: '参数不完整或无效' });
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  const feeTotal = days * instrument.dailyFee;
  const deposit = instrument.deposit;
  const totalAmount = deposit + feeTotal;
  
  const agreementText = `
乐器借用协议

甲方（出借人）：${owner.username}
联系电话：${owner.phone}
所在地：${owner.city}${owner.district}

乙方（借用人）：${borrower.username}
联系电话：${borrower.phone}
所在地：${borrower.city}${borrower.district}

根据《中华人民共和国民法典》及相关法律法规，甲乙双方在平等、自愿、公平的基础上，
就乐器借用事宜达成如下协议：

一、借用乐器
乐器名称：${instrument.name}
品牌型号：${instrument.brand} ${instrument.model}
乐器类别：${instrument.category}
成色状况：${instrument.condition}
参考价值：人民币 ${instrument.value} 元

二、借用期限
借用开始日期：${startDate}
借用结束日期：${endDate}
借用天数：共 ${days} 天

三、借用目的
${purpose || '个人练习使用'}

四、费用及押金
1. 日租金：人民币 ${instrument.dailyFee} 元/天
2. 租金总额：人民币 ${feeTotal} 元
3. 押金金额：人民币 ${deposit} 元
4. 合计金额：人民币 ${totalAmount} 元
5. 乙方应在借用前一次性支付押金及租金。
6. 借用期满，乐器完好归还后，押金无息退还乙方。

五、交接地点
交接地点：${handoverLocation || instrument.location}

六、双方权利与义务
（一）甲方权利与义务
1. 甲方保证对出借乐器享有合法的所有权或处分权。
2. 甲方应按约定时间、地点将乐器交付乙方使用。
3. 甲方有权监督乙方合理使用乐器。
4. 借用期满，甲方有权收回乐器。

（二）乙方权利与义务
1. 乙方应按约定支付押金及租金。
2. 乙方应妥善保管、合理使用借用乐器，不得转借、出租、抵押、出售或以其他方式处分乐器。
3. 乙方不得擅自改装、拆卸、损坏乐器。
4. 因乙方使用不当或保管不善造成乐器损坏、丢失的，乙方应承担赔偿责任。
5. 借用期满，乙方应按时、完好地将乐器归还甲方。

七、违约责任
1. 任何一方违反本协议约定，应承担相应的违约责任。
2. 乙方逾期归还乐器的，每逾期一日按日租金的两倍支付占用费。
3. 乙方造成乐器损坏的，应按实际损失赔偿。

八、争议解决
本协议履行过程中发生的争议，双方应协商解决；协商不成的，可向有管辖权的人民法院提起诉讼。

九、其他
1. 本协议自双方确认之日起生效。
2. 本协议一式两份，甲乙双方各执一份，具有同等法律效力。

甲方（出借人）：${owner.username}
乙方（借用人）：${borrower.username}
协议生成日期：${new Date().toLocaleDateString('zh-CN')}
  `.trim();
  
  res.json({
    success: true,
    agreement: agreementText,
    summary: {
      instrument: {
        id: instrument.id,
        name: instrument.name,
        image: instrument.image
      },
      borrower: {
        id: borrower.id,
        username: borrower.username,
        phone: borrower.phone
      },
      owner: {
        id: owner.id,
        username: owner.username,
        phone: owner.phone
      },
      startDate,
      endDate,
      days,
      deposit,
      feeTotal,
      totalAmount,
      handoverLocation: handoverLocation || instrument.location,
      purpose
    }
  });
});

router.post('/', (req, res) => {
  const borrows = readJSON('borrows.json', []);
  
  const newBorrow = {
    id: 'b' + uuidv4().slice(0, 8),
    ...req.body,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  borrows.push(newBorrow);
  writeJSON('borrows.json', borrows);
  
  res.json({ success: true, borrow: newBorrow });
});

router.put('/:id', (req, res) => {
  const borrows = readJSON('borrows.json', []);
  const instruments = readJSON('instruments.json', []);
  const idx = borrows.findIndex(b => b.id === req.params.id);
  
  if (idx === -1) {
    return res.status(404).json({ error: '借用记录不存在' });
  }
  
  const newStatus = req.body.status;
  const oldStatus = borrows[idx].status;
  
  borrows[idx] = { ...borrows[idx], ...req.body, id: borrows[idx].id };
  
  if (newStatus === 'confirmed' && oldStatus !== 'confirmed') {
    borrows[idx].confirmedAt = new Date().toISOString();
    borrows[idx].status = 'borrowing';
    const instIdx = instruments.findIndex(i => i.id === borrows[idx].instrumentId);
    if (instIdx !== -1) {
      instruments[instIdx].status = 'borrowed';
      writeJSON('instruments.json', instruments);
    }
  }
  
  if (newStatus === 'borrowing' && oldStatus === 'confirmed') {
    borrows[idx].status = 'borrowing';
  }
  
  if (newStatus === 'returned' && oldStatus !== 'returned') {
    borrows[idx].returnedAt = new Date().toISOString();
    borrows[idx].status = 'returned';
    const instIdx = instruments.findIndex(i => i.id === borrows[idx].instrumentId);
    if (instIdx !== -1) {
      instruments[instIdx].status = 'available';
      writeJSON('instruments.json', instruments);
    }
  }
  
  writeJSON('borrows.json', borrows);
  res.json({ success: true, borrow: borrows[idx] });
});

module.exports = router;
