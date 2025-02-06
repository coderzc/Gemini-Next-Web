import { NextResponse } from 'next/server';
import { encrypt } from '@/vendor/lib/crypto';

export async function GET(request: Request) {
  // 使用 Response header 输出日志
  const logs: string[] = [];
  const log = (msg: string) => {
    logs.push(msg);
    console.log(msg); // 本地开发时仍然可以看到
  };

  const config = {
    host: process.env.GEMINI_HOST || 'generativelanguage.googleapis.com',
    apiKey: process.env.GEMINI_API_KEY || '',
    azureSpeechKey: process.env.AZURE_SPEECH_KEY || '',
    azureSpeechRegion: process.env.AZURE_SPEECH_REGION || 'eastasia',
  };

  log('Config prepared, host:' + config.host);

  // 加密配置数据
  const encryptedData = encrypt(JSON.stringify(config));
  
  const response = NextResponse.json({ data: encryptedData });
  
  return response;
} 