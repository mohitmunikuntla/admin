import gql from 'graphql-tag';

const botResponseFields = gql`
    fragment CarouselElementFields on CarouselElement {
        title
        subtitle
        image_url
        default_action { title, payload_value, type, ...on WebUrlButton { url }, ...on PostbackButton { payload } }
        buttons { title, payload_value, type, ...on WebUrlButton { url }, ...on PostbackButton { payload } }
    }
    fragment TableFields on TableElement {
        limitrow
        headings
        data
        stylehead
        stylebody
    }
    fragment VideoFields on VideoElement {
        tag
        url
        type
    }
    fragment ImageFields on ImageElement {
        alt
        url
    }
    fragment BotResponseFields on BotResponsePayload {
        __typename
        metadata
        ...on TextPayload { text }
        ...on QuickRepliesPayload { text, quick_replies { title, payload_value, type, ...on WebUrlButton { url }, ...on PostbackButton { payload } } }
        ...on TextWithButtonsPayload { text, buttons { title, payload_value, type, ...on WebUrlButton { url }, ...on PostbackButton { payload } } }
        ...on ImagePayload { text, image { ...ImageFields } }
        ...on VideoPayload { text, video { ...VideoFields } }
        ...on TablePayload { text, table { ...TableFields } }
        ...on StarRatingPayload { text, starrating { title, payload_value, type, ...on PostbackButton { payload } } }
        ...on LikeDislikePayload { text, likedislike { title, payload_value, type, ...on PostbackButton { payload } } }
        ...on CarouselPayload { elements { ...CarouselElementFields } }
        ...on CustomPayload { customText: text, customImage: image, customQuickReplies: quick_replies, customButtons: buttons, customElements: elements, custom, customAttachment: attachment }
    }
`;

export const GET_BOT_RESPONSES = gql`
    query getResponses($templates: [String]!, $language: String!, $projectId: String!) {
        getResponses(projectId: $projectId, language: $language, templates: $templates) {
            key
            ...BotResponseFields
        }
    }
    ${botResponseFields}
`;

export const UPSERT_BOT_RESPONSE = gql`
mutation upsertResponse($projectId: String!, $key: String!, $newKey: String, $language: String!, $newPayload: Any, $index: Int = -1, $logging: Boolean = true, $newResponseType: String) {
    upsertResponse(projectId: $projectId, key: $key, newKey: $newKey, language: $language, newPayload: $newPayload, index: $index, logging: $logging, newResponseType: $newResponseType) {
        key
    }
}`;
