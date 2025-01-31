import { memo, ReactNode, RefObject, useEffect, useRef, useState } from 'react';
import { useLiveAPIContext } from '@/vendor/contexts/LiveAPIContext';
import { UseMediaStreamResult } from '@/vendor/hooks/use-media-stream-mux';
import { useScreenCapture } from '@/vendor/hooks/use-screen-capture';
import { useWebcam } from '@/vendor/hooks/use-webcam';
import { AudioRecorder } from '@/vendor/lib/audio-recorder';
import {
	AudioOutlined,
	VideoCameraOutlined,
	DesktopOutlined,
} from '@ant-design/icons';
import { Button, Select } from 'antd';

const { Option } = Select;

export type MediaButtonsProps = {
	videoRef: RefObject<HTMLVideoElement>;
	children?: ReactNode;
	supportsVideo: boolean;
	onVideoStreamChange?: (stream: MediaStream | null) => void;
};

type MediaStreamButtonProps = {
	isStreaming: boolean;
	onIcon: React.ReactNode;
	offIcon: React.ReactNode;
	start: () => Promise<void>;
	stop: () => void;
};

/**
 * button used for triggering webcam or screen-capture
 */
const MediaStreamButton = memo(
	({ isStreaming, onIcon, offIcon, start, stop }: MediaStreamButtonProps) =>
		isStreaming ? (
			<Button
				type='primary'
				shape='circle'
				icon={onIcon}
				onClick={stop}
				style={{ marginLeft: 10 }}
			/>
		) : (
			<Button
				type='default'
				shape='circle'
				icon={offIcon}
				onClick={start}
				style={{ marginLeft: 10 }}
			/>
		)
);

const DEFAULT_MUTED_STATE = false; // 设置初始状态为非静音状态

