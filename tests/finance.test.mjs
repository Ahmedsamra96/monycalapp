import test from 'node:test';
import assert from 'node:assert/strict';
import { budgetBalanceChange, goldValue, liquid, netWorth, sumPeople, withoutGold, monthStatistics, toCSV } from '../lib/finance.ts';
const item = { id:'example-only',date:'2026-10-05T12:00:00.000Z',bank:300,ofii:200,redotpay:50,cash:30,people:[{id:'a',name:'A',entries:[{id:'1',amount:100},{id:'2',amount:25}]}],liabilities:[{id:'b',name:'B',entries:[{id:'3',amount:40}]}],gold:{grams:10,karat:24,pricePerGram:90},note:'test'};
test('financial assets, debts and gold are calculated independently',()=>{
 assert.equal(sumPeople(item.people),125);
 assert.equal(liquid(item),580);
 assert.equal(withoutGold(item),665);
 assert.equal(goldValue(item),900);
 assert.equal(netWorth(item),1565);
});
test('settling receivable between account and debt leaves net worth unchanged',()=>{
 const received={...item,cash:item.cash+60,people:[{...item.people[0],entries:[{id:'1',amount:40},{id:'2',amount:25}]}]};
 assert.equal(netWorth(received),netWorth(item));
});
test('settling a payable between account and debt leaves net worth unchanged',()=>{
 const paid={...item,cash:item.cash-20,liabilities:[{...item.liabilities[0],entries:[{id:'3',amount:20}]}]};
 assert.equal(netWorth(paid),netWorth(item));
});
test('monthly deltas exclude gold price changes',()=>{
 const next={...item,id:'new',date:'2026-10-08T12:00:00.000Z',gold:{...item.gold,pricePerGram:95},bank:270};
 const result=monthStatistics([item,next],'2026-10');
 assert.equal(result?.spent,30);
 assert.equal(result?.received,0);
});
test('CSV exports expected columns without external requests',()=>{
 const csv=toCSV([item]);
 assert.match(csv,/Redotpay/);assert.match(csv,/1565/);
});

test('adding or removing debts alone changes net worth but not budget spending or income',()=>{
 const addReceivable={...item,id:'receivable',date:'2026-10-06T12:00:00.000Z',people:[{...item.people[0],entries:[{id:'1',amount:175},{id:'2',amount:25}]}]};
 const addPayable={...addReceivable,id:'payable',date:'2026-10-07T12:00:00.000Z',liabilities:[{...item.liabilities[0],entries:[{id:'3',amount:95}]}]};
 const removePayable={...addPayable,id:'less-payable',date:'2026-10-08T12:00:00.000Z',liabilities:item.liabilities};
 assert.equal(withoutGold(addReceivable)-withoutGold(item),75);
 assert.equal(withoutGold(addPayable)-withoutGold(addReceivable),-55);
 assert.equal(budgetBalanceChange(item,addReceivable),0);
 assert.equal(budgetBalanceChange(addReceivable,addPayable),0);
 assert.equal(budgetBalanceChange(addPayable,removePayable),0);
 assert.equal(monthStatistics([item,addReceivable,addPayable,removePayable],'2026-10')?.spent,0);
 assert.equal(monthStatistics([item,addReceivable,addPayable,removePayable],'2026-10')?.received,0);
});
test('loan transfers and repayments are excluded from spending and income',()=>{
 const receivablePaid={...item,id:'collected',date:'2026-10-06T12:00:00.000Z',bank:item.bank+60,people:[{...item.people[0],entries:[{id:'1',amount:40},{id:'2',amount:25}]}]};
 const payablePaid={...item,id:'paid',date:'2026-10-06T12:00:00.000Z',bank:item.bank-20,liabilities:[{...item.liabilities[0],entries:[{id:'3',amount:20}]}]};
 const loanGiven={...item,id:'loan',date:'2026-10-06T12:00:00.000Z',bank:item.bank-50,people:[{...item.people[0],entries:[{id:'1',amount:150},{id:'2',amount:25}]}]};
 const loanTaken={...item,id:'borrow',date:'2026-10-06T12:00:00.000Z',bank:item.bank+35,liabilities:[{...item.liabilities[0],entries:[{id:'3',amount:75}]}]};
 for(const after of [receivablePaid,payablePaid,loanGiven,loanTaken]){
   assert.equal(budgetBalanceChange(item,after),0);
   assert.equal(withoutGold(after),withoutGold(item));
 }
});
test('real expenses and income remain counted when mixed with debt settlements',()=>{
 const paidAndSpent={...item,id:'paid-spent',date:'2026-10-06T12:00:00.000Z',bank:item.bank-30,liabilities:[{...item.liabilities[0],entries:[{id:'3',amount:20}]}]};
 const collectedAndIncome={...item,id:'collected-income',date:'2026-10-06T12:00:00.000Z',bank:item.bank+65,people:[{...item.people[0],entries:[{id:'1',amount:40},{id:'2',amount:25}]}]};
 assert.equal(budgetBalanceChange(item,paidAndSpent),-10);
 assert.equal(budgetBalanceChange(item,collectedAndIncome),5);
 assert.equal(monthStatistics([item,paidAndSpent],'2026-10')?.spent,10);
 assert.equal(monthStatistics([item,collectedAndIncome],'2026-10')?.received,5);
});
test('first reading of a month compares with the preceding month for budget calculations',()=>{
 const prior={...item,date:'2026-09-30T20:00:00.000Z'};
 const current={...item,id:'this-month',date:'2026-10-01T08:00:00.000Z',cash:item.cash-15};
 assert.equal(monthStatistics([prior,current],'2026-10')?.spent,15);
});
