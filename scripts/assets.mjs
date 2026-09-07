import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
await mkdir('public/fonts',{recursive:true});
for(const subset of ['latin','cyrillic']) await copyFile(`node_modules/@fontsource-variable/manrope/files/manrope-${subset}-wght-normal.woff2`,`public/fonts/manrope-${subset}-wght-normal.woff2`);
await copyFile('node_modules/@fontsource-variable/manrope/LICENSE','public/fonts/LICENSE.txt');
await mkdir('assets',{recursive:true});
console.log('Fonts ready; generated cover preserved.');