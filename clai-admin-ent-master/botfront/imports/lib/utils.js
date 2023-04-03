import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { sample, get } from 'lodash';
import yaml from 'js-yaml';
import React from 'react';
import axios from 'axios';
import BotResponses from '../api/graphql/botResponses/botResponses.model';
import { Models } from '../api/models';
import * as fs from 'fs';
import { safeLoad, safeDump } from 'js-yaml';
import * as path from 'path';
import crypto from 'crypto'
import { GlobalSettings } from '../api/globalSettings/globalSettings.collection';
import { Instances } from '../api/instances/instances.collection';

import { checkIfCan } from './scopes';

import { Projects } from '../api/project/project.collection';
import { runTestCases } from '../api/story/stories.methods';

export const setsAreIdentical = (arr1, arr2) => (
    arr1.every(en => arr2.includes(en))
    && arr2.every(en => arr1.includes(en))
);

Meteor.callWithPromise = (method, ...myParameters) => new Promise((resolve, reject) => {
    Meteor.call(method, ...myParameters, (err, res) => {
        if (err) reject(err);
        resolve(res);
    });
});

export const formatError = (error) => {
    if (error instanceof Meteor.Error) return error;

    // eslint-disable-next-line no-console
    if (process.env.MODE === 'development') console.log(error);

    const {
        response, request, code, message, reason, errmsg,
    } = error;

    if (response && response.status && response.data) {
        // axios error
        let errorInfo = response.data;
        if (Buffer.isBuffer(errorInfo)) {
            try {
                errorInfo = JSON.parse(errorInfo.slice(0, 1000).toString());
            } catch {
                //
            }
        }
        const { error: err = {}, message: msg, reason: rs } = errorInfo || {};
        return new Meteor.Error(
            response.status,
            err.message || err.reason || msg || rs || err || message || reason,
        );
    }
    if (request && code === 'ECONNREFUSED') {
        // axios error
        return new Meteor.Error(code, `Could not reach host at ${error.config.url}`);
    }

    if (code === 11000) {
        return new Meteor.Error(code, errmsg || message || reason);
    }

    return new Meteor.Error(code, message || reason);
};

export const getBackgroundImageUrl = () => {
    const result = GlobalSettings.findOne({}, { fields: { 'settings.public.backgroundImages': 1 } });
    const { settings: { public: { backgroundImages = [] } = {} } = {} } = (result || {});
    return backgroundImages.length ? sample(backgroundImages) : null;
};

export const isEntityValid = e => e && e.entity && (!Object.prototype.hasOwnProperty.call(e, 'value') || e.value.length > 0);

export const getProjectModelFileName = (projectId, extension = null) => {
    const modelName = `model-${projectId}`;
    return extension ? `${modelName}.${extension}` : modelName;
};

export const getImageUrls = (response, excludeLang = '') => (
    response.values.reduce((vacc, vcurr) => {
        if (vcurr.lang !== excludeLang) {
            return [
                ...vacc,
                ...vcurr.sequence.reduce((sacc, scurr) => {
                    // image is for image response, image_url is for carousels
                    const { image, elements } = yaml.safeLoad(scurr.content);
                    if (!image && !elements) return sacc; // neither a image or a carousel

                    let imagesSources = [image]; // let assume the response is an imageResponse
                    if (elements) {
                        // if it's a carouselResponse image source will be replaced
                        imagesSources = elements.map(element => element.image_url);
                    }
                    return [...sacc, ...imagesSources];
                }, []),
            ];
        }
        return vacc;
    }, []));

// export const getVideoUrls = (response, excludeLang = '') => (
//     response.values.reduce((vacc, vcurr) => {
//         if (vcurr.lang !== excludeLang) {
//             return [
//                 ...vacc,
//                 ...vcurr.sequence.reduce((sacc, scurr) => {
//                     // video is for video response, image_url is for carousels
//                     const { video, elements } = yaml.safeLoad(scurr.content);
//                     if (!video && !elements) return sacc; // neither a video or a carousel

