import SimpleSchema from 'simpl-schema';

export const StoryGroupSchema = new SimpleSchema(
    {
        name: { type: String },
        projectId: { type: String },
        createdAt: {
            type: Date,
            optional: true,
        },
        updatedAt: {
            type: Date,
            optional: true,
            autoValue: () => new Date(),
        },
        selected: { type: Boolean, defaultValue: false },
        smartGroup: { type: Object, blackbox: true, optional: true },
        children: { type: Array, defaultValue: [] },
        'children.$': String,
        //isExpanded: { type: Boolean, defaultValue: true }, -->removed to fix concurrency list view issue
        expandedUsers: { type: Array, defaultValue: [] },
        'expandedUsers.$': String,
        pinned: { type: Boolean, defaultValue: false },
        hideIfEmpty: { type: Boolean, defaultValue: false },
    },
    { tracker: Tracker },
);
