import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalStorageState } from 'ahooks';
import React from 'react';
import { decrypt } from '@/vendor/lib/crypto';

interface VoiceOption {
  value: string;
  label: React.ReactNode;
}

interface VoiceGroup {
  label: string;
  options: VoiceOption[];
}

// 语音选项列表
export const getVoiceOptions = (): VoiceGroup[] => [
  {
    label: '中文',
    options: [
      {
        value: 'zh-CN-XiaoxiaoNeural',
        label: React.createElement('span', null, '晓晓 (女声)'),
      },
      {
        value: 'zh-CN-XiaoxiaoMultilingualNeural',
        label: React.createElement('span', null, '晓晓2 (女声)'),
      },
      {
        value: 'zh-CN-XiaomengNeural',
        label: React.createElement('span', null, '晓萌 (女声)'),
      },
      {
        value: 'zh-CN-XiaochenMultilingualNeura',
        label: React.createElement('span', null, '晓辰 (女声)'),
      },
      {
        value: 'zh-CN-XiaoyuMultilingualNeural',
        label: React.createElement('span', null, '晓雨 (女声)'),
      },
      {
        value: 'zh-CN-YunyiMultilingualNeural',
        label: React.createElement('span', null, '云逸 (男声)'),
      },
      {
        value: 'zh-CN-YunjianNeural',
        label: React.createElement('span', null, '云健 (男声)'),
      },
      {
        value: 'zh-CN-YunxiNeural',
        label: React.createElement('span', null, '云希 (男声)'),
      },
      {
        value: 'zh-CN-liaoning-YunbiaoNeural',
        label: React.createElement('span', null, '云彪 (男声)'),
      },
    ],
  },
  {
    label: 'English',
    options: [
      {
        value: 'en-US-JennyNeural',
        label: React.createElement('span', null, 'Jenny (Female)'),
      },
      {
        value: 'en-US-GuyNeural',
        label: React.createElement('span', null, 'Guy (Male)'),
      },
      {
        value: 'en-US-AriaNeural',
        label: React.createElement('span', null, 'Aria (Female)'),
      },
      {
        value: 'en-US-DavisNeural',
        label: React.createElement('span', null, 'Davis (Male)'),
      },
    ],
  }
];