//                     let videosSources = [video]; // let assume the response is an videoResponse
//                     if (elements) {
//                         // if it's a carouselResponse video source will be replaced
//                         videosSources = elements.map(element => element.video_url);
//                     }
//                     return [...sacc, ...videosSources];
//                 }, []),
//             ];
//         }
//         return vacc;
//     }, []));

export const getWebhooks = () => {
    const {
        settings: {
            private: { webhooks },
        },
    } = GlobalSettings.findOne({}, { fields: { 'settings.private.webhooks': 1 } });
    return webhooks;
};

export const deleteImages = async (imgUrls, projectId, url, method) => Promise.all(
    imgUrls.map(imageUrl => Meteor.callWithPromise('axios.requestWithJsonBody', url, method, {
        projectId,
        uri: imageUrl,
    })),
);

// export const deleteVideos = async (vidUrls, projectId, url, method) => Promise.all(
//     vidUrls.map(videoUrl => Meteor.callWithPromise('axios.requestWithJsonBody', url, method, {
//         projectId,
//         uri: videoUrl,
//     })),
// );

export function secondsToDaysHours(sec) {
    const floorSec = Math.floor(sec);
    const d = Math.floor(floorSec / (3600 * 24));
    const h = Math.floor((floorSec % (3600 * 24)) / 3600);

    const dDisplay = d > 0 ? d + (d === 1 ? ' day, ' : ' days, ') : '';
    const hDisplay = h + (h <= 1 ? ' hour, ' : ' hours ');

    return dDisplay + hDisplay;
}

const getPostTrainingWebhook = async () => {
    const globalSettings = await GlobalSettings.findOne({ _id: 'SETTINGS' }, { fields: { 'settings.private.webhooks.postTraining': 1 } });
    return globalSettings?.settings?.private?.webhooks?.postTraining;
};

const capitalizeFirstLetter = v => `${v[0].toUpperCase()}${v.slice(1)}`;

const interpretWebhookErrors = (webhookName, resp) => {
    // Assumes any error message is in the "detail" property of the webhook response
    if (resp === undefined) throw new Meteor.Error('500', `No response from the ${webhookName} webhook`);
    if (resp.status === 404) throw new Meteor.Error('404', `${capitalizeFirstLetter(webhookName)} webhook not Found`);
    if (resp.status !== 200) throw new Meteor.Error('500', `${capitalizeFirstLetter(webhookName)} webhook: ${get(resp, 'data.detail', false) || ' rejected upload.'}`);
};

