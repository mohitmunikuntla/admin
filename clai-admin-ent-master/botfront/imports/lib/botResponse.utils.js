import { safeLoad, safeDump } from 'js-yaml';
import { clearTypenameField } from './client.safe.utils';

export const checkContentEmpty = (content) => {
    if (!content) return false;
  
    switch (true) {
    case content.custom && Object.keys(content.custom).length > 0:
        // custom response
        return true;
    case content.image && content.image.length > 0:
        // image response
        return true;
    case content.video && content.video.length > 0:
        // video response
        return true;
    case content.table && content.table.length > 0:
        // table response
        return true;
    case content.starrating && content.starrating.length > 0:
        // starrating response
        return true;
    case content.likedislike && content.likedislike.length > 0:
        // likedislike response
        return true;
    case !!(content.text && content.text.length > 0 && content.buttons):
        // quick reply response with text
        return true;
    case !!(content.buttons && content.buttons.length > 0 && content.buttons[0].title && content.buttons[0].title.length):
        // quick reply response with buttons
        return true;
    case content.text && content.text.length > 0 && !content.buttons:
        // text response
        return true;
    case content.elements && content.elements.length > 0 && (
        // content.elements[0].image_url
        // && content.elements[0].image_url.length > 0)
        // || (content.elements[0].video_url
        // && content.elements[0].video_url.length > 0)
        // || (content.elements[0].data
        // && content.elements[0].data.length > 0)
        (content.elements[0].title
        && content.elements[0].title.length > 0)
        || (content.elements[0].subtitle
        && content.elements[0].subtitle.length > 0)
        || (content.elements[0].buttons
        && content.elements[0].buttons.length > 0)
        || (content.elements[0].default_action)):
        // carrousel response
        return true;
    default:
        return false;
    }
};

export const checkResponseEmpty = (response) => {
    let isEmpty = true;
    if (response.metadata) return false;
    if (response.key !== 'utter_') return false;
    response.values.forEach((value) => {
        if (!isEmpty) return;
        value.sequence.forEach((variation) => {
            const content = safeLoad(variation.content);
            if (checkContentEmpty(content)) {
                isEmpty = false;
            }
        });
    });
    return isEmpty;
};

export const defaultCarouselSlide = () => ({
    title: '', subtitle: '', image_url: '', buttons: [],
});

export const defaultTable = () => ({
    limitrow: 5,
    headings: [],
    data: [],
    stylehead: 'border:1px solid silver;padding:8px;background:#000;color:#fff',
    stylebody: 'border:1px solid silver;padding:8px;color:black',
});

export const defaultVideo = () => ({
    tag: '',
    url: '',
    type: '',
})

export const defaultImage = () => ({
    alt: '',
    url: ''
})

export const defaultStarRating = () => ({
    title: '',
    type: 'postback',
    payload: '',
    payload_value: ''
});

export const defaultLikeDislike = () => ({
    title: '',
    type: 'postback',
    payload: '',
    payload_value: ''
});

export const defaultTemplate = (template) => {
    switch (template) {
    case 'TextPayload':
        return { text: '', __typename: 'TextPayload' };
    case 'QuickRepliesPayload':
        return {
            __typename: 'QuickRepliesPayload',
            text: '',
            quick_replies: [
                {
                    title: '', type: 'postback', payload: '', payload_value: '',
                },
            ],
        };
    case 'TextWithButtonsPayload':
        return {
            __typename: 'TextWithButtonsPayload',
            text: '',
            buttons: [
                {
                    title: '', type: 'postback', payload: '', payload_value: '',
                },
            ],
        };
    case 'StarRatingPayload':
        return {
            __typename: 'StarRatingPayload',
            text: '',
            starrating: [
                {
                    title: '', type: 'postback', payload: '', payload_value: '',
                },
            ],
        };
    case 'CustomPayload':
        return { __typename: 'CustomPayload', custom: {} };
    case 'ImagePayload':
        return {
            image: defaultImage(), __typename: 'ImagePayload'
        };
    case 'VideoPayload':
        return {
            video: defaultVideo(), __typename: 'VideoPayload',
        };
    case 'TablePayload':
        return {
            table: defaultTable(), __typename: 'TablePayload',
        };
    case 'LikeDislikePayload':
        return {
            __typename: 'LikeDislikePayload',
            text: '',
            likedislike: [
                {
                    title: '', type: 'postback', payload: '', payload_value: '',
                },
            ],
        };
    case 'CarouselPayload':
        return {
            elements: [defaultCarouselSlide()],
            __typename: 'CarouselPayload',
        };
    default:
        return null;
    }
};

