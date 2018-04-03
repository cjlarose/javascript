"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const querystring = require("querystring");
const web_socket_handler_1 = require("./web-socket-handler");
class Attach {
    constructor(config) {
        this.handler = new web_socket_handler_1.WebSocketHandler(config);
    }
    attach(namespace, podName, containerName, stdout, stderr, stdin, tty) {
        var query = {
            stdout: stdout != null,
            stderr: stderr != null,
            stdin: stdin != null,
            tty: tty,
            container: containerName
        };
        var queryStr = querystring.stringify(query);
        var path = `/api/v1/namespaces/${namespace}/pods/${podName}/attach?${queryStr}`;
        this.handler.connect(path, null, (stream, buff) => {
            web_socket_handler_1.WebSocketHandler.handleStandardStreams(stream, buff, stdout, stderr);
        });
    }
}
exports.Attach = Attach;
//# sourceMappingURL=attach.js.map