function MediaButtons({
	videoRef,
	children,
	onVideoStreamChange = () => {},
	supportsVideo,
}: MediaButtonsProps) {
	const videoStreams = [useWebcam(), useScreenCapture()];
	const [activeVideoStream, setActiveVideoStream] =
		useState<MediaStream | null>(null);
	const [webcam, screenCapture] = videoStreams;
	const [inVolume, setInVolume] = useState(0);
	const [audioRecorder] = useState(() => new AudioRecorder());
	const [muted, setMuted] = useState(DEFAULT_MUTED_STATE); 
	const renderCanvasRef = useRef<HTMLCanvasElement>(null);
	const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
	const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

	const { client, connected } = useLiveAPIContext();

	useEffect(() => {
		document.documentElement.style.setProperty(
			'--volume',
			`${Math.max(5, Math.min(inVolume * 200, 8))}px`
		);
	}, [inVolume]);

	useEffect(() => {
		const resetState = () => {
			webcam.stop();
			screenCapture.stop();
			audioRecorder.stop();
			setMuted(DEFAULT_MUTED_STATE);
			setActiveVideoStream(null);
			onVideoStreamChange(null);
			setInVolume(0);
		};

		client.on('close', resetState);

		return () => {
			client.off('close', resetState);
		};
	}, [client, webcam, screenCapture, audioRecorder, onVideoStreamChange]);

	useEffect(() => {
		const onData = (base64: string) => {
			client.sendRealtimeInput([
				{
					mimeType: 'audio/pcm;rate=16000',
					data: base64,
				},
			]);
		};
		if (connected && !muted && audioRecorder) {
			audioRecorder.on('data', onData).on('volume', setInVolume).start();
		} else {
			audioRecorder.stop();
		}
		return () => {
			audioRecorder.off('data', onData).off('volume', setInVolume);
		};
	}, [connected, client, muted, audioRecorder]);

	useEffect(() => {
		if (videoRef.current) {
			videoRef.current.srcObject = activeVideoStream;
		}

		let timeoutId = -1;

		function sendVideoFrame() {
			const video = videoRef.current;
			const canvas = renderCanvasRef.current;

			if (!video || !canvas) {
				return;
			}

			const ctx = canvas.getContext('2d')!;
			canvas.width = video.videoWidth * 0.25;
			canvas.height = video.videoHeight * 0.25;
			if (canvas.width + canvas.height > 0) {
				ctx.drawImage(
					videoRef.current,
					0,
					0,
					canvas.width,
					canvas.height
				);
				const base64 = canvas.toDataURL('image/jpeg', 1.0);
				const data = base64.slice(base64.indexOf(',') + 1, Infinity);
				client.sendRealtimeInput([{ mimeType: 'image/jpeg', data }]);
			}
			if (connected) {
				timeoutId = window.setTimeout(sendVideoFrame, 1000 / 0.5);
			}
		}
		if (connected && activeVideoStream !== null) {
			requestAnimationFrame(sendVideoFrame);
		}
		return () => {
			clearTimeout(timeoutId);
		};
	}, [connected, activeVideoStream, client, videoRef]);

	//handler for swapping from one video-stream to the next
	const changeStreams = (next?: UseMediaStreamResult, constraints?: MediaStreamConstraints) => async () => {
		if (!connected) return;

		if (next) {
			const mediaStream = await next.start(constraints);
			setActiveVideoStream(mediaStream);
			onVideoStreamChange(mediaStream);
		} else {
			setActiveVideoStream(null);
			onVideoStreamChange(null);
		}

		videoStreams.filter((msr) => msr !== next).forEach((msr) => msr.stop());
	};

	// 获取所有视频输入设备
	useEffect(() => {
		async function getDevices() {
			try {
				const devices = await navigator.mediaDevices.enumerateDevices();
				const videoInputs = devices.filter(device => device.kind === 'videoinput');
				setVideoDevices(videoInputs);
				
				// 如果有设备，默认选择第一个
				if (videoInputs.length > 0 && !selectedDeviceId) {
					setSelectedDeviceId(videoInputs[0].deviceId);
				}
			} catch (err) {
				console.error('Error getting devices:', err);
			}
		}

		getDevices();
		
		// 监听设备变化
		navigator.mediaDevices.addEventListener('devicechange', getDevices);
		return () => {
			navigator.mediaDevices.removeEventListener('devicechange', getDevices);
		};
	}, []);

	return (
		<div className='control-tray'>
			<canvas style={{ display: 'none' }} ref={renderCanvasRef} />
			<div>
				<Button
					type={!muted && connected ? 'primary' : 'default'}
					shape='circle'
					icon={<AudioOutlined />}
					onClick={() => setMuted(!muted)}
				/>
				{supportsVideo && (
					<>
						<MediaStreamButton
							isStreaming={screenCapture.isStreaming}
							start={changeStreams(screenCapture)}
							stop={changeStreams()}
							onIcon={<DesktopOutlined />}
							offIcon={<DesktopOutlined />}
						/>
						<MediaStreamButton
							isStreaming={webcam.isStreaming}
							start={changeStreams(webcam, {
								video: {
									deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined
								}
							})}
							stop={changeStreams()}
							onIcon={<VideoCameraOutlined />}
							offIcon={<VideoCameraOutlined />}
						/>
						<Select 
							value={selectedDeviceId}
							style={{ width: 200, marginLeft: 10 }}
							onChange={(value) => {
								setSelectedDeviceId(value);
								if (webcam.isStreaming) {
									// 使用 changeStreams 来切换设备
									changeStreams(webcam, {
										video: {
											deviceId: { exact: value }
										}
									})();
								}
							}}>
							{videoDevices.map(device => (
								<Option key={device.deviceId} value={device.deviceId}>
									{device.label || `Camera ${device.deviceId.slice(0, 5)}...`}
								</Option>
							))}
						</Select>
					</>
				)}
				{children}
			</div>
		</div>
	);
}

export default memo(MediaButtons);