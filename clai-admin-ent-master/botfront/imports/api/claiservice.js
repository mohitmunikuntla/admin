import SimpleSchema from 'simpl-schema';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import { safeLoad, safeDump } from 'js-yaml';
import { get } from 'lodash';
import { getWebchatRules } from './graphql/config/webchatProps';
import { checkIfCan } from '../lib/scopes';
import { formatError, validateYaml } from '../lib/utils';
import { GlobalSettings } from './globalSettings/globalSettings.collection';
import { ENVIRONMENT_OPTIONS } from '../ui/components/constants.json';
import { Projects } from './project/project.collection';
import * as fs from 'fs';

export const ClaiService = new Mongo.Collection('claiservice');
// Deny all client-side updates on the ClaiService collection
ClaiService.deny({
    insert() {
        return true;
    },
    update() {
        return true;
    },
    remove() {
        return true;
    },
});

const getDefaultClaiService = ({ namespace }) => {
    if (!Meteor.isServer) throw new Meteor.Error(401, 'Unauthorized');
    const fields = {
        'settings.private.defaultClaiService': 1,
    };
    let { settings: { private: { defaultClaiService = '' } = {} } = {} } = GlobalSettings.findOne({}, { fields }) || {};
    return defaultClaiService.replace(/{PROJECT_NAMESPACE}/g, namespace);
};

export const createClaiService = ({ _id: projectId, namespace }) => {
    ClaiService.insert({
        projectId,
        environment: "development",
        claiservice: getDefaultClaiService({ namespace }),
    });
};

export const ClaiServiceSchema = new SimpleSchema(
    {
        claiservice: {
            type: String, optional: true
        },
        environment: { type: String, optional: true },
        projectId: { type: String },
        createdAt: {
            type: Date,
            optional: true,
            // autoValue: () => this.isUpdate ? this.value : new Date() //TODO find out why it's always updated
        },
        updatedAt: {
            type: Date,
            optional: true,
            autoValue: () => new Date(),
        },
    },
    { tracker: Tracker },
);

Meteor.startup(() => {
    if (Meteor.isServer) {
        ClaiService._ensureIndex({ projectId: 1, updatedAt: -1 });
    }
});