export const createResponseFromTemplate = (type, language, options = {}) => {
    const { key: incommingKey } = options;
    const key = incommingKey || 'utter_';
    const newTemplate = {
        key,
        values: [
            {
                sequence: [{ content: safeDump(defaultTemplate(type)) }],
                lang: language,
            },
        ],
    };
    return newTemplate;
};

const excludeAllButOneKey = (content, key) => {
    const included = ['image', 'video', 'table', 'buttons', 'elements', 'custom', 'attachment', 'quick_replies', 'alt', 'starrating', 'likedislike']
        .filter(k => Object.keys(content).includes(k));
    if (key) return included.length === 1 && included[0] === key;
    return included.length === 0;
};

export const parseContentType = (content) => {
    switch (true) {
    // first case is the elsewhere case when embedded fields don't match graphql-defined type
    // could not find a way to use graphql existing parseValue method for given type, so using
    // this less than perfect piece of code
    case ([
        // (content.image === undefined || typeof content.image === 'string'),
        (content.buttons === undefined || Array.isArray(content.buttons)),
        (content.quick_replies === undefined || Array.isArray(content.quick_replies)),
        (content.starrating === undefined || Array.isArray(content.starrating)),
        (content.likedislike === undefined || Array.isArray(content.likedislike)),
        (content.elements === undefined || (
            Array.isArray(content.elements)
            && content.elements.every(el => (
                typeof el === 'object'
                && (el.buttons === undefined || Array.isArray(el.buttons))
                // && (el.image_url === undefined || typeof el.image_url === 'string')
                && (el.title === undefined || typeof el.title === 'string')
                && (el.subtitle === undefined || typeof el.subtitle === 'string')
            ))
        )),
    ].some(f => !f)): return 'CustomPayload';
    case excludeAllButOneKey(content, 'image'): return 'ImagePayload';
    case excludeAllButOneKey(content, 'video'): return 'VideoPayload';
    case excludeAllButOneKey(content, 'table'): return 'TablePayload';
    case excludeAllButOneKey(content, 'quick_replies'): return 'QuickRepliesPayload';
    case excludeAllButOneKey(content, 'buttons'): return 'TextWithButtonsPayload';
    case excludeAllButOneKey(content, 'elements'): return 'CarouselPayload';
    case excludeAllButOneKey(content, 'starrating'): return 'StarRatingPayload';
    case excludeAllButOneKey(content, 'likedislike'): return 'LikeDislikePayload';
    case Object.keys(content).includes('text') && excludeAllButOneKey(content): return 'TextPayload';
    default: return 'CustomPayload';
    }
};

export const addContentType = content => ({ ...content, __typename: parseContentType(content) });

export const getDefaultTemplateFromSequence = (sequence) => {
    const content = safeLoad(sequence[0].content);
    const typeName = parseContentType((content));
    return defaultTemplate(typeName);
};

export const addResponseLanguage = (response, language) => {
    const updatedResponse = response;
    const newValue = {
        sequence: response.values
            ? [
                {
                    content: safeDump(
                        defaultTemplate(
                            parseContentType(
                                safeLoad(response.values[0].sequence[0].content),
                            ),
                        ),
                    ),
                },
            ]
            : [{ content: 'text: \'\'' }],
        lang: language,
    };
    updatedResponse.values = [...(response.values || []), newValue];
    return updatedResponse;
};

export const checkMetadataSet = (metadata) => {
    if (!metadata) return false;
    const {
        linkTarget, userInput, forceOpen, forceClose, pageChangeCallbacks = null, pageEventCallbacks = null, delayTime = null, domHighlight = null, customCss = null,
    } = metadata;
    if (linkTarget === '_blank'
        && userInput === 'show'
        && forceOpen === false
        && forceClose === false
        && pageChangeCallbacks === null
        && domHighlight === null
        && pageEventCallbacks === null
        && customCss === null
        && delayTime === null
    ) {
        return false;
    }
    return true;
};

