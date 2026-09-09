import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(process.env.PLAYWRIGHT_PACKAGE || 'C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
let checks=0;
try {
for(const width of [390,768,1440]) {
 const page=await browser.newPage({viewport:{width,height:900},timezoneId:'Europe/Moscow'});
 await page.route('http://qa.local/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/')return route.fulfill({contentType:'text/html',body:'<main id="content"></main>'});
  return route.fulfill({contentType:path.endsWith('.css')?'text/css':'text/javascript',body:await readFile('public'+path,'utf8')});
 });
 await page.goto('http://qa.local/');
 await page.evaluate(async()=>{
  window.ticks=[];window.setInterval=f=>{ticks.push(f);return 1;};window.calls=[];window.fail=false;window.errors=[];
  window.state={view:'ratings',matches:[{season:'2026/27'}]};
  const {community}=await import('/community.js');
  window.section=community({state,openMatch:()=>{},showError:e=>errors.push(e.message),api:async url=>{calls.push(url);if(fail)throw Object.assign(Error('Unexpected JSON'),{status:503});return {players:[],items:[],team:{average:null,total:0}};}});
  await section.render();
 });
 await page.locator('[name=period]').selectOption('month');
 await page.locator('[name=month]').fill('2024-02');
 await page.locator('button[type=submit]').click();
 let q=new URL('http://qa.local'+await page.evaluate(()=>calls.at(-1)));
 assert.equal(q.searchParams.get('from'),'2024-02-01');assert.equal(q.searchParams.get('to'),'2024-02-29');checks++;
 await page.locator('[data-ranktab=viewers]').click();
 q=new URL('http://qa.local'+await page.evaluate(()=>calls.at(-1)));
 assert.equal(q.pathname,'/leaderboard');assert.equal(q.searchParams.get('to'),'2024-02-29');checks++;
 await page.locator('[data-ranktab=players]').click();
 await page.locator('[name=month]').fill('2026-03');
 await page.locator('[name=month]').blur();
 const before=await page.evaluate(()=>calls.length);
 await page.evaluate(()=>ticks[0]());
 assert.equal(await page.evaluate(()=>calls.length),before);assert.equal(await page.locator('[name=month]').inputValue(),'2026-03');checks++;
 await page.locator('button[type=submit]').click();
 await page.evaluate(()=>{fail=true;});
 await page.locator('#refresh-ratings').click();
 await page.getByRole('heading',{name:'Не удалось загрузить данные'}).waitFor();
 assert.ok(!(await page.locator('body').innerText()).includes('Unexpected'));checks++;
 await page.evaluate(()=>{fail=false;});await page.locator('#retry-community').click();await page.locator('#refresh-ratings').waitFor();checks++;
 await page.clock.install({time:new Date('2026-09-08T21:30:00Z')});
 await page.locator('[name=period]').selectOption('30');
 q=new URL('http://qa.local'+await page.evaluate(()=>calls.at(-1)));
 assert.equal(q.searchParams.get('to'),'2026-09-09');assert.equal(q.searchParams.get('from'),'2026-08-11');checks++;
 await page.locator('[name=period]').selectOption('custom');await page.locator('[name=from]').fill('2026-09-10');await page.locator('[name=to]').fill('2026-09-01');
 const count=await page.evaluate(()=>calls.length);await page.locator('button[type=submit]').click();assert.equal(await page.evaluate(()=>calls.length),count);assert.match(await page.evaluate(()=>errors.at(-1)),/Дата начала/);checks++;
 await page.close();console.log(width+'px: 7 scenarios passed');
}
console.log(checks+' browser checks passed');
}finally{await browser.close();}
