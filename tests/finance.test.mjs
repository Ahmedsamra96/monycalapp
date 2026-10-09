import test from 'node:test';
import assert from 'node:assert/strict';
import { goldValue, liquid, netWorth, sumPeople, withoutGold, monthStatistics, toCSV } from '../lib/finance.ts';
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
