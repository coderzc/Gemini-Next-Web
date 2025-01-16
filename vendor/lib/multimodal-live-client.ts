/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Content, GenerativeContentBlob, Part } from '@google/generative-ai';
import { EventEmitter } from 'eventemitter3';
import { difference } from 'lodash-es';
import {
	ClientContentMessage,
	isInterrupted,
	isModelTurn,
	isServerContenteMessage,
	isSetupCompleteMessage,
	isToolCallCancellationMessage,
	isToolCallMessage,
	isTurnComplete,
	LiveIncomingMessage,
	ModelTurn,
	RealtimeInputMessage,
	ServerContent,
	SetupMessage,
	StreamingLog,
	ToolCall,
	ToolCallCancellation,
	ToolResponseMessage,
	type LiveConfig,
} from '../multimodal-live-types';
import { blobToJSON, base64ToArrayBuffer } from './utils';

/**
 * the events that this client will emit
 */
interface MultimodalLiveClientEventTypes {
	open: () => void;
	log: (log: StreamingLog) => void;
	close: (event: CloseEvent) => void;
	audio: (data: ArrayBuffer) => void;
	audiocontent: (data: ModelTurn['modelTurn']['parts']) => void;
	content: (data: ModelTurn) => void;
	input: (data: RealtimeInputMessage | ClientContentMessage) => void;
	interrupted: () => void;
	setupcomplete: () => void;
	turncomplete: () => void;
	toolcall: (toolCall: ToolCall) => void;
	toolcallcancellation: (toolcallCancellation: ToolCallCancellation) => void;
}

export type MultimodalLiveAPIClientConnection = {
	url?: string;
	apiKey: string;
};

/**
 * A event-emitting class that manages the connection to the websocket and emits
 * events to the rest of the application.
 * If you dont want to use react you can still use this.
 */
export class MultimodalLiveClient extends EventEmitter<MultimodalLiveClientEventTypes> {
	public ws: WebSocket | null = null;
	protected config: LiveConfig | null = null;
	public url: string = '';
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectTimer: NodeJS.Timeout | null = null;
	private isReconnecting = false;

	public getConfig() {
		return { ...this.config };
	}