export const addTemplateLanguage = (templates, language) => templates
    .map((template) => {
        const type = parseContentType(safeLoad(template.payload));
        const payload = safeDump(defaultTemplate(type));
        return {
            ...template,
            language,
            payload,
        };
    });

export const setTypeText = (content) => {
    const { text = '', metadata } = content;
    return {
        text,
        metadata,
        __typename: 'TextPayload',
    };
};

export const setTypeQuickReply = (content) => {
    const {
        text, buttons, quick_replies, metadata,
    } = content;
    return {
        text,
        quick_replies: quick_replies || buttons,
        metadata,
        __typename: 'QuickRepliesPayload',
    };
};

export const setTypeTextWithButtons = (content) => {
    const {
        text = '', buttons, quick_replies = [], metadata,
    } = content;
    return {
        text,
        buttons: buttons || quick_replies,
        metadata,
        __typename: 'TextWithButtonsPayload',
    };
};
export const setTypeCustom = (content) => {
    const { metadata } = content;
    return { custom: '', metadata, __typename: 'CustomPayload' };
};

export const setTypeImage = (content) => {
    const { metadata } = content;
    return { ...defaultTemplate('ImagePayload'), metadata };
};

export const setTypeVideo = (content) => {
    const { metadata } = content;
    return { ...defaultTemplate('VideoPayload'), metadata };
};

export const setTypeTable = (content) => {
    const { metadata } = content;
    return { ...defaultTemplate('TablePayload'), metadata };
};

export const setTypeCarousel = (content) => {
    const { metadata } = content;
    return { ...defaultTemplate('CarouselPayload'), metadata };
};

export const setTypeStarRating = (content) => {
    const {
        text, buttons, starrating, metadata,
    } = content;
    return {
        text,
        starrating: starrating || buttons,
        metadata,
        __typename: 'StarRatingPayload',
    };
};

export const setTypeLikeDislike = (content) => {
    const {
        text, buttons, likedislike, metadata,
    } = content;
    return {
        text,
        likedislike: likedislike || buttons,
        metadata,
        __typename: 'LikeDislikePayload',
    };
};
export const changeContentType = (content, newType) => {
    switch (newType) {
    case 'TextPayload':
        return setTypeText(content);
    case 'QuickRepliesPayload':
        return setTypeQuickReply(content);
    case 'TextWithButtonsPayload':
        return setTypeTextWithButtons(content);
    case 'ImagePayload':
        return setTypeImage(content);
    case 'VideoPayload':
        return setTypeVideo(content);
    case 'TablePayload':
        return setTypeTable(content);
    case 'CustomPayload':
        return setTypeCustom(content);
    case 'CarouselPayload':
        return setTypeCarousel(content);
    case 'StarRatingPayload':
        return setTypeStarRating(content);
    case 'LikeDislikePayload':
        return setTypeLikeDislike(content);
    default:
        throw new Error(
            `type ${newType} is not supported by changeContentType`,
        );
    }
};

export const modifyResponseType = (response, newType, language, key) => {
    if (!response) {
        return createResponseFromTemplate(newType, language, key);
    }
    const updatedValues = response.values.map((v) => {
        const sequence = v.sequence.map((s) => {
            const content = addContentType(safeLoad(s.content));
            return { ...s, content: safeDump(clearTypenameField(changeContentType(content, newType))) };
        });
        return { ...v, sequence };
    });
    return { ...response, values: updatedValues };
};

export const toggleButtonPersistence = (content) => {
    switch (content.__typename) {
    case 'QuickRepliesPayload':
        return setTypeTextWithButtons(content);
    case 'TextWithButtonsPayload':
        return setTypeQuickReply(content);
    default:
        throw new Error(
            '__typename must be TextWithButtonsPayload or QuickRepliesPayload to toggle button persistence',
        );
    }
};

export const generateRenamingErrorMessage = (error) => {
    if (!error) {
        return null;
    }
    if (!error.message) return 'an unexpected error occured while renaming this response';
    if (error.message.match(/E11000/)) {
        return 'Response names must be unique';
    }
    if (error.message.match(/alidation failed: key: Path `key` is invalid/)) {
        return 'Response names must start with utter_ and not contain spaces or /';
    }
    return error.message;
};
