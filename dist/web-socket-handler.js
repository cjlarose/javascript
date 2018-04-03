"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const websocket_1 = require("websocket");
const protocols = [
    "v4.channel.k8s.io",
    "v3.channel.k8s.io",
    "v2.channel.k8s.io",
    "channel.k8s.io"
];
class WebSocketHandler {
    constructor(config) {
        this.config = config;
    }
    connect(path, textHandler, binaryHandler) {
        let opts = {};
        this.config.applyToHttpsOptions(opts);
        let client = new websocket_1.client({ 'tlsOptions': opts });
        return new Promise((resolve, reject) => {
            client.on('connect', (connection) => {
                connection.on('message', function (message) {
                    if (message.type === 'utf8') {
                        if (textHandler) {
                            textHandler(message.utf8Data);
                        }
                    }
                    else if (message.type === 'binary') {
                        if (binaryHandler) {
                            let stream = message.binaryData.readInt8(0);
                            binaryHandler(stream, message.binaryData.slice(1));
                        }
                    }
                });
                resolve(connection);
            });
            client.on('connectFailed', (err) => {
                reject(err);
            });
            var url;
            var server = this.config.getCurrentCluster().server;
            if (server.startsWith('https://')) {
                url = 'wss://' + server.substr(8) + path;
            }
            else {
                url = 'ws://' + server.substr(7) + path;
            }
            client.connect(url, protocols);
        });
    }
    static handleStandardStreams(stream, buff, stdout, stderr) {
        if (buff.length < 1) {
            return null;
        }
        if (stream == WebSocketHandler.StdoutStream) {
            stdout.write(buff);
        }
        else if (stream == WebSocketHandler.StderrStream) {
            stderr.write(buff);
        }
        else if (stream == WebSocketHandler.StatusStream) {
            // stream closing.
            if (stdout) {
                stdout.end();
            }
            if (stderr) {
                stderr.end();
            }
            return JSON.parse(buff.toString('utf8'));
        }
        else {
            console.log("Unknown stream: " + stream);
        }
        return null;
    }
    static handleStandardInput(conn, stdin) {
        stdin.on('data', (data) => {
            let buff = new Buffer(data.length + 1);
            buff.writeInt8(0, 0);
            if (data instanceof Buffer) {
                data.copy(buff, 1);
            }
            else {
                buff.write(data, 1);
            }
            conn.send(buff);
        });
        stdin.on('end', () => {
            conn.close();
        });
    }
}
WebSocketHandler.StdinStream = 0;
WebSocketHandler.StdoutStream = 1;
WebSocketHandler.StderrStream = 2;
WebSocketHandler.StatusStream = 3;
exports.WebSocketHandler = WebSocketHandler;
//# sourceMappingURL=web-socket-handler.js.map