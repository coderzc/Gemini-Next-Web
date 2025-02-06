import { NextResponse } from 'next/server';
import { encrypt } from '@/vendor/lib/crypto';

export async function GET() {
  console.log('Environment variables:', {
    GEMINI_HOST: process.env.GEMINI_HOST,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    AZURE_SPEECH_KEY: process.env.AZURE_SPEECH_KEY,
    AZURE_SPEECH_REGION: process.env.AZURE_SPEECH_REGION,
  });

  const config = {
    host: process.env.GEMINI_HOST || 'generativelanguage.googleapis.com',
    apiKey: process.env.GEMINI_API_KEY || '',
    azureSpeechKey: process.env.AZURE_SPEECH_KEY || '',
    azureSpeechRegion: process.env.AZURE_SPEECH_REGION || 'eastasia',
  };

  console.log('Config before encryption:', config);

  // 加密配置数据
  const encryptedData = encrypt(JSON.stringify(config));
  
  return NextResponse.json({ data: encryptedData });
} 