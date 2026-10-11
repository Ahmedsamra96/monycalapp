import test from 'node:test';
import assert from 'node:assert/strict';
import { historyStatistics, snapshotChanges, withoutGold } from '../lib/finance.ts';
const p=(name,amount)=>({id:name,name,entries:[{id:name,amount}]});
const base={id:'old',date:'2026-10-05T12:00:00Z',bank:1000,ofii:100,redotpay:0,cash:200,people:[p('Ali',80)],liabilities:[p('Sara',60)],gold:{grams:10,karat:24,pricePerGram:100}};
test('source chips equal net change excluding gold and identify every affected balance',()=>{
  const newer={...base,id:'new',bank:956,ofii:97,cash:185,people:[p('Ali',95)],liabilities:[p('Sara',40)],gold:{...base.gold,pricePerGram:200}};
  const changes=snapshotChanges(base,newer);
  assert.deepEqual(changes.map(x=>[x.label,x.delta]),[['البنك',-44],['OFII',-3],['كاش',-15],['ديون لي',15],['ديون عليّ',20]]);
  assert.equal(changes.reduce((sum,x)=>sum+x.delta,0),withoutGold(newer)-withoutGold(base));
});
test('changing the gold price alone creates no spending/source chip',()=>{
  assert.deepEqual(snapshotChanges(base,{...base,gold:{...base.gold,pricePerGram:150}}),[]);
});

test('selected month totals include its first reading compared with the previous month',()=>{
  const september={...base,id:'september',date:'2026-09-30T12:00:00Z',bank:1050};
  const october1={...base,id:'october1',date:'2026-10-01T12:00:00Z',bank:1020};
  const october2={...base,id:'october2',date:'2026-10-04T12:00:00Z',bank:1040};
  const october3={...base,id:'october3',date:'2026-10-06T12:00:00Z',bank:1025};
  const records=[october3,september,october1,october2];
  assert.deepEqual(historyStatistics(records,'2026-10'),{count:3,spent:45});
  assert.deepEqual(historyStatistics(records,'all'),{count:4,spent:45});
  assert.deepEqual(historyStatistics(records,'2026-11'),{count:0,spent:0});
});
test('spending totals ignore gold price changes and count only negative net movement',()=>{
  const newer={...base,id:'new',date:'2026-10-07T12:00:00Z',gold:{...base.gold,pricePerGram:200},cash:base.cash+10};
  assert.deepEqual(historyStatistics([newer,base],'2026-10'),{count:2,spent:0});
});
