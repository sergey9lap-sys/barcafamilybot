import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(process.env.PLAYWRIGHT_PACKAGE_ROOT+'/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
await mkdir('.impeccable/review',{recursive:true});
const errors=[],checks=[];
try{
 for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});const page=await context.newPage();
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:3188/',{waitUntil:'networkidle'});await page.getByRole('heading',{name:'Оцени игроков'}).waitFor();await page.evaluate(()=>document.fonts.ready);
   const metrics=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth,rows:document.querySelectorAll('.player-row').length,font:document.fonts.check('700 16px Manrope')}));
   if(metrics.scroll>width)throw new Error(name+' horizontal overflow');if(metrics.rows!==16)throw new Error('Wrong player count');if(!metrics.font)throw new Error('Font did not load');
   await page.screenshot({path:`.impeccable/review/${name}.png`,fullPage:true});
   await page.screenshot({path:`.impeccable/review/${name}-viewport.png`});
   if(name==='mobile'){
     const buttons=page.locator('[data-player][data-score="5"]');
     for(let i=0;i<16;i++){await buttons.nth(i).click();await page.getByText('Сохранено',{exact:true}).waitFor();}
     await page.reload({waitUntil:'networkidle'});await page.getByRole('heading',{name:'Оцени игроков'}).waitFor();
     if(await page.locator('[aria-pressed="true"]').count()!==16)throw new Error('Saved scores did not survive reload');
     await page.getByRole('button',{name:'Отправить оценки'}).click();await page.getByRole('heading',{name:'Оценка команды'}).waitFor();
     await page.screenshot({path:'.impeccable/review/results.png',fullPage:true});
     await page.getByRole('button',{name:'Изменить оценки',exact:true}).click();await page.locator('[data-player="pedri"][data-score="3"]').click();await page.getByText('Сохранено',{exact:true}).waitFor();
     await page.getByRole('button',{name:'Сезон',exact:true}).click();await page.getByRole('heading',{name:'Пока нет результатов за сезон'}).waitFor();
     await page.getByRole('button',{name:'Посмотреть админку'}).click();await page.getByRole('heading',{name:'Управление матчами'}).waitFor();
     await page.screenshot({path:'.impeccable/review/admin.png',fullPage:true});
     await page.getByRole('button',{name:'+ Матч',exact:true}).click();await page.getByRole('heading',{name:'Новый матч'}).waitFor();
     await page.getByLabel('Соперник',{exact:true}).fill('Проверка интерфейса');await page.getByLabel('Счёт: соперник : Барса').fill('0:2');
     await page.getByRole('button',{name:'Создать и выбрать игроков'}).click();await page.getByRole('heading',{name:'Кто вышел на поле?'}).waitFor();
     await page.getByLabel('Педри',{exact:false}).check();await page.getByLabel('Ламин Ямаль',{exact:false}).check();await page.getByRole('button',{name:'Сохранить состав'}).click();await page.getByRole('heading',{name:'Управление матчами'}).waitFor();
     checks.push('16 votes, reload persistence, submission, results, edit, empty season, demo admin, create draft and select lineup');
   }
   checks.push(name+' responsive layout and locally loaded font');await context.close();
 }
 if(errors.length)throw new Error(errors.join('\n'));
 await writeFile('.impeccable/review/browser-check.json',JSON.stringify({passed:true,checks,errors},null,2));console.log(JSON.stringify({passed:true,checks,errors},null,2));
}finally{await browser.close();}
