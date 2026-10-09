import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
// The tests can run even before dependency installation using the system TypeScript compiler.
const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const source = readFileSync(resolve('lib/finance.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const f = await import(`data:text/javascript,${encodeURIComponent(outputText)}`);
const person = (name, amount) => ({id:name,name,entries:[{id:name+'-1',amount}]});
const snap = (id, date, bank, cash, price, people=[],liabilities=[])=>({id,date,bank,ofii:100,redotpay:0,cash,people,liabilities,gold:{grams:10,karat:24,pricePerGram:price}});
test('net worth: assets + receivables - liabilities + gold',()=>{
 const s=snap('1','2026-10-01T12:00:00Z',1000,200,100,[person('a',80)],[person('b',30)]);
 assert.equal(f.liquid(s),1300);
 assert.equal(f.withoutGold(s),1350);
 assert.equal(f.goldValue(s),1000);
 assert.equal(f.netWorth(s),2350);
});
test('settling receivable into cash does not alter net worth',()=>{
 const old=snap('1','2026-10-01T12:00:00Z',100,100,99,[person('a',60)]);
 const updated={...old,cash:160,people:[]};
 assert.equal(f.withoutGold(old),f.withoutGold(updated));
});
test('paying liability from cash does not alter net worth',()=>{
 const old=snap('1','2026-10-01T12:00:00Z',1000,300,99,[],[person('a',50)]);
 const updated={...old,cash:250,liabilities:[]};
 assert.equal(f.withoutGold(old),f.withoutGold(updated));
});
test('expenses exclude gold valuation changes',()=>{
 const a=snap('a','2026-10-01T12:00:00Z',1000,200,100);
 const b=snap('b','2026-10-02T12:00:00Z',980,200,200);
 assert.equal(f.monthStatistics([b,a],'2026-10')?.spent,20);
 assert.equal(f.monthStatistics([b,a],'2026-10')?.net,-20);
 assert.equal(f.netWorth(b)-f.netWorth(a),980);
});
test('CSV retains all money fields and dates',()=>{
 const s=snap('a','2026-10-01T12:00:00Z',34.5,2.2,100);
 const csv=f.toCSV([s]);
 assert(csv.startsWith('\uFEFF'));
 assert(csv.includes('2026-10-01T12:00:00Z'));
 assert(csv.includes('34.5'));
});
