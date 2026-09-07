import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(process.env.PLAYWRIGHT_PACKAGE_ROOT+'/package.json'),{chromium}=require('playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'}),context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));let blocked=false,postCount=0;
try{
 await page.route('**/api/matches/*/votes',async route=>{postCount++;if(blocked){blocked=false;await route.abort();return;}await new Promise(r=>setTimeout(r,650));await route.continue();});
 await page.goto('http://127.0.0.1:3188/',{waitUntil:'networkidle'});await page.getByRole('heading',{name:'Оцени игроков',exact:true}).waitFor();
 const topBefore=await page.locator('#player-kounde').evaluate(e=>e.offsetTop);
 await page.locator('[data-player="garcia"][data-score="4"]').click();
 if(await page.locator('[data-player="kounde"][data-score="5"]').isDisabled())throw new Error('Next player locked during slow save');
 await page.locator('[data-player="kounde"][data-score="5"]').click();await page.locator('[data-player="cubarsi"][data-score="3"]').click();
 await page.getByText('Сохранено',{exact:true}).waitFor();
 const topAfter=await page.locator('#player-kounde').evaluate(e=>e.offsetTop);if(topAfter!==topBefore)throw new Error('Rating selection moved next row');
 await page.reload({waitUntil:'networkidle'});if(await page.locator('[aria-pressed="true"]').count()!==3)throw new Error('Rapid ratings lost');
 blocked=true;await page.locator('[data-player="pedri"][data-score="2"]').click();await page.getByRole('button',{name:'Сохранить мои изменения'}).waitFor();
 if(await page.locator('[data-player="pedri"][data-score="2"]').getAttribute('aria-pressed')!=='true')throw new Error('Failed selection hidden');
 await page.getByRole('button',{name:'Сохранить мои изменения'}).click();await page.getByText('Сохранено',{exact:true}).waitFor();
 await page.reload({waitUntil:'networkidle'});if(await page.locator('[data-player="pedri"][data-score="2"]').getAttribute('aria-pressed')!=='true')throw new Error('Retry failed');
 await page.getByRole('button',{name:'Посмотреть админку'}).click();await page.getByRole('heading',{name:'Управление матчами'}).waitFor();await page.getByRole('button',{name:'Тексты бота'}).click();await page.getByRole('heading',{name:'Тексты бота'}).waitFor();
 await page.screenshot({path:'.impeccable/review/content-editor.png',fullPage:true});
 if(errors.length)throw new Error(errors.join('\n'));const report={passed:true,checks:['650 ms latency without locking next player','rapid ratings persisted','zero row shift after selection','failed save preserves visible selection','explicit retry persists selection','admin text editor opens'],postCount,errors};await writeFile('.impeccable/review/slow-ui.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
