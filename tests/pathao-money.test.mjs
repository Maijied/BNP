import {test} from 'node:test';import assert from 'node:assert/strict';
import {bdtMinor} from '../services/pathao-api/src/money.js';
test('provider money converts exactly without double discount or binary rounding',()=>{
 for(const [value,expected] of [[0,0],[0.01,1],[0.29,29],[65.1,6510],[65.99,6599],[5000,500000]])assert.equal(bdtMinor(value),expected);
 for(const invalid of [-1,NaN,Infinity,'10.00',1.001,1e20,0.1+0.2])assert.throws(()=>bdtMinor(invalid));
 const quote={price:100,discount:15,final_price:85};assert.equal(bdtMinor(quote.final_price),8500);assert.equal(quote.final_price,85);
});
