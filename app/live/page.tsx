'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserOutlined, RobotOutlined } from '@ant-design/icons';
import MediaButtons from '@/components/media-buttons';
import { useLiveAPIContext } from '@/vendor/contexts/LiveAPIContext';
import {
	RealtimeInputMessage,
	ClientContentMessage,
	ServerContentMessage,
} from '@/vendor/multimodal-live-types';
import { base64sToArrayBuffer, pcmBufferToBlob } from '@/vendor/lib/utils';

import {
	Layout,
	theme,
	Collapse,
	Input,
	Flex,
	Select,
	Tag,
	Checkbox,
} from 'antd';
import { Sender, Bubble } from '@ant-design/x';
import { useLocalStorageState } from 'ahooks';
import FieldItem from '@/components/field-item';
import GeminiIcon from '@/app/icon/google-gemini-icon.svg';
import Image from 'next/image';
import { GPTVis } from '@antv/gpt-vis';
import { Part } from '@google/generative-ai';
import { getVoiceOptions } from '@/vendor/hooks/use-speech-service';


const { Header, Content } = Layout;

interface ToolsState {
	codeExecution: boolean;
	functionCalling: boolean;
	automaticFunctionResponse: boolean;
	grounding: boolean;
}

const fooAvatar: React.CSSProperties = {
	color: '#f56a00',
	backgroundColor: '#fde3cf',
};

const barAvatar: React.CSSProperties = {
	color: '#fff',
	backgroundColor: '#1677ff',
};

type MessageType =
	| RealtimeInputMessage
	| ClientContentMessage
	| ServerContentMessage
	| null;

const isClientMessage = (
	message: MessageType
): message is ClientContentMessage => {
	return message !== null && 'clientContent' in message;
};

const isServerMessage = (
	message: MessageType
): message is ServerContentMessage => {
	return message !== null && 'serverContent' in message;
};

const hasModelTurn = (
	content: ServerContentMessage['serverContent']
): content is { modelTurn: { parts: Part[] } } => {
	return 'modelTurn' in content && content.modelTurn !== null;
};

const MessageItem: React.FC<{ message: MessageType }> = ({ message }) => {
	const textComponent = useMemo(() => {
		if (isClientMessage(message)) {
			const content = message.clientContent.turns?.[0]?.parts
				.map((p) => p.text)
				.join('');
			return content ? (
				<Bubble
					key={message.id}
					placement='end'
					content={<GPTVis>{content}</GPTVis>}
					typing={{ step: 2, interval: 50 }}
					avatar={{
						icon: <UserOutlined />,
						style: fooAvatar,
					}}
				/>
			) : null;
		}

		if (isServerMessage(message) && hasModelTurn(message.serverContent)) {
			const content = message.serverContent.modelTurn.parts
				.map((p) => p?.text ?? '')
				.join('');
			return content ? (
				<Bubble
					key={message.id}
					placement='start'
					content={<GPTVis>{content}</GPTVis>}
					typing={{ step: 10, interval: 50 }}
					avatar={{
						icon: <RobotOutlined />,
						style: barAvatar,
					}}
				/>
			) : null;
		}
		return null;
	}, [message]);

	const audioComponent = useMemo(() => {
		if (isServerMessage(message) && hasModelTurn(message.serverContent)) {
			const audioParts = message.serverContent.modelTurn?.parts.filter(
				(p) => p.inlineData
			);
			if (audioParts.length) {
				const base64s = audioParts
					.map((p) => p.inlineData?.data)
					.filter((data): data is string => data !== undefined);
				const buffer = base64sToArrayBuffer(base64s);
				const blob = pcmBufferToBlob(buffer, 24000);
				const audioUrl = URL.createObjectURL(blob);
				return (
					<Bubble
						key={`audio-${message.id}`}
						placement='start'
						content={
							<div>
								<audio
									style={{
										height: 30,
									}}
									controls
									src={audioUrl}
								/>
							</div>
						}
						avatar={{
							icon: <RobotOutlined />,
							style: barAvatar,
						}}
						styles={{
							content: {
								padding: 8,
							},
						}}
					/>
				);
			}
		}
		return null;
	}, [message]);

	return (
		<>
			{textComponent}
			{audioComponent}
		</>
	);
};

