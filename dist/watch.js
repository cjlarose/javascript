"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request = require("request");
const byline_1 = require("byline");
class Watch {
    constructor(config) {
        this.config = config;
    }
    watch(path, queryParams, callback, done) {
        let url = this.config.getCurrentCluster().server + path;
        queryParams['watch'] = true;
        let headerParams = {};
        let requestOptions = {
            method: 'GET',
            qs: queryParams,
            headers: headerParams,
            uri: url,
            useQuerystring: true,
            json: true
        };
        this.config.applyToRequest(requestOptions);
        let stream = new byline_1.LineStream();
        stream.on('data', (data) => {
            let obj = null;
            if (data instanceof Buffer) {
                obj = JSON.parse(data.toString());
            }
            else {
                obj = JSON.parse(data);
            }
            if (obj['type'] && obj['object']) {
                callback(obj['type'], obj['object']);
            }
            else {
                console.log('unexpected object: ' + obj);
            }
        });
        let req = request(requestOptions, (error, response, body) => {
            if (error) {
                done(error);
            }
            done(null);
        });
        req.pipe(stream);
        return req;
    }
}
exports.Watch = Watch;
//# sourceMappingURL=watch.js.map