import yaml from 'js-yaml';
import { safeLoad, safeDump } from 'js-yaml';
import mongoose from 'mongoose';
import { ClaiService, Projects } from './config.models.js';
import { getWebchatRules } from './webchatProps';
import * as fs from 'fs';

export default {
    Query: {
        getConfig: async (_root, args) => {
            const { clai_env, output } = args;
            var configservice;
            if(process.env.CLAIENVSPATH == undefined || null){
                // const fields = {
                //     'settings.private.CLAIENVSPATH': 1,
                // };
                // let { settings: { private: { CLAIENVSPATH = '' } = {} } = {} } = GlobalSettings.findOne({}, { fields }) || {};
                // configservice = safeLoad(Assets.getText(CLAIENVSPATH));
                console.error("Service file doesn't exist")
            } else {
                try{
                    if(fs.existsSync(process.env.CLAIENVSPATH)){
                        configservice = safeLoad(fs.readFileSync(process.env.CLAIENVSPATH));
                    }
                } catch(err){
                    console.error(err)
                }
            }
            const services = Object.keys(configservice);
            if(services.includes(clai_env)) {
                const configprojectId = await ClaiService.findOne({claiservice: clai_env})
                    .select({ projectId: 1 }).lean().exec();
                if (configprojectId == null){
                    console.error("No project is associated with service named", clai_env);
                    let endpoints = configservice[clai_env]['endpoints'];
                    let credentials = configservice[clai_env]['credentials'];
                    // parse yaml unless yaml query param was passed
                    if (output !== 'yaml') {
                        return { endpoints, credentials };
                    }
                    credentials = yaml.safeDump(credentials, { noRefs: true });

                    return { endpoints, credentials };
                } else {
                    console.log(configprojectId.projectId, "is associated with service named", clai_env);
                    const projectId = configprojectId.projectId;
                    const endpointsFetched = configservice[clai_env]['endpoints'];
                    const credentialsFetched = configservice[clai_env]['credentials'];

                    const project = await Projects.findOne({ _id: projectId })
                        .select({ chatWidgetSettings: 1 }).lean().exec();
                    const rules = await getWebchatRules(projectId);
                    let endpoints = endpointsFetched;
                    let credentials = credentialsFetched;
                    const { chatWidgetSettings } = project;
                    const props = { ...chatWidgetSettings, rules };
                    const webchatPlusInput = credentials['rasa_addons.core.channels.webchat_plus.WebchatPlusInput'];
                    const webchatInput = credentials['rasa_addons.core.channels.webchat.WebchatInput'];
                    const restPlusInput = credentials['rasa_addons.core.channels.rest_plus.BotfrontRestPlusInput'];
                    const restInput = credentials['rasa_addons.core.channels.rest.BotfrontRestInput'];
                    if (webchatInput !== undefined) {
                        credentials['rasa_addons.core.channels.webchat.WebchatInput'] = { ...(webchatInput || {}), props };
                    }
                    if (restInput !== undefined) {
                        credentials['rasa_addons.core.channels.rest.BotfrontRestInput'] = { ...(restInput || {}), props };
                    }
                    if (webchatPlusInput !== undefined) {
                        credentials['rasa_addons.core.channels.webchat_plus.WebchatPlusInput'] = { ...(webchatPlusInput || {}), props };
                    }
                    if (restPlusInput !== undefined) {
                        credentials['rasa_addons.core.channels.rest_plus.BotfrontRestPlusInput'] = { ...(restPlusInput || {}), props };
                    }
                    // parse yaml unless yaml query param was passed
                    if (output !== 'yaml') {
                        return { endpoints, credentials };
                    }
                    credentials = yaml.safeDump(credentials, { noRefs: true });

                    return { endpoints, credentials };
                }
            } else {
                console.error('service named ' + clai_env + ' is not defined');
                return;
            }
        },
        healthCheck: async () => (mongoose.connection.readyState === 1),
    },
};
