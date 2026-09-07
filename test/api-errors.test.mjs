import test from 'node:test';
import assert from 'node:assert/strict';
import {readApiResponse,userMessage} from '../public/api-errors.js';
test('Plain text and HTML failures never expose parser errors',async()=>{
 for(const body of ['Please retry','<html>Bad Gateway</html>'])await assert.rejects(readApiResponse(new Response(body,{status:503})),{message:'Сервис временно недоступен. Попробуй ещё раз чуть позже.'});
 assert.ok(!userMessage(new SyntaxError('Unexpected token')).includes('Unexpected'));
});
test('Russian authentication guidance survives; server details do not',async()=>{
 await assert.rejects(readApiResponse(Response.json({error:'Открой приложение через Telegram-бота.'},{status:401})),{message:'Открой приложение через Telegram-бота.'});
 await assert.rejects(readApiResponse(Response.json({error:'Database internal error'},{status:500})),{message:'Сервис временно недоступен. Попробуй ещё раз чуть позже.'});
});