export function useSpeechService() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messageQueueRef = useRef<string[]>([]);
  const synthesizer = useRef<sdk.SpeechSynthesizer | null>(null);
  const isProcessingRef = useRef(false);
  const pendingTextRef = useRef<string>('');
  const shouldCancelRef = useRef(false);
  const playerRef = useRef<sdk.SpeakerAudioDestination | null>(null);
  const currnetBotMessageId = useRef<string | null>(null);
  const [voice = ""] = useLocalStorageState<string>('voice', {
    defaultValue: 'zh-CN-XiaoxiaoNeural',
    listenStorageChange: true,
  });

  const [config, setConfig] = useState<{
    subscriptionKey: string;
    region: string;
  }>({
    subscriptionKey: '',
    region: 'eastasia'
  });

  const currentVoiceRef = useRef(voice);
  const currentSubscriptionKeyRef = useRef(config.subscriptionKey);
  const currentRegionRef = useRef(config.region);

  // 初始化语音合成器
  const initSynthesizer = useCallback(() => {
    if (!currentSubscriptionKeyRef.current || !currentRegionRef.current) {
      console.error('[Speech] Missing credentials');
      return;
    }

    synthesizer.current?.close();
    const speechConfig = sdk.SpeechConfig.fromSubscription(currentSubscriptionKeyRef.current, currentRegionRef.current);

    speechConfig.speechSynthesisVoiceName = currentVoiceRef.current;
    speechConfig.speechSynthesisLanguage = currentVoiceRef.current.split('-')[0] + '-' + currentVoiceRef.current.split('-')[1];
    playerRef.current = new sdk.SpeakerAudioDestination();
    const audioConfig = sdk.AudioConfig.fromSpeakerOutput(playerRef.current);
    synthesizer.current = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
  }, []);

  // 获取配置
  useEffect(() => {
    fetch('/api/xa')
      .then((res) => res.json())
      .then((data) => {
        try {
          const decryptedConfig = JSON.parse(decrypt(data.data));
          const newConfig = {
            subscriptionKey: decryptedConfig.azureSpeechKey,
            region: decryptedConfig.azureSpeechRegion
          };
          setConfig(newConfig);

          // 直接在这里初始化
          if (newConfig.subscriptionKey && newConfig.region && voice) {
            console.log('[Speech] init Synthesizer, voice:', voice);
            currentVoiceRef.current = voice;
            currentSubscriptionKeyRef.current = newConfig.subscriptionKey;
            currentRegionRef.current = newConfig.region;
            initSynthesizer();
          }
        } catch (error) {
          console.error('Failed to decrypt config:', error);
        }
      })
      .catch((err) => {
        console.error('Failed to load speech config:', err);
      });
  }, [voice, initSynthesizer]);

  // 将文本添加到朗读队列
  const addToTTSQueue = useCallback((text: string) => {
    if (!text) return;

    // 预处理文本：清理 markdown 标记
    const cleanText = text
      .replace(/\*+([^*]+)\*+/g, '$1')  // 清理 markdown 加粗和斜体标记
      .replace(/`([^`]+)`/g, '$1')      // 清理代码块
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')  // 清理链接
      .replace(/#{1,6}\s/g, '')         // 清理标题标记
      .replace(/\*+/g, '')              // 清理剩余的单独星号
      .trim();

    // 累积文本
    pendingTextRef.current += cleanText;

    // 在句号、问号、感叹号处分割
    const sentences = pendingTextRef.current
      .match(/[^。！？.!?]+[。！？.!?]+/g) || [];

    if (sentences.length > 0) {
      // 更新 pending text 为剩余的部分
      const processedText = sentences.join('');
      pendingTextRef.current = pendingTextRef.current.slice(processedText.length);
      
      // 将句子添加到队列
      messageQueueRef.current.push(...sentences);
      processMessageQueue();
    }
  }, []);

  // 处理消息队列
  const processMessageQueue = useCallback(async () => {
    if (isProcessingRef.current || !synthesizer.current || messageQueueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    setIsSpeaking(true);
    shouldCancelRef.current = false;

    try {
      while (messageQueueRef.current.length > 0 && !shouldCancelRef.current) {
        const sentence = messageQueueRef.current[0];
        if (sentence.trim()) {
          await new Promise<void>((resolve, reject) => {
            // console.log(new Date(), 'speakTextAsync', sentence.trim())
            synthesizer.current!.speakTextAsync(
              sentence.trim(),
              (result) => {
                resolve();
              },
              (error) => {
                console.error('[Speech] Error in speakTextAsync:', error);
                reject(error);
              }
            );
          });
        }
        messageQueueRef.current.shift();
      }
    } catch (error) {
      console.error('[Speech] Error speaking:', error);
    } finally {
      isProcessingRef.current = false;
      setIsSpeaking(false);
    }
  }, []);

  // 取消朗读
  const cancel = useCallback(() => {
    console.log('[Speech] Cancelling speech...');
    shouldCancelRef.current = true;
    
    // 立即暂停当前播放
    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current = null;
    }

    // 清空队列和状态
    messageQueueRef.current = [];
    pendingTextRef.current = '';
    isProcessingRef.current = false;
    setIsSpeaking(false);

    // 重新初始化合成器
    initSynthesizer();
  }, [initSynthesizer]);

  // 处理新消息
  const handleNewMessage = useCallback((messageId: string | null, text: string) => {
    // console.log(new Date(), '[Speech] handleNewMessage', messageId, text);
    
    // 如果是新的消息 ID，且之前有消息在播放，则取消之前的
    if (currnetBotMessageId.current && messageId !== currnetBotMessageId.current) {
      cancel();
    }
    
    currnetBotMessageId.current = messageId;
    addToTTSQueue(text);
  }, [addToTTSQueue, cancel]);

  return {
    handleNewMessage,
    isSpeaking,
    cancel
  };
} 
