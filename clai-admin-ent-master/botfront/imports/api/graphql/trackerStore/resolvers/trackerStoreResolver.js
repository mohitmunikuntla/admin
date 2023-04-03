/* eslint-disable no-unused-vars */
import {
    getTracker,
    upsertTrackerStore,
} from '../mongo/trackerStore';
import { ClaiService } from './../../config/config.models.js';

export default {
    Query: {
        async trackerStore(_, args, __) {
            const {clai_env} = args;
            const configprojectId = await ClaiService.findOne({claiservice: clai_env})
                .select({ projectId: 1 }).lean().exec();
            const projectId = configprojectId.projectId;
            return getTracker(args.senderId, projectId, args.after, args.maxEvents);
        },
    },
    Mutation: {
        async insertTrackerStore(_, args, __) {
            const {clai_env} = args;
            const configprojectId = await ClaiService.findOne({claiservice: clai_env})
                .select({ projectId: 1 }).lean().exec();
            const projectId = configprojectId.projectId;
            args.projectId = projectId;
            const response = await upsertTrackerStore(args);
            return response;
        },
        async updateTrackerStore(_, args, __) {
            const {clai_env} = args;
            const configprojectId = await ClaiService.findOne({claiservice: clai_env})
                .select({ projectId: 1 }).lean().exec();
            const projectId = configprojectId.projectId;
            args.projectId = projectId;
            const response = await upsertTrackerStore(args);
            return response;
        },
    },
    trackerStoreInfo: {
        tracker: (parent, _, __) => parent.tracker,
        lastIndex: (parent, _, __) => parent.trackerLen,
        lastTimestamp: (parent, _, __) => parent.lastTimeStamp,
    },
};
