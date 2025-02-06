import { NextResponse } from 'next/server';
import { encrypt } from '@/vendor/lib/crypto';

export async function GET() {
  const config = {
    host: process.env.GEMINI_HOST || 'generativelanguage.googleapis.com',
    apiKey: process.env.GEMINI_API_KEY || '',
    azureSpeechKey: process.env.AZURE_SPEECH_KEY || '',
    azureSpeechRegion: process.env.AZURE_SPEECH_REGION || 'eastasia',
  };

  // 加密配置数据
  const encryptedData = encrypt(JSON.stringify(config));
  
  return NextResponse.json({ data: encryptedData });
} 