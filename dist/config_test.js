"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const chai_1 = require("chai");
require("mocha");
const kcFileName = "testdata/kubeconfig.yaml";
describe("Config", () => {
});
describe("KubeConfig", () => {
    describe("findObject", () => {
        it("should find objects", () => {
            let list = [
                {
                    name: "foo",
                    "cluster": {
                        some: "sub-object"
                    },
                    some: "object"
                },
                {
                    name: "bar",
                    some: "object",
                    cluster: {
                        sone: "sub-object"
                    }
                }
            ];
            // Validate that if the named object ('cluster' in this case) is inside we pick it out
            let obj1 = config_1.KubeConfig.findObject(list, "foo", "cluster");
            chai_1.expect(obj1.some).to.equal("sub-object");
            // Validate that if the named object is missing, we just return the full object
            let obj2 = config_1.KubeConfig.findObject(list, "bar", "context");
            chai_1.expect(obj2.some).to.equal("object");
            // validate that we do the right thing if it is missing
            let obj3 = config_1.KubeConfig.findObject(list, "nonexistent", "context");
            chai_1.expect(obj3).to.equal(null);
        });
    });
    describe("loadFromFile", () => {
        it("should load the kubeconfig file properly", () => {
            let kc = new config_1.KubeConfig();
            kc.loadFromFile(kcFileName);
            // check clusters
            chai_1.expect(kc.clusters.length).to.equal(2);
            let cluster1 = kc.clusters[0];
            let cluster2 = kc.clusters[1];
            chai_1.expect(cluster1.name).to.equal("cluster1");
            chai_1.expect(cluster1.caData).to.equal("CADATA");
            chai_1.expect(cluster1.server).to.equal("http://example.com");
            chai_1.expect(cluster2.name).to.equal("cluster2");
            chai_1.expect(cluster2.caData).to.equal("CADATA2");
            chai_1.expect(cluster2.server).to.equal("http://example2.com");
            // check users
            chai_1.expect(kc.users.length).to.equal(2);
            let user1 = kc.users[0];
            let user2 = kc.users[1];
            chai_1.expect(user1.name).to.equal("user1");
            chai_1.expect(user1.certData).to.equal("USER_CADATA");
            chai_1.expect(user1.keyData).to.equal("USER_CKDATA");
            chai_1.expect(user2.name).to.equal("user2");
            chai_1.expect(user2.certData).to.equal("USER2_CADATA");
            chai_1.expect(user2.keyData).to.equal("USER2_CKDATA");
            // check contexts
            chai_1.expect(kc.contexts.length).to.equal(2);
            let context1 = kc.contexts[0];
            let context2 = kc.contexts[1];
            chai_1.expect(context1.name).to.equal("context1");
            chai_1.expect(context1.user).to.equal("user1");
            chai_1.expect(context1.cluster).to.equal("cluster1");
            chai_1.expect(context2.name).to.equal("context2");
            chai_1.expect(context2.user).to.equal("user2");
            chai_1.expect(context2.cluster).to.equal("cluster2");
            chai_1.expect(kc.getCurrentContext()).to.equal("context2");
        });
        it("should fail to load a missing kubeconfig file", () => {
            // TODO: make the error check work
            // let kc = new KubeConfig();
            // expect(kc.loadFromFile("missing.yaml")).to.throw();
        });
    });
});
//# sourceMappingURL=config_test.js.map