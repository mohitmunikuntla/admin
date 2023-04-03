import conversationLengthsResolver from './conversationLengthsResolver';
import conversationDurationsResolver from './conversationDurationsResolver';
import intentFrequenciesResolver from './intentFrequenciesResolver';
import sentimentAnalysisResolver from './sentimentAnalysisResolver';
import conversationCountsResolver from './conversationCountsResolver';
import actionCountsResolver from './actionCountsResolver';
import conversationsResolver from './conversationsResolver';
import funnelResolver from './conversationsFunnelResolver';


export default [
    conversationLengthsResolver,
    conversationDurationsResolver,
    intentFrequenciesResolver,
    sentimentAnalysisResolver,
    conversationCountsResolver,
    actionCountsResolver,
    conversationsResolver,
    funnelResolver,
];
