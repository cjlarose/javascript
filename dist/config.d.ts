/// <reference types="node" />
/// <reference types="request" />
import https = require('https');
import request = require('request');
import api = require('./api');
import { Cluster, User, Context } from './config_types';
export declare class KubeConfig {
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
    constructor();
    getContexts(): Context[];
    getClusters(): Cluster[];
    getUsers(): User[];
    getCurrentContext(): string;
    setCurrentContext(context: string): void;
    static findObject(list: Object[], name: string, key: string): any;
    private getCurrentContextObject();
    getContextObject(name: string): any;
    getCurrentCluster(): any;
    getCluster(name: string): any;
    getCurrentUser(): any;
    getUser(name: string): any;
    loadFromFile(file: string): void;
    private bufferFromFileOrString(file, data);
    private getAuthorizationToken();
    private getHttpsCredentials();
    applyToHttpsOptions(opts: https.RequestOptions): void;
    applyToRequest(opts: request.Options): void;
    loadFromString(config: string): void;
}
export interface Client {
    setDefaultAuthentication(auth: api.Authentication): void;
}
export declare class Config {
    static SERVICEACCOUNT_ROOT: string;
    static SERVICEACCOUNT_CA_PATH: string;
    static SERVICEACCOUNT_TOKEN_PATH: string;
    static fromFile<T extends Client>(filename: string, ctor: new (baseUri: string) => T): T;
    static fromCluster<T extends Client>(ctor: new (baseUri: string) => T): T;
    static defaultClient<T extends Client>(ctor: new (baseUri: string) => T): T;
}