if (Meteor.isServer) {
    import {
        getAppLoggerForMethod,
        getAppLoggerForFile,
        addLoggingInterceptors,
        // eslint-disable-next-line import/no-duplicates
    } from '../../server/logger';


    const fileLogger = getAppLoggerForFile(__filename);
    Meteor.methods({

        async 'axios.requestWithJsonBody'(url, method, data) {
            let loggedData = data;
            // remplace data by placeholder for images or everything not json
            if (data.mimeType && data.mimeType !== 'application/json') loggedData = `Data is ${data.mimeType} and is not logged`;
            const appMethodLogger = getAppLoggerForMethod(
                fileLogger,
                'axios.requestWithJsonBody',
                Meteor.userId(),
                { url, method, data: loggedData },
            );

            check(url, String);
            check(method, String);
            check(data, Object);
            try {
                const axiosJson = axios.create();
                addLoggingInterceptors(axiosJson, appMethodLogger);
                // 400mb
                const maxContentLength = 400000000;
                const maxBodyLength = 400000000;
                const response = await axiosJson({
                    url, method, data, maxContentLength, maxBodyLength,
                });
                const { status, data: responseData } = response;
                return { status, data: responseData };
            } catch (e) {
                // if we console log the error here, it will write the image/model as a string, and the error message will be too bike and unusable.
                // eslint-disable-next-line no-console
                console.log('ERROR: Clai encountered an error while calling a webhook');
                return { status: 500, data: e?.response?.data || e };
            }
        },

        async reportCrash(error) {
            check(error, Object);
            try {
                const { reportCrashWebhook: { url, method } = {} } = await getWebhooks();
                if (url && method) {
                    try {
                        await Meteor.callWithPromise('axios.requestWithJsonBody', url, method, error);
                    } catch {
                        //
                    }
                    return { reported: true };
                }
                throw new Error();
            } catch {
                return { reported: false };
            }
        },

        async 'upload.image'(projectId, data) {
            checkIfCan('responses:w', projectId);
            check(projectId, String);
            check(data, Object);
            const { uploadImageWebhook: { url, method } } = await getWebhooks();
            if (!url || !method) throw new Meteor.Error('400', 'No image upload webhook defined.');
            const resp = Meteor.call('axios.requestWithJsonBody', url, method, data);
            if (resp === undefined) throw new Meteor.Error('500', 'No response from the image upload  webhook');
            if (resp.status === 404) throw new Meteor.Error('404', 'Image upload webhook not Found');
            if (resp.status !== 200) throw new Meteor.Error('500', 'Image upload rejected upload.');
            return resp;
        },

        // async 'upload.video'(projectId, data) {
        //     checkIfCan('responses:w', projectId);
        //     check(projectId, String);
        //     check(data, Object);
        //     const { uploadVideoWebhook: { url, method } } = await getWebhooks();
        //     if (!url || !method) throw new Meteor.Error('400', 'No video upload webhook defined.');
        //     const resp = Meteor.call('axios.requestWithJsonBody', url, method, data);
        //     if (resp === undefined) throw new Meteor.Error('500', 'No response from the video upload  webhook');
        //     if (resp.status === 404) throw new Meteor.Error('404', 'Video upload webhook not Found');
        //     if (resp.status !== 200) throw new Meteor.Error('500', 'Video upload rejected upload.');
        //     return resp;
        // },

        async 'delete.image'(projectId, imgSrc, key, lang) {
            checkIfCan('responses:w', projectId);
            check(projectId, String);
            check(imgSrc, String);
            check(key, String);
            const {
                deleteImageWebhook: { url, method },
            } = getWebhooks();
            if (url && method) {
                const response = await BotResponses.findOne({ projectId, key }).lean();
                const imagesUrls = getImageUrls(response, lang); // check if the url is used in any other language
                if (imagesUrls.filter(x => x == imgSrc).length < 1) {
                    deleteImages([imgSrc], projectId, url, method);
                }
            }
        },

        // async 'delete.video'(projectId, vidSrc, key, lang) {
        //     checkIfCan('responses:w', projectId);
        //     check(projectId, String);
        //     check(vidSrc, String);
        //     check(key, String);
        //     const {
        //         deleteVideoWebhook: { url, method },
        //     } = getWebhooks();
        //     if (url && method) {
        //         const response = await BotResponses.findOne({ projectId, key }).lean();
        //         const videosUrls = getVideoUrls(response, lang); // check if the url is used in any other language
        //         if (videosUrls.filter(x => x == vidSrc).length < 1) {
        //             deleteVideos([vidSrc], projectId, url, method);
        //         }
        //     }
        // },

        async 'call.deployModel'(projectId, target) {
            checkIfCan('nlu-data:x', projectId);
            check(projectId, String);
            const { gitSettings } = Projects.findOne({ _id: projectId }, { fields: { namespace: 1, gitSettings: 1 } });
            if (gitSettings?.gitString) {
                await Meteor.callWithPromise('commitAndPushToRemote', projectId, 'chore: deployment checkpoint');
            }
            // Meteor.call('credentials.appendWidgetSettings', projectId, target);
            let model = Models.find({projectid: projectId, environment: 'development'}).fetch() || [];
            var fnameSrc = model[0].file;
            try{
                if (!fs.existsSync(process.env.CLAIMODELSPATH)){
                    fs.mkdirSync(process.env.CLAIMODELSPATH, { recursive: true });
                }
                if(fnameSrc != undefined) {
                    var fnameDest = "model-"+projectId+"-"+target+".tar.gz";
                    var modelDirSrc = path.join(process.env.CLAIMODELSPATH, fnameSrc);
                    var modelDirDest = path.join(process.env.CLAIMODELSPATH, fnameDest);
                    fs.copyFileSync(modelDirSrc, modelDirDest);
                    let hash = model[0].hash;
                    let models = Models.findOne({$and: [{projectid: projectId},{environment: "production"}]});
                    if(models == undefined){
                        Models.insert({
                            environment: "production",
                            projectid: projectId,
                            createdat: new Date(),
                        });
                    }
                    Models.update({projectid: projectId, environment: target}, {$set:{file: fnameDest, hash, publisheddate: new Date(), updatedat: new Date()}});
                    const resp = {
                        data: {message: 'Your project is being deployed.'},
                        status: 200
                    }
                    return resp;
                    // calling the webhook in a test causes it to fail so we fake a successfull call to the webhook
                } else console.error("Models is undefined or file doesn't exist")
            } catch(err){
                console.error(err)
            }
        },

        async 'deploy.model'(projectId, target, isTest = false) {
            checkIfCan('nlu-data:x', projectId);
            check(target, String);
            check(projectId, String);
            check(isTest, Boolean);
            //pemari - acl - changing to enable publish to production without git repo defined.
            // await Meteor.callWithPromise('rasa.train', projectId, 'development');
            // await Meteor.callWithPromise('commitAndPushToRemote', projectId, 'chore: deployment checkpoint');
            // const result = await runTestCases(projectId);
            // if (result.failing !== 0) {
            //     throw new Meteor.Error('500', `${result.failing} test${result.failing === 1 ? '' : 's'} failed during the pre-deployment test run`);
            // }
            // const { namespace, gitSettings } = await Projects.findOne({ _id: projectId }, { fields: { namespace: 1, gitSettings: 1 } });
            const { namespace, gitSettings } = await Projects.findOne({ _id: projectId }, { fields: { namespace: 1, gitSettings: 1 } });
            //  do not retrain the model. Use the last trained model.
            // await Meteor.callWithPromise('rasa.train', projectId, 'development');
            // only commit and push to git if it is configured.
            if (gitSettings?.gitString) {
                await Meteor.callWithPromise('commitAndPushToRemote', projectId, 'chore: deployment checkpoint');
            }
            //const result = await runTestCases(projectId);
            //if (result.failing !== 0) {
            //    throw new Meteor.Error('500', `${result.failing} test${result.failing === 1 ? '' : 's'} failed during the pre-deployment test run`);
            //}

            const data = {
                projectId,
                namespace,
                //environment: target,
                environment: 'development',
                gitString: gitSettings?.gitString,
            };
            //pemari - acl - end of edit

            Meteor.call('credentials.appendWidgetSettings', projectId, target);
            const settings = GlobalSettings.findOne({ _id: 'SETTINGS' }, { fields: { 'settings.private.webhooks.deploymentWebhook': 1 } });
            const deploymentWebhook = get(settings, 'settings.private.webhooks.deploymentWebhook', {});
            const { url, method } = deploymentWebhook;
            if (!url || !method) throw new Meteor.Error('400', 'No deployment webhook defined.');
            // calling the webhook in a test causes it to fail so we fake a successfull call to the webhook
            const resp = isTest ? { status: 200, data: {} } : Meteor.call('axios.requestWithJsonBody', url, method, data);
            interpretWebhookErrors('deployment', resp);
            if (!resp.data.message || resp.data.message === '') {
                resp.data.message = 'Your project is being deployed.';
            }
            return resp;
        },
        async 'call.postTraining'(projectId, modelData) {
            checkIfCan('nlu-data:x');
            check(projectId, String);
            check(modelData, Match.Any); // There is no "bytes" type
            const trainingWebhook = await getPostTrainingWebhook();
            if (!trainingWebhook.url || !trainingWebhook.method) {
                return;
            }
            const { namespace } = await Projects.findOne({ _id: projectId }, { fields: { namespace: 1 } });
            const body = {
                projectId,
                namespace,
                model: Buffer.from(modelData).toString('base64'),
                mimeType: 'application/x-tar',
            };
            const resp = await Meteor.callWithPromise('axios.requestWithJsonBody', trainingWebhook.url, trainingWebhook.method, body);
            interpretWebhookErrors('post training', resp);
        },
        async 'call.uploadModel'(projectId, modelData) {
            checkIfCan('nlu-data:x');
            check(projectId, String);
            check(modelData, Match.Any); // There is no "bytes" type
            try{
                if (!fs.existsSync(process.env.CLAIMODELSPATH)){
                    fs.mkdirSync(process.env.CLAIMODELSPATH, { recursive: true });
                }
                if(fs.existsSync(process.env.CLAIMODELSPATH)){
                    let hash = crypto.createHash('md5').update(modelData).digest('hex');
                    let fname = "model-"+projectId+".tar.gz";
                    let modelDir = path.join(process.env.CLAIMODELSPATH, fname);
                    let models = Models.findOne({$and: [{projectid: projectId},{environment: "development"}]});
                    if(models == undefined){
                        Models.insert({
                            environment: "development",
                            projectid: projectId,
                            createdat: new Date(),
                        });
                    }
                    Models.update({projectid: projectId, environment: 'development'}, {$set:{hash, file: fname, publisheddate: new Date(), updatedat: new Date()}});
                    fs.writeFile(modelDir, modelData, function (err) {
                        if (err) throw err;
                        console.log("New Model trained");
                    });
                } else console.error("Models path is undefined")
            } catch(err) {
                console.error(err)
            }
        },
    });
}

