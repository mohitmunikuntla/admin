import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { Accounts } from 'meteor/accounts-base';
import dotenv from 'dotenv';
import { createGraphQLPublication } from 'meteor/swydo:ddp-apollo';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { get } from 'lodash';
import { typeDefsWithUpload, resolvers } from '../imports/api/graphql/index';
import { getAppLoggerForFile } from './logger';
import { Projects } from '../imports/api/project/project.collection';
import { Instances } from '../imports/api/instances/instances.collection';
import { createAxiosForRasa } from '../imports/lib/utils';
import * as fs from 'fs';
import { safeLoad, safeDump } from 'js-yaml';

const fileAppLogger = getAppLoggerForFile(__filename);

Meteor.startup(function() {
    if (Meteor.isServer) {
        const packageInfo = require('./../package.json');
        const schema = makeExecutableSchema({
            typeDefs: typeDefsWithUpload, // makeExecutableSchema need to define upload when working with files
            resolvers,
        });

        createGraphQLPublication({
            schema,
        });
        dotenv.config({
            path: `${process.env.PWD}/.env`,
        });
        // Set ambiguous error messages on login errors
        // eslint-disable-next-line no-underscore-dangle
        Accounts._options.ambiguousErrorMessages = true;

        // Set up rate limiting on login
        Accounts.removeDefaultRateLimit();
        DDPRateLimiter.setErrorMessage((r) => {
            const { timeToReset } = r;
            const time = Math.ceil(timeToReset / 60000);
            return `Too many requests. Try again in ${time} minutes.`;
        });
        DDPRateLimiter.addRule(
            {
                userId: null,
                clientAddress: null,
                type: 'method',
                name: 'login',
                // eslint-disable-next-line no-unused-vars
                connectionId: connectionId => true,
            },
            5,
            300000,
        );

        // name changed to Clai (A.C)
        fileAppLogger.info(`Clai ${packageInfo.version} started`);
        Meteor.setInterval(async () => {
            try {
                const instancesInfo = await Projects.find({});
                // const instancesInfo = await Instances.find();
                const newStatuses = await Promise.all(instancesInfo.map(async (instance) => {
                    let service = instance.trainingService;
                    if(service == null || undefined) service = instance.defaultDevelopmentService;
                    if(fs.existsSync(process.env.CLAIENVSPATH)){    
                        let claiservice = safeLoad(fs.readFileSync(process.env.CLAIENVSPATH));
                        let services = Object.keys(claiservice);
                        if(services.includes(service)){
                            let instanceState;
                            try {
                                const client = await createAxiosForRasa(instance._id);
                                const data = await client.get('/status');
                                instanceState = get(data, 'data.num_active_training_jobs', -1);
                            } catch (e) {
                                instanceState = -1;
                            }
                            if (instanceState >= 1) return { status: 'training', projectId: instance._id };
                            if (instanceState === 0) return { status: 'notTraining', projectId: instance._id };
                            if (instanceState === -1) return { status: 'notReachable', projectId: instance._id };
                        } else {
                            return { status: 'notReachable', projectId: instance._id };
                        }
                    }
                }));
                newStatuses.forEach((status) => {
                    Projects.update({ _id: status.projectId }, { $set: { 'training.instanceStatus': status.status } });
                });
            } catch (e) {
                // eslint-disable-next-line no-console
                console.log(e);
                // eslint-disable-next-line no-console
                console.log('Something went wrong while trying to get the rasa status');
            }
        }, 10000); // run every 10 seconds == 10000 msec
    }
});
