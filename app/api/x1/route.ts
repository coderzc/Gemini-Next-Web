import { NextResponse } from 'next/server';
import { encrypt } from '@/vendor/lib/crypto';

export async function GET(request: Request) {
  // 使用 Response header 输出日志
  const logs: string[] = [];
  const log = (msg: string) => {
    logs.push(msg);
    console.log(msg); // 本地开发时仍然可以看到
  };

  log('API called at: ' + new Date().toISOString());

  // 获取所有环境变量
  let envStr = '';
  try {
    // @ts-ignore
    envStr = JSON.stringify(typeof Deno !== 'undefined' ? Deno.env.toObject() : process.env);
  } catch (error: any) {
    envStr = 'Failed to get env: ' + (error?.message || String(error));
  }

  const debugInfo = {
    GEMINI_HOST: process.env.GEMINI_HOST || '[empty]',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '[exists]' : '[empty]',
    AZURE_SPEECH_KEY: process.env.AZURE_SPEECH_KEY ? '[exists]' : '[empty]',
    AZURE_SPEECH_REGION: process.env.AZURE_SPEECH_REGION || '[empty]',
    NODE_ENV: process.env.NODE_ENV || '[empty]',
    URL: request.url,
    ALL_ENV: envStr
  };

  log('Debug info: ' + JSON.stringify(debugInfo));

  const config = {
    host: process.env.GEMINI_HOST || 'generativelanguage.googleapis.com',
    apiKey: process.env.GEMINI_API_KEY || '',
    azureSpeechKey: process.env.AZURE_SPEECH_KEY || '',
    azureSpeechRegion: process.env.AZURE_SPEECH_REGION || 'eastasia',
  };

  log('Config prepared');

  // 加密配置数据
  const encryptedData = encrypt(JSON.stringify(config));
  
  const response = NextResponse.json({ data: encryptedData });
  
  // 添加调试信息到响应头
  response.headers.set('X-Debug-Info', JSON.stringify(debugInfo));
  response.headers.set('X-Server-Logs', JSON.stringify(logs));
  
  return response;
} 