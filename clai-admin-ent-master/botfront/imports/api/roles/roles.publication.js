import { Meteor } from 'meteor/meteor';
import { checkIfCan } from '../../lib/scopes';

if (Meteor.isServer) {
    Meteor.publish('roles', function () {
        checkIfCan(['users:r', 'roles:r', 'services:r', 'models:r'], { anyScope: true });
        return Meteor.roles.find({});
    });
}
