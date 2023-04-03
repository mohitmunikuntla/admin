import SimpleSchema from "simpl-schema";

export const ImageSchema = new SimpleSchema({
    "text": String,
    "image": String,
    "alt": String,
}, {tracker: Tracker});

export const VideoSchema = new SimpleSchema({
    "text": String,
    "video.$.url": String,
    "video.$.type": String,
    "video.$.tag": String
}, {tracker: Tracker});

export const TableSchema = new SimpleSchema({
    "text": String,
    "table.$.data": Array,
    "table.$.headings": Array,
    "table.$.limitdata": String,
    "table.$.stylehead": String,
    "table.$.stylebody": String,
}, {tracker: Tracker});

export const QuickRepliesSchema = new SimpleSchema({
    "text": String,
    "buttons": {type: Array, maxCount:10, minCount:1},
    "buttons.$": Object,
    "buttons.$.title": String,
    "buttons.$.payload": String,
    "buttons.$.payload_value": String
}, {tracker: Tracker});

export const TextSchema = new SimpleSchema({
    "text": String,
}, {tracker: Tracker});

export const CarouselSchema = new SimpleSchema({
    "text": {type: String, optional: true},
    "elements": {type: Array, maxCount:10, minCount:1},
    "elements.$": Object,
    "elements.$.title": String,
    "elements.$.buttons": {type:Array, minCount: 1, maxCount: 3},
    "elements.$.buttons.$": Object,
    "elements.$.buttons.$.title": String,
    "elements.$.buttons.$.payload": {type: String, required: false},
    "elements.$.buttons.$.url": {type: String, required: false}
}, {tracker: Tracker});

export const StarRatingSchema = new SimpleSchema({
    "text": String,
    "buttons.$": Object,
    "buttons.$.title": String,
    "buttons.$.payload": String,
    "buttons.$.payload_value": String
}, {tracker:  Tracker});

export const LikeDislikeSchema = new SimpleSchema({
    "text": String,
    "buttons": Array,
    "buttons.$": Object,
    "buttons.$.title": String,
    "buttons.$.payload": String,
    "buttons.$.payload_value": String
}, {tracker:  Tracker});
