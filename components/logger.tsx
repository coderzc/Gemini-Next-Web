import {
	StreamingLog,
	isClientContentMessage,
	ClientContentMessage,
	isServerContenteMessage,
	isModelTurn,
	ServerContentMessage,
	ModelTurn,
	isToolCallMessage,
	isToolResponseMessage,
	isToolCallCancellationMessage,
	isAudioMessage,
} from '@/vendor/multimodal-live-types';
import { ReactNode, useEffect, useRef } from 'react';
import { Bubble } from '@ant-design/x';

import {
	UserOutlined,
	RobotOutlined,
	PlayCircleOutlined,
} from '@ant-design/icons';

import { Flex } from 'antd';

// type Message = { message: StreamingLog['message'] };

export type LoggerFilterType = 'conversations' | 'tools' | 'none';

export type LoggerProps = {
	logs: StreamingLog[];
	filter?: LoggerFilterType;
};

const fooAvatar: React.CSSProperties = {
	color: '#f56a00',
	backgroundColor: '#fde3cf',
};

const barAvatar: React.CSSProperties = {
	color: '#fff',
	backgroundColor: '#1677ff',
};

const hideAvatar: React.CSSProperties = {
	visibility: 'hidden',
};

const ClientContentLog = ({
	message,
	prevLog,
}: {
	message: StreamingLog['message'];
	prevLog?: StreamingLog;
}) => {
	const { turns } = (message as ClientContentMessage).clientContent;
	return (
		<div>
			{turns.map((turn, i) => (
				<div key={`message-turn-${i}`}>
					{turn.parts
						.filter((part) => !(part.text && part.text === '\n'))
						.map((part, j) => {
							const showAvatar =
								!prevLog || prevLog.type !== 'client.send';
							return (
								<Bubble
									placement='end'
									content={part.text}
									avatar={
										showAvatar
											? {
													icon: <UserOutlined />,
													style: barAvatar,
											  }
											: {}
									}
									styles={{
										avatar: showAvatar ? {} : hideAvatar,
									}}
									key={`message-turn-${i}-part-${j}`}
								/>
							);
						})}
				</div>
			))}
		</div>
	);
};

const NoneMessage = () => null;

const ModelTurnLog = ({
	message,
	prevLog,
}: {
	message: StreamingLog['message'];
	prevLog?: StreamingLog;
}): JSX.Element => {
	const serverContent = (message as ServerContentMessage).serverContent;
	const { modelTurn } = serverContent as ModelTurn;
	const { parts } = modelTurn;

	return (
		<div>
			{parts
				.filter((part) => !(part.text && part.text === '\n'))
				.map((part, j) => {
					const showAvatar =
						!prevLog || prevLog.type !== 'server.content';
					return (
						<Bubble
							placement='start'
							content={part.text}
							avatar={
								showAvatar
									? {
											icon: <RobotOutlined />,
											style: fooAvatar,
									  }
									: {}
							}
							styles={{
								avatar: showAvatar ? {} : hideAvatar,
							}}
							key={`model-turn-part-${j}`}
						/>
					);
				})}
		</div>
	);
};

const AudioMessage = ({ buffer }: { buffer?: ArrayBuffer }) => {
	const audioUrl = useRef<string | null>(null);

	useEffect(() => {
		if (!buffer) return;

		// 将 ArrayBuffer 转换为 Blob
		const blob = new Blob([buffer], { type: 'audio/wav' });
		audioUrl.current = URL.createObjectURL(blob);

		// 组件卸载时清理
		return () => {
			if (audioUrl.current) {
				URL.revokeObjectURL(audioUrl.current);
				audioUrl.current = null;
			}
		};
	}, [buffer]);

	if (!buffer || !audioUrl.current) return null;

	return (
		<Bubble
			placement='start'
			content={
				<div>
					<audio controls src={audioUrl.current} />
				</div>
			}
			avatar={{
				icon: <RobotOutlined />,
				style: fooAvatar,
			}}
		/>
	);
};

const filters: Record<LoggerFilterType, (log: StreamingLog) => boolean> = {
	tools: (log: StreamingLog) =>
		isToolCallMessage(log.message) ||
		isToolResponseMessage(log.message) ||
		isToolCallCancellationMessage(log.message),
	conversations: (log: StreamingLog) =>
		isClientContentMessage(log.message) ||
		isServerContenteMessage(log.message),
	none: () => true,
};

const component = (log: StreamingLog) => {
	if (isAudioMessage(log)) {
		return AudioMessage;
	}
	if (isClientContentMessage(log.message)) {
		return ClientContentLog;
	}
	if (isServerContenteMessage(log.message)) {
		const { serverContent } = log.message;
		if (isModelTurn(serverContent)) {
			return ModelTurnLog;
		}
	}
	return NoneMessage;
};

const LogEntry = ({
	log,
	MessageComponent,
	prevLog,
}: {
	log: StreamingLog;
	prevLog?: StreamingLog;
	MessageComponent: ({
		message,
		prevLog,
		buffer,
	}: {
		message: StreamingLog['message'];
		prevLog?: StreamingLog;
		buffer?: ArrayBuffer;
	}) => ReactNode;
}): JSX.Element => {
	return (
		<MessageComponent
			message={log.message}
			prevLog={prevLog}
			buffer={log?.buffer}
		/>
	);
};

const Logger = ({ logs, filter = 'none' }: LoggerProps) => {
	const filterFn = filters[filter];
	const filterLogs = logs.filter(filterFn);
	return (
		<Flex gap='middle' vertical>
			{filterLogs.map((log, key) => {
				return (
					<LogEntry
						MessageComponent={component(log)}
						log={log}
						key={key}
						prevLog={filterLogs[key - 1]}
					/>
				);
			})}
		</Flex>
	);
};

export default Logger;
