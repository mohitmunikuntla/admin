import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

import { checkIfCan } from '../../lib/scopes';
import { StoryGroupSchema } from './storyGroups.schema';

export const StoryGroups = new Mongo.Collection('storyGroups');

// Deny all client-side updates on the Projects collection

//-->change to fix concurrency list view issue A.C
StoryGroups.deny({
    remove() {
        return true;
    },
});

StoryGroups.allow({
    insert: function() {
        return true;
    },
    update: function() {
        return true;
    }
})


Meteor.startup(() => {
    if (Meteor.isServer) {
        StoryGroups._ensureIndex({ projectId: 1, name: 1 }, { unique: true });
    }
});

if (Meteor.isServer) {
    Meteor.publish('storiesGroup', function(projectId) {
        checkIfCan(['stories:r', 'nlu-data:x'], projectId);
        check(projectId, String);
        return StoryGroups.find({ projectId });
    });
}

StoryGroups.attachSchema(StoryGroupSchema);
