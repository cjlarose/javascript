import https = require('https');
import fs = require('fs');
import os = require('os');
import path = require('path');

import base64 = require('base-64');
import jsonpath = require('jsonpath');
import request = require('request');
import shelljs = require('shelljs');
import yaml = require('js-yaml');
import api = require('./api');
import { Cluster, newClusters, User, newUsers, Context, newContexts } from './config_types';

export class KubeConfig {
    /**
     * The list of all known clusters
     */
    'clusters': Cluster[];

    /**
     * The list of all known users
     */
    'users': User[];

    /**
     * The list of all known contexts
     */
    'contexts': Context[];

    /**
     * The name of the current context
     */
    'currentContext': string;

    constructor() { }

    public getContexts() {
        return this.contexts;
    }

    public getClusters() {
        return this.clusters;
    }

    public getUsers() {
        return this.users;
    }

    public getCurrentContext() {
        return this.currentContext;
    }

    public setCurrentContext(context: string) {
        this.currentContext = context;
    }

    // Only really public for testing...
    public static findObject(list: Object[], name: string, key: string) {
        for (let obj of list) {
            if (obj['name'] == name) {
                if (obj[key]) {
                    return obj[key];
                }
                return obj;
            }
        }
        return null;
    }

    private getCurrentContextObject() {
        return this.getContextObject(this.currentContext);
    }

    public getContextObject(name: string) {
        return KubeConfig.findObject(this.contexts, name, 'context');
    }

    public getCurrentCluster() {
        return this.getCluster(this.getCurrentContextObject()['cluster']);
    }

    public getCluster(name: string) {
        return KubeConfig.findObject(this.clusters, name, 'cluster');
    }

    public getCurrentUser() {
        return this.getUser(this.getCurrentContextObject()['user']);
    }

    public getUser(name: string) {
        return KubeConfig.findObject(this.users, name, 'user');
    }

    public loadFromFile(file: string) {
        this.loadFromString(fs.readFileSync(file, 'utf8'));
    }

    private bufferFromFileOrString(file: string, data: string) {
        if (file) {
            return fs.readFileSync(file);
        }
        if (data) {
            return new Buffer(base64.decode(data), 'utf-8');
        }
        return null;
    }

    private getAuthorizationToken(): string | null {
        let user = this.getCurrentUser();
        let token = null;
        if (user.authProvider && user.authProvider.config) {
            let config = user.authProvider.config;
            // This should probably be extracted as auth-provider specific plugins...
            token = 'Bearer ' + config['access-token'];
            let expiry = config['expiry'];
            if (expiry) {
                let expiration = Date.parse(expiry);
                if (expiration < Date.now()) {
                    if (config['cmd-path']) {
                        let cmd = config['cmd-path'];
                        if (config['cmd-args']) {
                            cmd = cmd + ' ' + config['cmd-args'];
                        }
                        // TODO: Cache to file?
                        let result = shelljs.exec(cmd, { silent: true });
                        if (result['code'] != 0) {
                            throw new Error('Failed to refresh token: ' + result);
                        }
                        let resultObj = JSON.parse(result.stdout.toString());

                        let path = config['token-key'];
                        // Format in file is {<query>}, so slice it out and add '$'
                        path = '$' + path.slice(1, -1);

                        config['access-token'] = jsonpath.query(resultObj, path);
                        token = 'Bearer ' + config['access-token'];
                    } else {
                        throw new Error('Token is expired!');
                    }
                }
            }
        }
        if (user.token) {
            token = 'Bearer ' + user.token;
        }
        return token;
    }

    private getHttpsCredentials() {
        const cluster = this.getCurrentCluster();
        const user = this.getCurrentUser();

        return {
            ca: this.bufferFromFileOrString(cluster.caFile, cluster.caData),
            cert: this.bufferFromFileOrString(user.certFile, user.certData),
            key: this.bufferFromFileOrString(user.keyFile, user.keyData),
        };
    }

    public applyToHttpsOptions(opts: https.RequestOptions) {
        const user = this.getCurrentUser();
        const { ca, cert, key } = this.getHttpsCredentials();
        opts.ca = ca;
        opts.cert = cert;
        opts.key = key;
        const token = this.getAuthorizationToken();
        if (token) {
            opts.headers['Authorization'] = token;
        }
        if (user.username) {
          opts.auth = `${user.username}:${user.password}`;
        }
    }

    public applyToRequest(opts: request.Options) {
        let cluster = this.getCurrentCluster();
        let user = this.getCurrentUser();

        if (cluster.skipTLSVerify) {
            opts.strictSSL = false
        }
        const { ca, cert, key } = this.getHttpsCredentials();
        opts.ca = ca;
        opts.cert = cert;
        opts.key = key;
        const token = this.getAuthorizationToken();
        if (token) {
            opts.headers['Authorization'] = token;
        }
        if (user.username) {
            opts.auth = {
                username: user.username,
                password: user.password
            }
        }
    }

    public loadFromString(config: string) {
        var obj = yaml.safeLoad(config);
        if (obj['apiVersion'] != 'v1') {
            throw new TypeError('unknown version: ' + obj['apiVersion']);
        }
        this.clusters = newClusters(obj['clusters']);
        this.contexts = newContexts(obj['contexts']);
        this.users = newUsers(obj['users']);
        this.currentContext = obj['current-context'];
    }
}

export interface Client {
  setDefaultAuthentication(auth: api.Authentication): void;
}

export class Config {
    public static SERVICEACCOUNT_ROOT =
    '/var/run/secrets/kubernetes.io/serviceaccount';
    public static SERVICEACCOUNT_CA_PATH =
    Config.SERVICEACCOUNT_ROOT + '/ca.crt';
    public static SERVICEACCOUNT_TOKEN_PATH =
    Config.SERVICEACCOUNT_ROOT + '/token';

    public static fromFile<T extends Client>(filename: string, ctor: new (baseUri: string) => T): T {
        let kc = new KubeConfig();
        kc.loadFromFile(filename);

        let k8sApi = new ctor(kc.getCurrentCluster()['server']);
        k8sApi.setDefaultAuthentication(kc);

        return k8sApi;
    }

    public static fromCluster<T extends Client>(ctor: new (baseUri: string) => T): T {
        let host = process.env.KUBERNETES_SERVICE_HOST
        let port = process.env.KUBERNETES_SERVICE_PORT

        // TODO: better error checking here.
        let caCert = fs.readFileSync(Config.SERVICEACCOUNT_CA_PATH);
        let token = fs.readFileSync(Config.SERVICEACCOUNT_TOKEN_PATH);

        let k8sApi = new ctor('https://' + host + ':' + port);
        k8sApi.setDefaultAuthentication({
            'applyToRequest': (opts) => {
                opts.ca = caCert;
                opts.headers['Authorization'] = 'Bearer ' + token;
            }
        });

        return k8sApi;
    }

    public static defaultClient<T extends Client>(ctor: new (baseUri: string) => T): T {
        if (process.env.KUBECONFIG) {
            return Config.fromFile(process.env.KUBECONFIG, ctor);
        }

        let config = path.join(process.env.HOME, ".kube", "config");
        if (fs.existsSync(config)) {
            return Config.fromFile(config, ctor);
        }

        if (fs.existsSync(Config.SERVICEACCOUNT_TOKEN_PATH)) {
            return Config.fromCluster(ctor);
        }

        return new ctor('http://localhost:8080');
    }
}
