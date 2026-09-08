import test from 'node:test';
import assert from 'node:assert/strict';
import {votingTime} from '../public/voting-time.js';
test('Deadline never implies voting is open after expiry',()=>{
 const end=Date.parse('2026-09-09T12:00:00Z'),m={state:'open',closes_at:new Date(end).toISOString()};
 assert.equal(votingTime(m,end-61000).label,'Осталось 2 мин');
 assert.equal(votingTime(m,end).closed,true);
 assert.equal(votingTime({...m,state:'closed'},end-3600000).closed,true);
 assert.ok(votingTime({state:'open',closes_at:null}).label.includes('срок пока не задан'));
});
