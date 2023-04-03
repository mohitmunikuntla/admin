import { safeLoad } from 'js-yaml';
import { sample } from 'lodash';
import { GraphQLScalarType } from 'graphql';
import { newGetBotResponses } from '../mongo/botResponses';
import { parseContentType } from '../../../../lib/botResponse.utils';
import commonResolvers from '../../common/commonResolver';
import { checkIfCan } from '../../../../lib/scopes';
import Projects from '../../project/project.model';
import { ClaiService } from '../../config/config.models.js';

const chooseTemplateSource = (responses, channel) => {
    // chooses between array of channel-specific responses, or channel-agnostic responses
    const variantsForChannel = responses.filter(r => r.channel === channel);
    const variantsWithoutChannel = responses.filter(r => !r.channel || !r.channel.length);
    return variantsForChannel.length
        ? variantsForChannel : variantsWithoutChannel.length
            ? variantsWithoutChannel : null;
};

const resolveTemplate = async ({
    template, projectId, language, channel = null,
}) => {
    const responses = await newGetBotResponses({
        projectId, template, language,
    });
    const source = chooseTemplateSource(responses, channel);
    if (!source) return { text: template }; // No response found, return template name

    const { payload: rawPayload, metadata } = sample(source);
    const payload = safeLoad(rawPayload);
    if (payload.key) delete payload.key;
    return { ...payload, metadata };
};

export default {
    Query: {
        getResponse: async (_root, args, context) => {
            checkIfCan('responses:r', args.clai_env, context.user._id);
            const {
                template,
                arguments: { language: specifiedLang, clai_env } = {},
                tracker: { slots } = {},
                channel: { name: channel } = {},
            } = args;
            const configprojectId = await ClaiService.findOne({claiservice: clai_env})
                .select({ projectId: 1 }).lean().exec();
            const projectId = configprojectId.projectId;
            if (!projectId) throw new Error('ProjectId missing!');
            const { languages } = await Projects.findOne(
                { _id: projectId }, { languages: 1 },
            ).lean();
            const language = specifiedLang && languages.includes(specifiedLang)
                ? specifiedLang
                : slots.fallback_language;
            return resolveTemplate({
                template, projectId, language, channel,
            });
        },
        getResponses: async (_root, {
            projectId, templates, language,
        }, context) => {
            checkIfCan('responses:r', projectId, context.user._id);
            const responses = await newGetBotResponses({
                projectId,
                template: templates,
                options: { emptyAsDefault: true },
                language,
            });
            const noMatch = templates.filter(t => !responses.map(r => r.key).includes(t))
                .map(r => ({ key: r, payload: 'text: \'\'' }));
            return [...responses, ...noMatch].map(r => ({ key: r.key, ...safeLoad(r.payload) }));
        },
    },
    ConversationInput: new GraphQLScalarType({ ...commonResolvers.Any, name: 'ConversationInput' }),
    BotResponsePayload: {
        __resolveType: parseContentType,
        metadata: ({ metadata }) => metadata,
    },
    QuickRepliesPayload: {
        text: ({ text }) => text,
        quick_replies: template => template.quick_replies,
    },
    TextWithButtonsPayload: {
        text: ({ text }) => text,
        buttons: ({ buttons }) => buttons,
    },
    ImagePayload: {
        text: ({ text }) => text,
        image: ({ image }) => image
    },
    VideoPayload: {
        text: ({ text }) => text,
        video: ({ video }) => video
    },
    TablePayload: {
        text: ({ text }) => text,
        table: ({ table }) => table,
    },
    CarouselPayload: {
        text: ({ text }) => text,
        elements: ({ elements }) => elements,
    },
    StarRatingPayload: {
        text: ({ text }) => text,
        starrating: template => template.starrating,
    },
    LikeDislikePayload: {
        text: ({ text }) => text,
        likedislike: template => template.likedislike,
    },
    CustomPayload: {
        text: ({ text }) => text,
        elements: ({ elements }) => elements,
        attachment: ({ attachment }) => attachment,
        custom: ({ custom }) => custom,
        buttons: ({ buttons }) => buttons,
        quick_replies: template => template.quick_replies,
        image: ({ image }) => image,
        table: ({table}) => table,
        video: ({ video }) => video,
        starrating: template => template.starrating,
        likedislike: template => template.likedislike
    },
    CarouselElement: {
        title: ({ title }) => title,
        subtitle: ({ subtitle }) => subtitle,
        image_url: ({ image_url: imageUrl }) => imageUrl,
        default_action: ({ default_action: defaultAction }) => defaultAction,
        buttons: ({ buttons }) => buttons,
    },
    VideoElement: {
        tag: ({ tag }) => tag,
        url: ({ url }) => url,
        type: ({ type }) => type,
    },
    ImageElement: {
        alt: ({ alt }) => alt,
        url: ({ url }) => url,
    },
    TableElement: {
        limitrow: ({ limitrow }) => limitrow,
        headings: ({ headings }) => headings,
        data: ({ data }) => data,
        stylehead: ({ stylehead }) => stylehead,
        stylebody: ({ stylebody }) => stylebody,
    },
    StarRatingElement: {
        title: ({ title }) => title,
        type: ({ type }) => type,
        payload: ({ payload }) => payload,
        payload_value: ({ payload_value }) => payload_value
    },
    LikeDislikeElement: {
        title: ({ title }) => title,
        type: ({ type }) => type,
        payload: ({ payload }) => payload,
        payload_value: ({ payload_value }) => payload_value
    },
    Button: {
        __resolveType: (v) => {
            if (v.type === 'postback') return 'PostbackButton';
            if (v.type === 'web_url') return 'WebUrlButton';
            if (v.payload) return 'PostbackButton';
            if (v.url) return 'WebUrlButton';
            return 'PostbackButton';
        },
        title: ({ title }) => title,
        type: ({ type }) => type,
        payload_value: ({ payload_value }) => payload_value
    },
    PostbackButton: {
        payload: ({ payload }) => payload,
    },
    WebUrlButton: {
        url: ({ url }) => url,
    },
};
