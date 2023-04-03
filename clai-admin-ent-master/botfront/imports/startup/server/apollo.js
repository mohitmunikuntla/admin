import mongoose from 'mongoose';
import { ApolloServer, AuthenticationError } from 'apollo-server-express';
import { WebApp } from 'meteor/webapp';
import { getUser } from 'meteor/apollo';
import { Accounts } from 'meteor/accounts-base';
import axios from 'axios';
import { typeDefs, resolvers } from '../../api/graphql/index';
import { can } from '../../lib/scopes';
import { ClaiService } from '../../api/claiservice';
import { Projects } from '../../api/project/project.collection';
import { Models } from '../../api/models';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import JSZIP from 'jszip';
import { saveAs } from 'file-saver';
import { safeLoad, safeDump } from 'js-yaml';

const MONGO_URL = process.env.MONGO_URL || `mongodb://localhost:${(process.env.METEOR_PORT || 3000) + 1}/meteor`;

export const connectToDb = () => {
    mongoose.connect(MONGO_URL, {
        keepAlive: 1,
        useUnifiedTopology: 1,
        useFindAndModify: 0,
        useNewUrlParser: 1,
        useCreateIndex: 1,
    });
    mongoose.connection.on('error', () => {
        throw new Error(`unable to connect to database: ${MONGO_URL}`);
    });
};

export const runAppolloServer = () => {
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        context: async ({ req }) => {
            const { headers: { authorization } } = req;
            let user = await getUser(authorization);
            const isHealthcheck = (req?.method === 'GET' && req?.query?.query === 'query {healthCheck}');
            if (!isHealthcheck && !user && process.env.API_KEY && process.env.API_KEY !== authorization) throw new AuthenticationError('Unauthorized');
            if (!user) user = Meteor.users.findOne({ username: 'EXTERNAL_CONSUMER' });
            if (!user) {
                Accounts.createUser({ username: 'EXTERNAL_CONSUMER' });
                user = Meteor.users.findOne({ username: 'EXTERNAL_CONSUMER' });
            }
            if (user.username === 'EXTERNAL_CONSUMER' && !can('responses:r', null, user._id)) {
                Meteor.roleAssignment.update(
                    { 'user._id': user._id },
                    { user: { _id: user._id }, scope: null, inheritedRoles: [{ _id: 'responses:r' }] },
                    { upsert: true },
                );
            }
            return ({ user });
        },
    });

    server.applyMiddleware({
        app: WebApp.connectHandlers,
        path: '/graphql',
        bodyParserConfig: { limit: process.env.GRAPHQL_REQUEST_SIZE_LIMIT || '200kb' },
    });

    WebApp.connectHandlers.use('/graphql', (req, res) => {
        if (req.method === 'GET') {
            res.end();
        }
    });

    WebApp.connectHandlers.use('/models/', (req, res) => {
        let uri = req.originalUrl;
        console.log('Request received for model', uri);
        let parts = uri.split('/');
        if(parts.length != 3){
            res.writeHead(304, 'Not Modified');
            return res.end();
        }
        let serviceid = parts[2];
        let service = ClaiService.find({claiservice: serviceid}).fetch();
        if(service.length == 0){
            console.log("No service associated with this projectId");
            res.writeHead(304, 'Not Modified');
            return res.end();
        }
        let model = Models.find({projectid: service[0].projectId, environment: service[0].environment}).fetch();
        if(model.length == 0) {
            console.log("No models exist");
            res.writeHead(304, 'Not Modified');
            return res.end();
        }
        const eTag = model[0].hash;
        if (!eTag){
            console.log('Old model found! Please train again');
            res.writeHead(304, 'Not Modified');
            return res.end();
        }
        if(model[0].file == null || undefined){
            console.log("File not found");
            res.writeHead(304, 'Not Modified');
            return res.end();
        }
        if(!fs.existsSync(path.join(process.env.CLAIMODELSPATH, model[0].file))){
            console.log("Model not found");
            res.writeHead(304, 'Not Modified');
            return res.end();
        }
        // console.log(req.headers['if-none-match'], eTag)
        if (req.headers['if-none-match'] === eTag) {
            console.log("No new model found");
            res.writeHead(304, 'Not Modified');
            return res.end();
        } 
        else {
            if (!fs.existsSync(process.env.CLAIMODELSPATH)){
                fs.mkdirSync(process.env.CLAIMODELSPATH, { recursive: true });
            }
            if(fs.existsSync(process.env.CLAIMODELSPATH)){
                var destPath=path.join(process.env.CLAIMODELSPATH, model[0].file);
                console.log("Path:",destPath)
                fs.readFile(destPath, function(err, data){
                    if(!err){
                        var headers = {
                            'ETag': eTag,
                            'Content-Type': 'application/x-tar',
                        };
                        res.writeHead(200, headers);
                        console.log("Successfully send model to rasa");
                        return res.end(data);
                    } else {
                        console.log(err)
                        res.writeHead(304, 'Not Modified');
                        return res.end();
                    }
                });
            } else {
                console.error("Models path undefined");
                res.writeHead(304, 'Not Modified');
                return res.end();
            }
        }
    });

    WebApp.connectHandlers.use('/health', (req, res) => {
        const { authorization } = req.headers;
        const headersObject = authorization ? {
            headers: {
                authorization,
            },
        } : {};
        axios.get('http://localhost:3000/graphql?query=query%20%7BhealthCheck%7D', headersObject).then((response) => {
            // handle success
            if (response.data) {
                if (response.data && response.data.data && response.data.data.healthCheck) {
                    res.statusCode = 200;
                    res.end();
                }
            } else {
                res.statusCode = 401;
                res.end();
            }
        }).catch(function () {
            res.statusCode = 500;
            res.end();
        });
    });
};

Meteor.startup(() => {
    if (Meteor.isServer) {
        connectToDb();
        runAppolloServer();
    }
});
