<div align="center">

<img src="https://github.com/user-attachments/assets/b32944c3-3a05-4380-b5cb-8cc4093f00a9" alt="cover" style="width: 100px; height: 100px;">

<h1 align="center">Gemini-Next-Web</h1>

[English](https://github.com/ElricLiu/Gemini-Next-Web) / 简体中文

<img width="1912" alt="image" src="https://github.com/user-attachments/assets/e8661093-e827-4125-8e1e-02623170968e" />

</div>

**在原项目基础上扩展了一些功能：**

1. **增加页面配置 Gemni API KEY**
2. **增加代理地址可配**
3. **增加 TTS 转中文语音支持 ，选择 TTS 模式，原生的语音不支持说中文，使用Azure TTS 来实现中文的支持** ([如何获取 Azure TTS API-KEY](https://learn.microsoft.com/zh-cn/azure/ai-services/speech-service/get-started-speech-to-text?tabs=macos%2Cterminal&pivots=programming-language-javascript#prerequisites)) 

## 开始项目

首先，您需要从 Google aistudio https://aistudio.google.com 获取 API Key

请注意网络环境。非 Gemini 授权的网络环境将不可用

#### - Vercel 一键部署

[<img src="https://vercel.com/button" alt="Deploy on Vercel" height="30">](https://vercel.com/new/clone?repository-url=https://github.com/coderzc/Gemini-Next-Web&env=NEXT_PUBLIC_GEMINI_API_KEY&project-name=gemini-next-web&repository-name=gemini-next-web)

在 Vercel 中设置环境变量 NEXT_PUBLIC_GEMINI_API_KEY 和 API 密钥

#### - 本地部署

首先，在`.env`文件中填写`NEXT_PUBLIC_GEMINI_API_KEY`并且启动项目

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```
然后，用浏览器打开 http://localhost:3000 查看结果。

您可以通过修改 app/page.tsx 开始编辑页面。当您编辑文件时，页面会自动更新。

该项目使用 next/font 自动优化和加载 Geist ，这是 Vercel 的新字体系列。

### 贡献者

<a href="https://github.com/coderzc/Gemini-Next-Web/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=ElricLiu/Gemini-Next-Web" />
</a>

## LICENSE

[apache](https://www.apache.org/licenses/LICENSE-2.0)

