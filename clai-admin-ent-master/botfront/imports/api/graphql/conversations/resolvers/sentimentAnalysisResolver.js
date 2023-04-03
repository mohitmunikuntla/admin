import { getSentimentAnalysis, getTriggerFrequencies, getUtteranceFrequencies } from '../mongo/sentimentAnalysis';
import { checkIfCan } from '../../../../lib/scopes';

export default {
    Query: {
        async sentimentAnalysis(parent, args, context, info) {
            checkIfCan('analytics:r', args.projectId, context.user._id);
            if (!args.projectId) throw new Error('ProjectId is required');
            if (args.intentTypeFilter === 'trigger') {
                return getTriggerFrequencies(args);
            }
            if (args.intentTypeFilter === 'utterance') {
                return getUtteranceFrequencies(args);
            }
            return getSentimentAnalysis(args);
        },
    },
    SentimentAnalysis: {
        name: (parent, args, context, info) => parent.name,
        frequency: (parent, args, context, info) => parent.frequency,
        count: (parent, args, context, info) => parent.count,
    },

};
