import { AutoForm, ErrorsField } from 'uniforms-semantic';
import { withTracker } from 'meteor/react-meteor-data';
import 'react-s-alert/dist/s-alert-default.css';
import { connect } from 'react-redux';
import { cloneDeep, get } from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import { Menu } from 'semantic-ui-react';
import SimpleSchema2Bridge from 'uniforms-bridge-simple-schema-2';
import { ClaiServiceSchema, ClaiService as ClaiServiceCollection } from '../../../api/claiservice';
import { Projects as ProjectsCollection } from '../../../api/project/project.collection';
import { wrapMeteorCallback } from '../utils/Errors';
import ChangesSaved from '../utils/ChangesSaved';
import SaveButton from '../utils/SaveButton';
import AceField from '../utils/AceField';
import { can } from '../../../lib/scopes';
import { ENVIRONMENT_OPTIONS } from '../constants.json';
import restartRasa from './restartRasa';

class ClaiService extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            saving: false,
            saved: false,
            showConfirmation: false,
            selectedEnvironment: 'development',
            webhook: {},
        };
        this.form = React.createRef();
    }

    componentDidMount() {
        const { projectId } = this.props;
        if (can('projects:w', projectId)) {
            Meteor.call('getRestartRasaWebhook', projectId, wrapMeteorCallback((err, result) => {
                if (err) return;
                const webhook = get(result, 'settings.private.webhooks.restartRasaWebhook', {});
                this.setState({ webhook });
            }));
        }
    }

    componentWillUnmount() {
        clearTimeout(this.successTimeout);
    }

    onSave = (claiservice) => {
        const { selectedEnvironment: environment, webhook } = this.state;
        const { projectId } = this.props;
        this.setState({ saving: true, showConfirmation: false });
        clearTimeout(this.successTimeout);
        Meteor.call(
            'claiservice.save',
            { ...claiservice, projectId, environment },
            wrapMeteorCallback((err) => {
                if (!err) {
                    this.setState({ saved: true });
                    this.successTimeout = setTimeout(() => {
                        this.setState({ saved: false });
                    }, 2 * 1000);
                }
                this.setState({ saving: false, showConfirmation: true });
            }),
        );

        if (environment && webhook && webhook.url) {
            restartRasa(projectId, webhook, environment);
        }
    }

    renderClaiService = (saving, claiservice, projectId, environment) => {
        const {
            saved, showConfirmation, selectedEnvironment, webhook,
        } = this.state;
        const hasWritePermission = can('projects:w', projectId);
        return (
            <AutoForm
                key={selectedEnvironment}
                disabled={!!saving || !hasWritePermission}
                schema={new SimpleSchema2Bridge(ClaiServiceSchema)}
                model={claiservice}
                onSubmit={this.onSave}
                ref={this.form}
                modelTransform={(mode, model) => {
                    const newModel = cloneDeep(model);
                    if (mode === 'validate' || mode === 'submit') {
                        // eslint-disable-next-line no-param-reassign
                        newModel.projectId = projectId;
                    }
                    return newModel;
                }}
            >
                {environment}
                <AceField name='claiservice' label='ClaiService' mode='yaml' data-cy='ace-field' />
                <ErrorsField />
                {showConfirmation && (
                    <ChangesSaved
                        onDismiss={() => this.setState({ saved: false, showConfirmation: false })}
                        content={(
                            <p />
                        )}
                    />
                )}
                {hasWritePermission
                    && (
                        <SaveButton
                            saved={saved}
                            saving={saving}
                            disabled={!!saving}
                            onSave={() => { this.form.current.submit(); }}
                            confirmText={webhook && webhook.url ? `Saving will restart the ${selectedEnvironment} rasa instance` : ''}
                        />
                    )}
            </AutoForm>
        );
    };

    renderLoading = () => <div />;

    renderMenuItem = (environment) => {
        const { selectedEnvironment } = this.state;
        return (
            <Menu.Item
                key={environment}
                onClick={() => { this.setState({ selectedEnvironment: environment, showConfirmation: false }); }}
                active={selectedEnvironment === environment}
                data-cy='environment-claiservice-tab'
            >
                {`${environment[0].toUpperCase()}${environment.slice(1)}`}
            </Menu.Item>
        );
    }

    renderMenu = () => {
        const { projectSettings } = this.props;
        if (!projectSettings.deploymentEnvironments) {
            return [this.renderMenuItem('development')];
        }
        const menuItemElements = ENVIRONMENT_OPTIONS.map((environment) => {
            if (projectSettings.deploymentEnvironments.includes(environment)) {
                return this.renderMenuItem(environment);
            }
            return <></>;
        });
        return [this.renderMenuItem('development'), ...menuItemElements];
    }

    renderContents = () => {
        const { claiservice, projectId } = this.props;
        const { selectedEnvironment, saving } = this.state;
        return this.renderClaiService(saving, claiservice[selectedEnvironment], projectId);
    };

    render() {
        const { ready } = this.props;
        const { projectSettings } = this.props;
        if (ready) {
            const isMultipleTabs = projectSettings.deploymentEnvironments && projectSettings.deploymentEnvironments.length > 0;
            if (isMultipleTabs) {
                return (
                    <>
                        <Menu secondary pointing data-cy='claiservice-environment-menu'>
                            {this.renderMenu()}
                        </Menu>
                        {this.renderContents()}
                    </>
                );
            }
            return (
                <>
                    <h4 data-cy='claiservice-environment-menu'>Development</h4>
                    {this.renderContents()}
                </>
            );
        }
        return this.renderLoading();
    }
}

ClaiService.propTypes = {
    projectId: PropTypes.string.isRequired,
    claiservice: PropTypes.object,
    projectSettings: PropTypes.object,
    ready: PropTypes.bool.isRequired,
};

ClaiService.defaultProps = {
    projectSettings: {},
    claiservice: {},
};

const ClaiServiceContainer = withTracker(({ projectId }) => {
    const handler = Meteor.subscribe('claiservice', projectId);
    const handlerproj = Meteor.subscribe('projects', projectId);


    const claiservice = {};
    ClaiServiceCollection.find({ projectId })
        .fetch()
        .filter(credential => (
            credential.environment === undefined || ENVIRONMENT_OPTIONS.includes(credential.environment)
        ))
        .forEach((credential) => {
            claiservice[credential.environment ? credential.environment : 'development'] = credential;
        });
    const projectSettings = ProjectsCollection.findOne(
        { _id: projectId },
        {
            fields: {
                deploymentEnvironments: 1,
            },
        },
    );
    return {
        ready: (handler.ready() && handlerproj.ready()),
        claiservice,
        projectSettings,
    };
})(ClaiService);

const mapStateToProps = state => ({
    projectId: state.settings.get('projectId'),
});

export default connect(mapStateToProps)(ClaiServiceContainer);
