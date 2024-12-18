'use client';
import React, { useState, useEffect, useRef } from 'react';
import { UserOutlined, RobotOutlined } from '@ant-design/icons';
import { PauseCircleOutlined, PoweroffOutlined } from '@ant-design/icons';
import MediaButtons from '@/components/media-buttons';
import { useLiveAPIContext } from '@/vendor/contexts/LiveAPIContext';
import { RealtimeInputMessage, ClientContentMessage, ServerContentMessage } from '@/vendor/multimodal-live-types';
import { base64sToArrayBuffer, pcmBufferToBlob } from '@/vendor/lib/utils';

import {
	Button,
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

const LivePage = () => {
	const {
		token: {
			colorBgLayout,
			colorFillAlter,
			borderRadiusLG,
			colorBgContainer,
		},
	} = theme.useToken();
	const videoRef = useRef<HTMLVideoElement>(null);
	// either the screen capture, the video or null, if null we hide it
	const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

	const { client, config, setConfig, connected, connect, disconnect, currentBotMessage, currentUserMessage } =
		useLiveAPIContext();

	const [textInput, setTextInput] = useState('');

	const [prompt, setPrompt] = useLocalStorageState('prompt', {
		defaultValue: '',
	});
	const [model, setModel] = useLocalStorageState('model', {
		defaultValue: 'gemini-2.0-flash-exp',
	});
	const [outPut, setOutPut] = useLocalStorageState('output', {
		defaultValue: 'audio',
	});
	const [voice, setVoice] = useLocalStorageState('voice', {
		defaultValue: 'Puck',
	});

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

	type MessgeType = RealtimeInputMessage | ClientContentMessage | ServerContentMessage | null

	const [messages, setMessages] = useState<MessgeType[]>([]);

	const handleSubmit = () => {
		client.send([{ text: textInput }]);
		setTextInput('');
	};

	useEffect(() => {
		console.log('currentBotMessage', currentBotMessage)
		if (currentBotMessage) {
			setMessages((messages) => {
				if (messages.filter(m => m?.id === currentBotMessage?.id).length > 0){
					return messages.map(m => m?.id === currentBotMessage?.id ? currentBotMessage : m)
				} else {
					return [...messages, currentBotMessage]
				}
			})
		}
	}, [currentBotMessage])

	useEffect(() => {
		console.log('currentUserMessage', currentUserMessage)
		if (currentUserMessage) {
			setMessages((messages) => {
				if (messages.filter(m => m?.id === currentUserMessage?.id).length > 0){
					return messages.map(m => m?.id === currentUserMessage?.id ? currentUserMessage : m)
				} else {
					return [...messages, currentUserMessage]
				}
			})
		}
	}, [currentUserMessage])

	console.log('messages', messages)

	useEffect(() => {
		// if (!connected) return;
		const speechConfig = {
			voiceConfig: {
				prebuiltVoiceConfig: {
					voiceName: voice,
				},
			},
		};
		const generationConfig = {
			...config?.generationConfig,
			speechConfig,
			responseModalities: outPut,
		} as typeof config.generationConfig;
		const systemInstruction = prompt
			? { parts: [{ text: prompt }] }
			: undefined;
		setConfig({ ...config, generationConfig, systemInstruction });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [connected, prompt, model, outPut, voice]);

	const panelStyle: React.CSSProperties = {
		background: colorFillAlter,
		borderRadius: borderRadiusLG,
		border: 'none',
	};

	const handleDisconnect = () => {
		setVideoStream(null); // 关闭视频预览
		disconnect();
	};

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

			<Content
				style={{
					height: '100%',
					background: colorBgContainer,
					borderRadius: 20,
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
													setPrompt(e.target.value)
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
							}}
						>
							{messages.map(m => {
								// @ts-ignore
								if (m?.clientContent) {
									return <Bubble
									    key={m?.id}
										placement='end'
										// @ts-ignore
										content={m?.clientContent.turns?.[0]?.parts.map(p => p.text).join('')}
										typing={{ step: 2, interval: 50 }}
										avatar={{
											icon: <UserOutlined />,
											style: fooAvatar,
										}}
									/>
								}
								// @ts-ignore
								if (m?.serverContent) {
									// @ts-ignore
									const content = m?.serverContent.modelTurn?.parts.map(p => p?.text ?? '').join('')
									// @ts-ignore
									const audioParts = m?.serverContent.modelTurn?.parts.filter(p => p?.inlineData)
									let audioComponent = null
									if (audioParts.length) {
										// @ts-ignore
										const base64s = audioParts.map((p) => p.inlineData?.data);
										const buffer = base64sToArrayBuffer(base64s);
										const blob = pcmBufferToBlob(buffer, 24000);
										// TODO 这里会影响渲染性能，可以考虑抽到子组件里面？
										const audioUrl = URL.createObjectURL(blob);
										audioComponent = <Bubble
											key={`audio-{m?.id}`}
											placement='start'
											content={<div><audio controls src={audioUrl}></audio></div>}
											avatar={{
												icon: <RobotOutlined />,
												style: barAvatar,
											}}
										/>
									}
									console.log('audioParts', audioParts)
									return (
										<>
											{content ? <Bubble
												key={m?.id}
												placement='start'
												content={content}
												typing={{ step: 10, interval: 50 }}
												avatar={{
													icon: <RobotOutlined />,
													style: barAvatar,
												}}
											/> : null}
											{audioComponent}
										</>
									)  
								}
								return null
							})}
						</div>
						<Flex justify='center'>
							<Button
								color='primary'
								variant={connected ? 'outlined' : 'solid'}
								onClick={connected ? handleDisconnect : connect}
								icon={
									connected ? (
										<PauseCircleOutlined />
									) : (
										<PoweroffOutlined />
									)
								}
							>
								{connected
									? 'Disconnect'
									: 'Click me to start !'}
							</Button>
						</Flex>
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
										display: !videoStream ? 'none' : 'auto',
									}}
									ref={videoRef}
									autoPlay
									playsInline
								/>
							) : null}
						</div>
					</Flex>
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
													Gemini 2.0 Flash
													Experimental
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
						<FieldItem label='Output format'>
							<Select
								onChange={setOutPut}
								value={outPut}
								options={[
									{
										value: 'audio',
										label: <span>Audio</span>,
									},
									{
										value: 'text',
										label: <span>Text</span>,
									},
								]}
							/>
						</FieldItem>
						<FieldItem label='Voice'>
							<Select
								onChange={setVoice}
								value={voice}
								options={[
									{
										value: 'Puck',
										label: <span>Puck</span>,
									},
									{
										value: 'Charon',
										label: <span>Charon</span>,
									},
									{
										value: 'Kore',
										label: <span>Kore</span>,
									},
									{
										value: 'Fenrir',
										label: <span>Fenrir</span>,
									},
									{
										value: 'Aoede',
										label: <span>Aoede</span>,
									},
								]}
							/>
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
													checked={
														tools?.codeExecution
													}
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
													checked={
														tools?.functionCalling
													}
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
			</Content>
		</Layout>
	);
};

export default LivePage;
