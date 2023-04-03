import React from 'react';
import { browserHistory } from 'react-router';
import { Segment } from 'semantic-ui-react';
import { withTracker } from 'meteor/react-meteor-data';
import SimpleSchema from 'simpl-schema';
import SimpleSchema2Bridge from 'uniforms-bridge-simple-schema-2';
import {
    AutoForm, ErrorsField, SubmitField, TextField,
} from 'uniforms-semantic';
import { Meteor } from 'meteor/meteor';
import PropTypes from 'prop-types';
import { passwordComplexityRegex } from '../../../api/user/user.methods';
import { wrapMeteorCallback } from '../utils/Errors';
import { GlobalSettings } from '../../../api/globalSettings/globalSettings.collection';

const resetPasswordSchema = new SimpleSchema(
    {
        password: {
            type: String,
            custom() {
                return !this.value.match(passwordComplexityRegex) ? 'passwordTooSimple' : null;
            },
        },
        passwordVerify: {
            type: String,
            custom() {
                return this.value !== this.field('password').value ? 'passwordMismatch' : null;
            },
        },
    },
    { tracker: Tracker },
);

const resetPasswordSchemaBridge = new SimpleSchema2Bridge(resetPasswordSchema);

resetPasswordSchema.messageBox.messages({
    en: {
        passwordMismatch: 'The passwords are not matching. Make sure you enter the same password in both fields',
        passwordTooSimple: 'Your password should contain at least 9 characters and have uppercase, lowercase, digit and special characters',
    },
});

class ResetPassword extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
        };
    }

    handleResetPassword = ({ password }) => {
        this.setState({ loading: true });
        // eslint-disable-next-line react/prop-types
        const {
            // eslint-disable-next-line react/prop-types
            params: { token },
        } = this.props;

        Accounts.resetPassword(
            token,
            password,
            wrapMeteorCallback((err) => {
                if (err) {
                    this.setState({ loading: false });
                } else {
                    Meteor.loginWithPassword(
                        Meteor.user().emails[0].address,
                        password,
                        wrapMeteorCallback((error) => {
                            this.setState({ loading: true });
                            if (!error) browserHistory.push('/');
                        }),
                    );
                }
            }),
        );
    };

    render() {
        const { loading } = this.state;
        return (
            <Segment>
                <AutoForm model={{}} schema={resetPasswordSchemaBridge} onSubmit={this.handleResetPassword} className='ui large' disabled={loading}>
                    <ErrorsField />
                    <TextField name='password' iconLeft='lock' placeholder='Password' type='password' label={null} />
                    <TextField name='passwordVerify' iconLeft='lock' placeholder='Repeat password' type='password' label={null} />
                    <SubmitField value='RESET YOUR PASSWORD' className='black large basic fluid' />
                </AutoForm>
            </Segment>
        );
    }
}

ResetPassword.propTypes = {
    settings: PropTypes.object,
};

ResetPassword.defaultProps = {
    settings: {},
};

export default withTracker(() => {
    const settings = GlobalSettings.findOne({}, { fields: { 'settings.public.reCatpchaSiteKey': 1 } });
    return {
        settings,
    };
})(ResetPassword);