export const validateYaml = function () {
    try {
        yaml.safeLoad(this.value);
        return null;
    } catch (e) {
        return e.reason;
    }
};


export const validateJSON = function () {
    try {
        JSON.parse(this.value);
        return null;
    } catch (e) {
        return e;
    }
};


export const formatMessage = (message) => {
    const bits = message.split('*');
    return (
        <>
            {bits.map((bit, idx) => ((idx % 2 !== 0)
                ? <b key={bit}>{bit}</b>
                : <React.Fragment key={bit}>{bit}</React.Fragment>
            ))}
        </>
    );
};

export function auditLogIfOnServer(message, meta) {
    if (Meteor.isServer) {
        import {
            auditLog,
            // eslint-disable-next-line import/no-duplicates
        } from '../../server/logger';

        auditLog(message, meta);
    }
}

export function findName(name, names) {
    const sameNamed = names.filter(c => c.replace(/ \(\d+\)/, '') === name);
    if (!sameNamed.length) return name;
    return `${name} (${sameNamed.length + 1})`;
}


export function cleanDucklingFromExamples(examples) {
    return examples.map((example) => {
        if (!example.entities) return example;
        const duckling = new RegExp('duckling', 'i');
        return {
            ...example,
            entities: example.entities.filter(entity => !duckling.test(entity.extractor)),
        };
    });
}