	constructor({ url, apiKey }: MultimodalLiveAPIClientConnection) {
		super();
		url =
			url ||
			`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;
		url += `?key=${apiKey}`;
		this.url = url;
		this.send = this.send.bind(this);
	}

	// 计算重连延迟时间（指数退避）
	private getReconnectDelay(): number {
		return Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // 最大30秒
	}

	// 尝试重连
	private async tryReconnect() {
		console.log('tryReconnect', this.isReconnecting, this.config);
		if (this.isReconnecting || !this.config) {
			return;
		}

		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			throw new Error('Max reconnect attempts reached');
		}

		this.isReconnecting = true;
		this.reconnectAttempts++;

		const delay = this.getReconnectDelay();
		console.log(`[WebSocket] Reconnecting attempt ${this.reconnectAttempts} in ${delay}ms...`);
		
		this.reconnectTimer = setTimeout(async () => {
			try {
				await this.connect(this.config!);
				this.reconnectAttempts = 0;
				this.isReconnecting = false;
				console.log('[WebSocket] Reconnected successfully');
			} catch (error) {
				console.error('[WebSocket] Reconnection failed:', error);
				this.isReconnecting = false;
				this.tryReconnect();
			}
		}, delay);
	}

	log(type: string, message: StreamingLog['message']) {
		const log: StreamingLog = {
			date: new Date(),
			type,
			message,
		};
		this.emit('log', log);
	}

	connect(config: LiveConfig): Promise<boolean> {
		this.config = config;

		// 清理之前的重连定时器
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}

		const ws = new WebSocket(this.url);

		ws.addEventListener('message', async (evt: MessageEvent) => {
			if (evt.data instanceof Blob) {
				this.receive(evt.data);
			} else {
				console.log('non blob message', evt);
			}
		});

		return new Promise((resolve, reject) => {
			const onError = (ev: Event) => {
				this.disconnect(ws);
				const message = `Could not connect to "${this.url}"`;
				this.log(`server.${ev.type}`, message);
				reject(new Error(message));
			};

			ws.addEventListener('error', onError);
			ws.addEventListener('open', (ev: Event) => {
				if (!this.config) {
					reject('Invalid config sent to `connect(config)`');
					return;
				}
				this.log(`client.${ev.type}`, `connected to socket`);
				this.emit('open');

				this.ws = ws;

				const setupMessage: SetupMessage = {
					setup: this.config,
				};
				this._sendDirect(setupMessage);
				this.log('client.send', 'setup');

				ws.removeEventListener('error', onError);
				ws.addEventListener('close', (ev: CloseEvent) => {
					console.log(ev);
					this.disconnect(ws);
					let reason = ev.reason || '';
					if (reason.toLowerCase().includes('error')) {
						const prelude = 'ERROR]';
						const preludeIndex = reason.indexOf(prelude);
						if (preludeIndex > 0) {
							reason = reason.slice(
								preludeIndex + prelude.length + 1,
								Infinity
							);
						}
					}
					this.log(
						`server.${ev.type}`,
						`disconnected ${reason ? `with reason: ${reason}` : ``}`
					);
					this.emit('close', ev);
				});
				resolve(true);
			});
		});
	}

	disconnect(ws?: WebSocket) {
		// 清理重连状态
		this.isReconnecting = false;
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}

		// could be that this is an old websocket and theres already a new instance
		// only close it if its still the correct reference
		if ((!ws || this.ws === ws) && this.ws) {
			this.ws.close();
			this.ws = null;
			this.log('client.close', `Disconnected`);
			return true;
		}
		return false;
	}

	protected async receive(blob: Blob) {
		const response: LiveIncomingMessage = (await blobToJSON(
			blob
		)) as LiveIncomingMessage;
		if (isToolCallMessage(response)) {
			this.log('server.toolCall', response);
			this.emit('toolcall', response.toolCall);
			return;
		}
		if (isToolCallCancellationMessage(response)) {
			this.log('receive.toolCallCancellation', response);
			this.emit('toolcallcancellation', response.toolCallCancellation);
			return;
		}

		if (isSetupCompleteMessage(response)) {
			this.log('server.send', 'setupComplete');
			this.emit('setupcomplete');
			return;
		}

		// this json also might be `contentUpdate { interrupted: true }`
		// or contentUpdate { end_of_turn: true }
		if (isServerContenteMessage(response)) {
			const { serverContent } = response;
			if (isInterrupted(serverContent)) {
				this.log('receive.serverContent', 'interrupted');
				this.emit('interrupted');
				return;
			}
			if (isTurnComplete(serverContent)) {
				this.log('server.send', 'turnComplete');
				this.emit('turncomplete');
				//plausible theres more to the message, continue
			}

			if (isModelTurn(serverContent)) {
				let parts: Part[] = serverContent.modelTurn.parts;

				// when its audio that is returned for modelTurn
				const audioParts = parts.filter(
					(p) =>
						p.inlineData &&
						p.inlineData.mimeType.startsWith('audio/pcm')
				);
				this.emit('audiocontent', audioParts);
				const base64s = audioParts.map((p) => p.inlineData?.data);

				// strip the audio parts out of the modelTurn
				const otherParts = difference(parts, audioParts);
				// console.log("otherParts", otherParts);

				base64s.forEach((b64) => {
					if (b64) {
						const data = base64ToArrayBuffer(b64);
						this.emit('audio', data);
						this.log(
							`server.audio`,
							`buffer (${data.byteLength})`,
						);
					}
				});
				if (!otherParts.length) {
					return;
				}

				parts = otherParts;

				const content: ModelTurn = { modelTurn: { parts } };
				this.emit('content', content);
				this.log(`server.content`, response);
			}
		} else {
			console.log('received unmatched message', response);
		}
	}

  /**
   * send realtimeInput, this is base64 chunks of "audio/pcm" and/or "image/jpg"
   */
  sendRealtimeInput(chunks: GenerativeContentBlob[]) {
    let hasAudio = false;
    let hasVideo = false;
    for (let i = 0; i < chunks.length; i++) {
      const ch = chunks[i];
      if (ch.mimeType.includes("audio")) {
        hasAudio = true;
      }
      if (ch.mimeType.includes("image")) {
        hasVideo = true;
      }
      if (hasAudio && hasVideo) {
        break;
      }
    }
    const message =
      hasAudio && hasVideo
        ? "audio + video"
        : hasAudio
          ? "audio"
          : hasVideo
            ? "video"
            : "unknown";

    const data: RealtimeInputMessage = {
      realtimeInput: {
        mediaChunks: chunks,
      },
    };
    this._sendDirect(data);
    this.log(`client.realtimeInput`, message);
  }

	/**
	 *  send a response to a function call and provide the id of the functions you are responding to
	 */
	sendToolResponse(toolResponse: ToolResponseMessage['toolResponse']) {
		const message: ToolResponseMessage = {
			toolResponse,
		};

		this._sendDirect(message);
		this.log(`client.toolResponse`, message);
	}

	/**
	 * send normal content parts such as { text }
	 */
	send(parts: Part | Part[], turnComplete: boolean = true) {
		parts = Array.isArray(parts) ? parts : [parts];
		const formattedParts = parts.map(part => {
            if (typeof part === 'string') {
                return { text: part };
            } else if (typeof part === 'object' && !part.text && !part.inlineData) {
                return { text: JSON.stringify(part) };
            }
            return part;
        });

		const content: Content = {
			role: 'user',
			parts: formattedParts,
		};

		const clientContentRequest: ClientContentMessage = {
			clientContent: {
				turns: [content],
				turnComplete,
			},
		};

		this._sendDirect(clientContentRequest);
		this.emit('input', clientContentRequest);
		this.log(`client.send`, clientContentRequest);
	}

	/**
	 *  used internally to send all messages
	 *  don't use directly unless trying to send an unsupported message type
	 */
	_sendDirect(request: object) {
		if (!this.ws) {
			throw new Error('No websocket connection');
		}
		const str = JSON.stringify(request);
		try {
			this.ws?.send(str);
		} catch (error) {
			console.error('[WebSocket] Failed to send message:', error);
		}
	}
}