ClaiService.attachSchema(ClaiServiceSchema);
if (Meteor.isServer) {
    import { auditLog } from '../../server/logger';

    Meteor.publish('claiservice', function (projectId) {
        try {
            checkIfCan(['nlu-data:r', 'services:r', 'responses:r'], projectId);
        } catch (err) {
            return this.ready();
        }
        check(projectId, String);
        return ClaiService.find({ projectId });
    });

    Meteor.publish('claiservice.services', function () {
        return ClaiService.find({}, { fields: { projectId: 1, environment: 1, claiservice: 1 } });
    });

    Meteor.methods({
        'claiservice.save'(claiservice) {
            checkIfCan(['claiservice:w', 'import:x'], claiservice.projectId);
            check(claiservice, Object);
            try {
                const env = claiservice.environment || 'development';
                const envQuery = env !== 'development'
                    ? { environment: env }
                    : {
                        $or: [
                            { environment: env },
                            { environment: { $exists: false } },
                        ],
                    };
                const claiserviceBefore = ClaiService.findOne({
                    projectId: claiservice.projectId,
                    ...envQuery,
                });
                auditLog('Saved claiservice', {
                    user: Meteor.user(),
                    projectId: claiservice.projectId,
                    type: 'updated',
                    operation: 'claiservice-updated',
                    resId: claiservice._id,
                    after: { claiservice },
                    before: { claiservice: claiserviceBefore },
                    resType: 'claiservice',
                });
                return ClaiService.upsert(
                    { projectId: claiservice.projectId, ...envQuery },
                    { $set: { claiservice: claiservice.claiservice } },
                );
            } catch (e) {
                throw formatError(e);
            }
        },
        async 'claiservice.update'(item) {
            checkIfCan(['claiservice:w', 'import:x'], item.projectId);
            check(item, Object);
            try {
                return ClaiService.update({ _id: item._id }, { $set: item });
            } catch (e) {
                throw formatError(e);
            }
        },
        async 'claiservice.updateNewProject'(item) {
            checkIfCan(['claiservice:w', 'import:x'], item.projectId);
            check(item, Object);
            try {
                return ClaiService.update({ projectId: item.projectId, environment: 'development' }, { $set: item });
            } catch (e) {
                throw formatError(e);
            }
        },
        'claiservice.setup'() {
            try {
                var claiservice = {};
                if(process.env.CLAIENVSPATH == undefined || null) {
                    // const fields = {
                    //     'settings.private.CLAIENVSPATH': 1,
                    // };
                    // let { settings: { private: { CLAIENVSPATH = '' } = {} } = {} } = GlobalSettings.findOne({}, { fields }) || {};
                    // claiservice = safeLoad(Assets.getText(CLAIENVSPATH));
                    console.error("Service file doesn't exist")
                } else {
                    if(fs.existsSync(process.env.CLAIENVSPATH)){
                        claiservice = safeLoad(fs.readFileSync(process.env.CLAIENVSPATH));
                        // const claiservice = safeLoad(Assets.getText(process.env.CLAIENVSPATH));
                        return claiservice;
                    } else console.error("Service file doesn't exist")
                }
            } catch (e) {
                throw formatError(e);
            }
        },
        async 'claiservice.deleteservice'(
            item
        ) {
            checkIfCan(['claiservice:w', 'import:x'], item.projectId);
            check(item, Object);
            try {
                return ClaiService.update({_id: item._id}, {$unset: {claiservice: ''}});
            } catch (e) {
                throw formatError(e);
            }
        },
        async 'claiservice.nlu_instance'(projectId) {
            let claiservice;
            var instance = {};
            const instanceProject = Projects.findOne({_id: projectId});
            let service = instanceProject.trainingService;
            if(service == null || undefined) service = instanceProject.defaultDevelopmentService;
            if(fs.existsSync(process.env.CLAIENVSPATH)){    
                claiservice = safeLoad(fs.readFileSync(process.env.CLAIENVSPATH));
                let services = Object.keys(claiservice);
                if(services.includes(service)){
                    instance = claiservice[service]['instances'];
                    return instance;
                }
            } else console.log(service,"has no instances");
        },
        async 'claiservice.nlu_API'(projectId) {
            let claiservice;
            var instance = {};
            const instanceProject = Projects.findOne({_id: projectId});
            let service = instanceProject.defaultDevelopmentService;
            if(service == null || '') {console.log(projectId,"has no development service."); return instance};
            if(fs.existsSync(process.env.CLAIENVSPATH)){    
                claiservice = safeLoad(fs.readFileSync(process.env.CLAIENVSPATH));
                let services = Object.keys(claiservice);
                if(services.includes(service)){
                    instance = claiservice[service]['instances'];
                } else console.log(service,"has no instances");
            }
            return instance;
        },
        async 'claiservice.allservices'() {
            try {
                const fields = {
                    'settings.private.CLAIENVSPATH': 1,
                };
                let { settings: { private: { CLAIENVSPATH = '' } = {} } = {} } = GlobalSettings.findOne({}, { fields }) || {};
                let allServices = ClaiService.find({}, {fields: {claiservice: 1} });
                // let project = Projects.find({projectId}, {fields: {defaultDevelopmentService:1, defaultProductionService:1}});
                var aproject = [];
                allServices.forEach((element)=> {
                    aproject.includes(element.claiservice) ? null : 
                    // ((element.claiservice == project.defaultDevelopmentService || project.defaultProductionService) ? null : 
                    aproject.push(element.claiservice)
                    // )
                });
                // aproject.push(project.defaultDevelopmentService);
                // aproject.push(project.defaultProductionService);
                var notusedservices;
                if(process.env.CLAIENVSPATH == undefined || null) {
                    notusedservices = Object.keys(safeLoad(Assets.getText(CLAIENVSPATH)));
                } else {
                    if(fs.existsSync(process.env.CLAIENVSPATH)){    
                        let claiservice = safeLoad(fs.readFileSync(process.env.CLAIENVSPATH));
                        notusedservices = Object.keys(claiservice);
                    } else console.error("Service file doesn't exist")
                }
                return notusedservices;
            } catch(e) {
                throw formatError(e)
            }
        },
        async 'claiservice.avaliableservices'() {
            try {
                const fields = {
                    'settings.private.CLAIENVSPATH': 1,
                };
                let { settings: { private: { CLAIENVSPATH = '' } = {} } = {} } = GlobalSettings.findOne({}, { fields }) || {};
                let allServices = ClaiService.find({}, {fields: {claiservice: 1} });
                // let project = Projects.find({projectId}, {fields: {defaultDevelopmentService:1, defaultProductionService:1}});
                var aproject = [];
                allServices.forEach((element)=> {
                    aproject.includes(element.claiservice) ? null : 
                    // ((element.claiservice == project.defaultDevelopmentService || project.defaultProductionService) ? null : 
                    aproject.push(element.claiservice)
                    // )
                });
                // aproject.push(project.defaultDevelopmentService);
                // aproject.push(project.defaultProductionService);
                var notusedservices;
                if(process.env.CLAIENVSPATH == undefined || null) {
                    notusedservices = Object.keys(safeLoad(Assets.getText(CLAIENVSPATH))).filter(function(obj) { return aproject.indexOf(obj) == -1; });
                } else {
                    if(fs.existsSync(process.env.CLAIENVSPATH)){    
                        let claiservice = safeLoad(fs.readFileSync(process.env.CLAIENVSPATH));
                        notusedservices = Object.keys(claiservice).filter(function(obj) { return aproject.indexOf(obj) == -1; });
                    } else console.error("Service file doesn't exist")
                }
                return notusedservices;
            } catch(e) {
                throw formatError(e)
            }
        }
    });
}
