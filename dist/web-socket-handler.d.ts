/// <reference types="node" />
import stream = require('stream');
import { connection as wsConnection } from 'websocket';
import { KubeConfig } from './config';
import { V1Status } from './api';
export declare class WebSocketHandler {
    'config': KubeConfig;
    static readonly StdinStream: number;
    static readonly StdoutStream: number;
    static readonly StderrStream: number;
    static readonly StatusStream: number;
    constructor(config: KubeConfig);
    connect(path: string, textHandler: (text: string) => void, binaryHandler: (stream: number, buff: Buffer) => void): Promise<wsConnection>;
    static handleStandardStreams(stream: number, buff: Buffer, stdout: any, stderr: any): V1Status;
    static handleStandardInput(conn: wsConnection, stdin: stream.Readable | any): void;
}
