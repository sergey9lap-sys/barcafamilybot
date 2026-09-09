import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve('public');
http.createServer(async(req,res)=>{
 try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+sep)||path.split('/').some(p=>p.startsWith('.')))throw new Error('not found');const body=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.json':'application/json'})[extname(file)]||'application/octet-stream');res.end(body);}catch{res.statusCode=404;res.end('Not found');}
}).listen(3190,'127.0.0.1',()=>console.log('Design preview: http://127.0.0.1:3190/?preview=1 (local only, illustrative data)'));
