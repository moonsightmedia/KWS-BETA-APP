import { chromium } from 'playwright';
import { mkdir,writeFile } from 'node:fs/promises';
const output='test-results/optional-beta-20261014';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:375,height:812}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto('https://beta.kletterwelt-sauerland.de/guest',{waitUntil:'domcontentloaded'});
 await page.getByText(/Gastansicht.*aktuelle Boulder/).waitFor({timeout:45000});
 const close=page.locator('[role="dialog"] button').filter({has:page.locator('svg.lucide-x')});
 if(await close.count())await close.first().click();
 await page.screenshot({path:`${output}/live-guest-375.png`});
 const overview=await page.getByText(/Gastansicht.*aktuelle Boulder/).textContent();
 const report={status:response.status(),overview,errors,checkedAt:new Date().toISOString(),writesPerformed:false};
 console.log(JSON.stringify(report));await writeFile(`${output}/live-guest-report.json`,JSON.stringify(report,null,2));
}finally{await browser.close();}