const LivePage: React.FC = () => {
	const {
		token: {
			colorBgLayout,
			colorFillAlter,
			borderRadiusLG,
			colorBgContainer,
		},
	} = theme.useToken();
	const videoRef = useRef<HTMLVideoElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

	const {
		client,
		config,
		setConfig,
		connected,
		currentBotMessage,
		currentUserMessage,
	} = useLiveAPIContext();

	const [textInput, setTextInput] = useState('');

	const [prompt, setPrompt] = useLocalStorageState('prompt', {
		defaultValue: '',
	});
	const [model, setModel] = useLocalStorageState('model', {
		defaultValue: 'gemini-2.0-flash-exp',
	});
	const [audioMode, setAudioMode] = useLocalStorageState('audioMode', {
		defaultValue: 'text',
	});
	const [voice, setVoice] = useLocalStorageState('voice', {
		defaultValue: 'zh-CN-XiaoxiaoNeural',
	});
	const [nativeVoice, setNativeVoice] = useLocalStorageState('nativeVoice', {
		defaultValue: 'Puck',
	});
	// const [azureKey, setAzureKey] = useLocalStorageState('azure-speech-key', {
	// 	defaultValue: process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || '',
	// });
	// const [azureRegion, setAzureRegion] = useLocalStorageState('azure-speech-region', {
	// 	defaultValue: process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION || 'eastasia',
	// });

	const [tools, setTools] = useLocalStorageState<ToolsState>('tools', {
		defaultValue: {
			codeExecution: false,
			functionCalling: false,
			automaticFunctionResponse: false,
			grounding: false,
		},
	});

	const [toolsPaneActive, setToolsPaneActive] = useLocalStorageState<
		string[]
	>('tools-pane-active', {
		defaultValue: [],
	});

	const [messages, setMessages] = useState<MessageType[]>([]);

	const handleSubmit = () => {
		if (!textInput.trim()) return;
		client.send([{ text: textInput }]);
		setTextInput('');
	};

	useEffect(() => {
		if (currentBotMessage) {
			setMessages((messages) => {
				if (messages.filter((m) => m?.id === currentBotMessage?.id).length > 0) {
					return messages.map((m) => m?.id === currentBotMessage?.id ? currentBotMessage : m);
				} else {
					return [...messages, currentBotMessage];
				}
			});
		}
	}, [currentBotMessage]);

	useEffect(() => {
		if (currentUserMessage) {
			setMessages((messages) => {
				if (messages.filter((m) => m?.id === currentUserMessage?.id).length > 0) {
					return messages.map((m) => m?.id === currentUserMessage?.id ? currentUserMessage : m);
				} else {
					return [...messages, currentUserMessage];
				}
			});
		}
	}, [currentUserMessage]);

	useEffect(() => {
		const generationConfig = {
			...config?.generationConfig,
			responseModalities: audioMode,
			speechConfig: {
				voiceConfig: {
					prebuiltVoiceConfig: {
						voiceName: nativeVoice,
					},
				},
			},
		} as typeof config.generationConfig;
		const systemInstruction = prompt
			? { parts: [{ text: prompt }] }
			: undefined;
		setConfig({ ...config, generationConfig, systemInstruction });
	}, [connected, prompt, model, nativeVoice, audioMode]);

	const panelStyle: React.CSSProperties = {
		background: colorFillAlter,
		borderRadius: borderRadiusLG,
		border: 'none',
	};

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	return (
		<Layout
			style={{
				height: '100vh',
			}}
		>
			<Header
				style={{
					padding: '0 12px 0 24px',
					background: colorBgLayout,
					fontSize: 22,
					fontWeight: 500,
				}}
			>
				Stream Realtime
			</Header>
			<Flex
				style={{
					height: 'calc(100vh - 64px)',
					overflow: 'hidden',
				}}
			>
				<Content
					style={{
						background: colorBgContainer,
						borderRadius: 20,
						flex: 1,
						overflow: 'hidden',
					}}
				>
					<Flex style={{ height: '100%' }}>
						<Flex
							vertical
							flex={1}
							style={{
								borderRadius: 20,
								background: '#fff',
								position: 'relative',
								overflow: 'hidden',
							}}
						>
							<div className='px-5 py-2'>
								<Collapse
									bordered={false}
									style={{ background: colorBgContainer }}
									items={[
										{
											key: 'prompts',
											label: 'System Instructions',
											children: (
												<Input
													onChange={(e) =>
														setPrompt(
															e.target.value
														)
													}
													value={prompt}
													placeholder='Optional tone and style instructions for the model'
												/>
											),
											style: panelStyle,
										},
									]}
								/>
							</div>
							<div
								className='messages'
								style={{
									flex: 1,
									padding: 24,
									overflowY: 'auto',
									boxSizing: 'border-box',
									borderRadius: 20,
									height: 0,
								}}
							>
								<Flex gap='middle' vertical>
									{messages.map((m) => (
										<MessageItem key={m?.id} message={m} />
									))}
									<div ref={messagesEndRef} />
								</Flex>
							</div>
							<div
								className='px-5 py-2'
								style={{
									pointerEvents: !connected ? 'none' : 'auto',
								}}
							>
								<Sender
									onChange={setTextInput}
									onSubmit={handleSubmit}
									value={textInput}
									disabled={!connected}
									prefix={
										<MediaButtons
											videoRef={videoRef}
											supportsVideo
											onVideoStreamChange={setVideoStream}
										/>
									}
								/>
								{videoStream ? (
									<video
										style={{
											position: 'absolute',
											top: 70,
											right: 20,
											maxWidth: 300,
											borderRadius: 10,
											border: '1px solid #333',
											display: !videoStream
												? 'none'
												: 'auto',
										}}
										ref={videoRef}
										autoPlay
										playsInline
									/>
								) : null}
							</div>
						</Flex>
					</Flex>
				</Content>
				<Flex
					vertical
					gap={32}
					style={{
						width: 250,
						padding: '10px',
						overflowY: 'auto',
						background: colorBgLayout,
					}}
				>
					<div
						style={{
							fontSize: 16,
							fontWeight: 500,
						}}
					>
						Run settings
					</div>
					<FieldItem
						label='Model'
						icon={<Image src={GeminiIcon} alt={'Model'} />}
					>
						<Select
							popupMatchSelectWidth={false}
							onChange={setModel}
							value={model}
							options={[
								{
									value: 'gemini-2.0-flash-exp',
									label: (
										<span>
											<span
												style={{
													marginRight: 8,
												}}
											>
												Gemini 2.0 Flash Experimental
											</span>
											<Tag
												style={{
													marginRight: 0,
												}}
												color='#87d068'
											>
												New
											</Tag>
										</span>
									),
								},
							]}
						/>
					</FieldItem>
					<FieldItem
						label='Audio/TTS'
						icon={<RobotOutlined />}
					>
						<Select
							value={audioMode}
							onChange={setAudioMode}
							options={[
								{ value: 'text', label: 'TTS' },
								{ value: 'audio', label: 'Native Audio' }
							]}
						/>
					</FieldItem>
					{/* {audioMode === 'text' && (
					<FieldItem label='Azure Speech Key'>
					
						<Input.Password
							value={azureKey}
							onChange={(e) => setAzureKey(e.target.value)}
							placeholder="Enter Azure Speech Key"
						/>
					
					</FieldItem>
				    )}
					{audioMode === 'text' && (
					<FieldItem label='Azure Region'>
					
						<Input
							value={azureRegion}
							onChange={(e) => setAzureRegion(e.target.value)}
							placeholder="e.g. eastus"
						/>
					</FieldItem>
					)} */}
					{audioMode === 'text' && (
						<FieldItem label='Voice'>
							<Select
								onChange={setVoice}
								value={voice}
								options={getVoiceOptions()}
							/>
						</FieldItem>
					)}
					<FieldItem label='Native Voice'>
					{audioMode === 'audio' && (
						<Select
							onChange={setNativeVoice}
							value={nativeVoice}
							options={[{value: 'Puck', label: 'Puck',
							}, {value: 'Charon', label: 'Charon',
							}, {value: 'Aoede', label: 'Aoede',
							}, {value: 'Fenrir', label: 'Fenrir',
							}, {value: 'Kore', label: 'Kore',
							}]}
						/>
					)}
					</FieldItem>
					<Collapse
						bordered={false}
						style={{ background: colorBgContainer }}
						activeKey={toolsPaneActive}
						onChange={(keys) =>
							setToolsPaneActive(keys as string[])
						}
						items={[
							{
								key: 'tools',
								label: 'Tools',
								children: (
									<Flex
										vertical
										gap={8}
										style={{
											paddingInlineStart: 24,
										}}
									>
										<FieldItem label='Code Execution'>
											<Checkbox
												onChange={(e) => {
													if (tools) {
														setTools({
															...tools,
															codeExecution:
																e.target
																	.checked,
														});
													}
												}}
												checked={tools?.codeExecution}
											/>
										</FieldItem>
										<FieldItem label='Function calling'>
											<Checkbox
												onChange={(e) => {
													if (tools) {
														setTools({
															...tools,
															functionCalling:
																e.target
																	.checked,
														});
													}
												}}
												checked={tools?.functionCalling}
											/>
										</FieldItem>
										<FieldItem label='Automatic Function Response'>
											<Checkbox
												onChange={(e) => {
													if (tools) {
														setTools({
															...tools,
															automaticFunctionResponse:
																e.target
																	.checked,
														});
													}
												}}
												checked={
													tools?.automaticFunctionResponse
												}
											/>
										</FieldItem>
										<FieldItem label='Grounding'>
											<Checkbox
												onChange={(e) => {
													if (tools) {
														setTools({
															...tools,
															grounding:
																e.target
																	.checked,
														});
													}
												}}
												checked={tools?.grounding}
											/>
										</FieldItem>
									</Flex>
								),
								style: panelStyle,
							},
						]}
					/>
				</Flex>
			</Flex>
		</Layout>
	);
};

export default LivePage; 