export function createAxiosWithConfig(instance = {}, config = {}, params = {}) {
    const client = axios.create({
        timeout: 100 * 1000,
        ...config,
        baseURL: instance.host,
        params: { ...params, token: instance.token },
    });
    return client;
}
export async function createAxiosForRasa(projectId, config = {}, params = {}) {
    let claiservice;
    let instance = {};
    const project = Projects.findOne({_id: projectId});
    let service = project.trainingService;
    if(service == null || undefined) service = project.defaultDevelopmentService;
    if(fs.existsSync(process.env.CLAIENVSPATH)){    
        claiservice = safeLoad(fs.readFileSync(process.env.CLAIENVSPATH));
        let services = Object.keys(claiservice);
        if(services.includes(service)){
            instance = claiservice[service]['instances'];
        }
    }
    // const instance = await Instances.findOne({ projectId });
    return createAxiosWithConfig(instance, config, params);
}
export async function createAxiosForRasaAPI(projectId, config = {}, params = {}) {
    let claiservice;
    let instance = {};
    const project = Projects.findOne({_id: projectId});
    let service = project.defaultDevelopmentService;
    try {
        if(fs.existsSync(process.env.CLAIENVSPATH)){    
            claiservice = safeLoad(fs.readFileSync(process.env.CLAIENVSPATH));
            let services = Object.keys(claiservice);
            if(services.includes(service)){
                instance = claiservice[service]['instances'];
            }
        }
        return createAxiosWithConfig(instance, config, params);
    } catch(e) {}
    // const instance = await Instances.findOne({ projectId });
}
