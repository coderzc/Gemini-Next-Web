<div align="center">

<img src="https://github.com/user-attachments/assets/b32944c3-3a05-4380-b5cb-8cc4093f00a9" alt="cover" style="width: 100px; height: 100px;">

<h1 align="center">Gemini-Next-Web</h1>

English / [简体中文](https://github.com/coderzc/Gemini-Next-Web/blob/main/README-CN.md)

<img width="1912" alt="image" src="https://github.com/user-attachments/assets/e8661093-e827-4125-8e1e-02623170968e" />


</div>

**On the basis of the original project, some features have been extended:**

1. **Add page configuration Gemni API KEY**

2. **Add proxy address configurable**

3. **Add TTS to Chinese voice support, select TTS mode, the native voice does not support Chinese, use Microsoft TTS to realize Chinese support. [How to get the Azure TTS API-KEY](https://learn.microsoft.com/zh-cn/azure/ai-services/speech-service/get-started-speech-to-text?tabs=macos%2Cterminal&pivots=programming-language-javascript#prerequisites)**



## Getting Started
First of all，you need to obtain the API Key from google aistudio https://aistudio.google.com

Please pay attention to the network environment. Non-Gemini authorized network environments will not be available.

#### - Vercel one-click deployment

[<img src="https://vercel.com/button" alt="Deploy on Vercel" height="30">](https://vercel.com/new/clone?repository-url=https://github.com/coderzc/Gemini-Next-Web&env=NEXT_PUBLIC_GEMINI_API_KEY&project-name=gemini-next-web&repository-name=gemini-next-web)

Set you Environment Variables `NEXT_PUBLIC_GEMINI_API_KEY` & API Key in vercel

#### - Local deployment
First, set you `NEXT_PUBLIC_GEMINI_API_KEY` in `.env` and run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Then, open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

### Contributors

<a href="https://github.com/coderzc/Gemini-Next-Web/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=ElricLiu/Gemini-Next-Web" />
</a>

## LICENSE

[apache](https://www.apache.org/licenses/LICENSE-2.0)
