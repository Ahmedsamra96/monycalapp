import test from 'node:test';
import assert from 'node:assert/strict';
import { snapshotChanges, withoutGold } from '../lib/finance.ts';
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
