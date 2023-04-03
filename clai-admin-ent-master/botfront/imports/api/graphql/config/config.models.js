import mongoose from 'mongoose';

const { Schema } = mongoose;

// const credentials = new Schema({ _id: String }, { strict: false, versionKey: false });
// const endpoints = new Schema({ _id: String }, { strict: false, versionKey: false });
const claiservice = new Schema({ _id: String }, { strict: false, versionKey: false });
const projects = new Schema({ _id: String }, { strict: false, versionKey: false });

// exports.Endpoints = mongoose.model('Endpoints', endpoints, 'endpoints');
// exports.Credentials = mongoose.model('Credentials', credentials, 'credentials');
exports.ClaiService = mongoose.model('ClaiService', claiservice, 'claiservice');
exports.Projects = mongoose.model('Projects', projects, 'projects');
