import mongoose from 'mongoose';

const { Schema } = mongoose;

const claiservice = new Schema({ _id: String }, { strict: false, versionKey: false });
const projects = new Schema({ _id: String }, { strict: false, versionKey: false });

exports.ClaiService = mongoose.model('ClaiService', claiservice, 'claiservice');
exports.Projects = mongoose.model('Projects', projects, 'projects');