import SimpleSchema from 'simpl-schema';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import { safeLoad, safeDump } from 'js-yaml';
import { get } from 'lodash';
import { getWebchatRules } from './graphql/config/webchatProps';
import { ClaiService } from './claiservice';
import { Projects } from './project/project.collection';
import { checkIfCan } from '../lib/scopes';
import { createAxiosForRasa, formatError, validateYaml } from '../lib/utils';
import { GlobalSettings } from './globalSettings/globalSettings.collection';
import { ENVIRONMENT_OPTIONS } from '../ui/components/constants.json';
import * as fs from 'fs';
import * as path from 'path';
import md5 from 'md5';

export const Models = new Mongo.Collection('models');

Models.deny({
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

export const createModels = ({ _id: projectId, namespace }) => {
    Models.insert({
        environment : "development",
        projectid: projectId,
        createdat: new Date()
    });
};

export const ModelsSchema = new SimpleSchema(
    {
        file: {
            type: String, optional: true
        },
        environment: { type: String, optional: true },
        projectid: { type: String, optional: true },
        createdat: {
            type: Date,
            optional: true,
            // autoValue: () => this.isUpdate ? this.value : new Date() //TODO find out why it's always updated
        },
        hash: { type: String, optional: true },
        publisheddate: { type: Date, optional: true },
        updatedat: {
            type: Date,
            optional: true,
            autoValue: () => new Date(),
        },
    },
    { tracker: Tracker },
);

Meteor.startup(() => {
    if (Meteor.isServer) {
        Models._ensureIndex({ projectid: 1, updatedat: -1 });
    }
});

Models.attachSchema(ModelsSchema);
if(Meteor.isServer) {
    
    Meteor.publish('models', function (projectId) {
        try {
            checkIfCan(['nlu-data:r', 'projects:r', 'responses:r'], projectId);
        } catch (err) {
            return this.ready();
        }
        check(projectId, String);
        return Models.find({ projectid: projectId });
    });

    Meteor.publish('models.all', function () {
        return Models.find({});
    });

    Meteor.methods({
        async 'models.delete'(
            item
        ) {
            checkIfCan(['models:w', 'import:x'], item.projectid);
            check(item, Object);
            try {
                if(process.env.CLAIMODELSPATH == undefined) {
                    // const fields = {
                    //     'settings.private.CLAIMODELSPATH': 1,
                    // };
                    // let { settings: { private: { CLAIMODELSPATH = '' } = {} } = {} } = GlobalSettings.findOne({}, { fields }) || {};
                    // if (!fs.existsSync(CLAIMODELSPATH)){
                    //     fs.mkdirSync(CLAIMODELSPATH, { recursive: true });
                    // }
                    // fs.unlinkSync(CLAIMODELSPATH+'/'+item.file, function(err){
                    //     if(err) console.log(err);
                    //     else {console.log(`${item.file} deleted successfully`);};
                    // });
                    // return Models.update({_id: item._id}, {$set: {file: null}});
                    console.error("Models path undefined")
                } else {
                    if (!fs.existsSync(process.env.CLAIMODELSPATH)){
                        fs.mkdirSync(process.env.CLAIMODELSPATH, { recursive: true });
                    }
                    if(item.file){
                        fs.unlinkSync(path.join(process.env.CLAIMODELSPATH, item.file), function(err){
                            if(err) console.log(err);
                            else {console.log(`${item.file} deleted successfully`);};
                        });
                    }
                    return Models.update({_id: item._id}, {$set: {file: null}});
                }
            } catch (e) {
                if(e.errno === -4058){
                    console.log("File not found");
                    return Models.update({_id: item._id}, {$set: {file: null}});
                } else throw formatError(e);
            }
        },
        // async 'models.file'(projectid) {
        //     try {
        //         var fileArray = [];
        //         if(process.env.CLAIMODELSPATH == undefined) {
        //             // const fields = {
        //             //     'settings.private.CLAIMODELSPATH': 1,
        //             //     'settings.private.webhooks': 1,
        //             // };
        //             // let { settings: { private: { CLAIMODELSPATH = '' } = {} } = {} } = GlobalSettings.findOne({}, { fields }) || {};
        //             // if (!fs.existsSync(CLAIMODELSPATH)){
        //             //     fs.mkdirSync(CLAIMODELSPATH, { recursive: true });
        //             // }
        //             // var files = fs.readdirSync(CLAIMODELSPATH);
        //             // for (const file of files) {
        //             //     fileArray.push(file);
        //             //     let regx = /production/gm;
        //             //     if(file.match(regx)){
        //             //         Models.update({projectid, environment: 'production'}, {$set:{file}});
        //             //     } else Models.update({projectid, environment: 'development'}, {$set:{file}});
        //             // }
        //             console.error("Models path undefined")
        //         } else {
        //             if (!fs.existsSync(process.env.CLAIMODELSPATH)){
        //                 fs.mkdirSync(process.env.CLAIMODELSPATH, { recursive: true });
        //             }
        //             try{
        //                 var files = fs.readdirSync(process.env.CLAIMODELSPATH);
        //                 for (const file of files) {
        //                     fileArray.push(file);
        //                     if(file.match(projectid) != null){
        //                         if(file.match(/production/gm)){
        //                             return Models.update({projectid, environment: 'production'}, {$set:{file}});
        //                         } else return Models.update({projectid, environment: 'development'}, {$set:{file}});
        //                     }
        //                 }
        //             } catch(err) {
        //                 console.error(err)
        //             }
        //         }
        //         return fileArray;
        //         // listReactFiles(CLAIMODELSPATH).then(files => console.log("files",files))
        //     } catch (e) {
        //         throw formatError(e);
        //     }
        // },
    })
}