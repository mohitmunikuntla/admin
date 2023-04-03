import { Meteor } from 'meteor/meteor';
import PropTypes from 'prop-types';
import { withTracker } from 'meteor/react-meteor-data';
import Alert from 'react-s-alert';
import {
    Container, Segment, Header, Button, Confirm, Message, Dropdown
} from 'semantic-ui-react';
import React, { useState } from 'react';
import 'react-s-alert/dist/s-alert-default.css';
import { browserHistory } from 'react-router';
import {
    AutoField, ErrorsField, SubmitField, AutoForm,
} from 'uniforms-semantic';
import { can } from '../../../lib/scopes';
import InfoField from '../utils/InfoField';
import { Projects } from '../../../api/project/project.collection';
import { wrapMeteorCallback } from '../utils/Errors';
import PageMenu from '../utils/PageMenu';
import Can from '../roles/Can';
import SelectField from '../nlu/common/SelectLanguage';
import SelectService from '../nlu/common/SelectService';
//import SelectService from '../nlu/common/SelectService';
import { ClaiService } from '../../../api/claiservice';
import ToggleField from '../common/ToggleField';

var avail;
var allServices;

class Project extends React.Component {
    constructor(props) {
        super(props);
        this.state = { confirmOpen: false, newProject: {}, newProjectId: null, loadingNewId: true };
    }

    methodCallback = () => wrapMeteorCallback((err) => {
        if (!err) {
            // browserHistory.goBack();
            browserHistory.push('/admin/projects');
        }
    });

    updateProject = (project, service) => {
        if (project._id) {
            if(project.deploymentEnvironments.length == 0){
                project.defaultProductionService = null;
                Meteor.call('project.update', project, wrapMeteorCallback((err) => {
                    if (!err) {
                        Meteor.call('project.deleteProd', project._id, wrapMeteorCallback((err) => {
                            if (!err) {
                            } else console.error("error in update project",err);
                        }));
                    }
                }));
            } else {
                Meteor.call('project.productionUpdates', project._id);
                if(project.defaultDevelopmentService && project.defaultProductionService && (project.defaultDevelopmentService == project.defaultProductionService)) {
                    if((project.defaultDevelopmentService != undefined || "") && (project.defaultProductionService != undefined || "")){
                        Alert.error(`Both the environments can't have same service`, {
                            position: 'top-right',
                            timeout: 120000,
                        });
                        return;
                    } else {
                        Meteor.call('project.update', project, wrapMeteorCallback((err) => {
                            if (!err) {
                                // browserHistory.goBack();
                                browserHistory.push('/admin/projects');
                            }
                        }));
                    }
                } else {
                    Meteor.call('project.update', project, wrapMeteorCallback((err) => {
                        if (!err) {
                            // browserHistory.goBack();
                            browserHistory.push('/admin/projects');
                        }
                    }));
                }
            }
            service.forEach(element => {
                if(element.environment == "development") {
                    Meteor.call('claiservice.update', {
                        _id: element._id,
                        projectId: element.projectId,
                        updatedAt: new Date(),
                        environment: element.environment,
                        claiservice: project.defaultDevelopmentService
                    }, wrapMeteorCallback((err) => {
                        if(!err) {
                            // browserHistory.goBack();
                            browserHistory.push('/admin/projects');
                        }
                    }));
                } else if(element.environment == "production") {
                    Meteor.call('claiservice.update', {
                        _id: element._id,
                        projectId: element.projectId,
                        updatedAt: new Date(),
                        environment: element.environment,
                        claiservice: project.defaultProductionService
                    }, wrapMeteorCallback((err) => {
                        if(!err) {
                            // browserHistory.goBack();
                            browserHistory.push('/admin/projects');
                        }
                    }));
                }
            });
        } else {
            Meteor.call('project.insert', project, wrapMeteorCallback((err, result) => {
                if (!err) { 
                    Meteor.callWithPromise(
                        'nlu.insert', result, project.defaultLanguage, // result is the newly created project id
                    );
                    this.setState({newProjectId: result, newProject: project});
                    // browserHistory.goBack();
                    browserHistory.push('/admin/projects');
                }
            }));
        }
    };

    prodCheck = () => {
        const { project } = this.props;
        const prod = project && project.deploymentEnvironments && project.deploymentEnvironments.includes('production') ? true : false;
        this.setState({prodEnable: !prod})
    }

    deleteProject = () => {
        const { project } = this.props;
        Meteor.call('project.delete', project._id, this.methodCallback());
    };

    render() {
        const { project, loading, service, services, allServices } = this.props;
        const { confirmOpen, newProjectId, loadingNewId, newProject } = this.state;
        if(newProjectId!=null && loadingNewId && newProject!= {}){
            Meteor.call('claiservice.updateNewProject', {
                projectId: newProjectId,
                updatedAt: new Date(),
                environment: 'development',
                claiservice: newProject.defaultDevelopmentService
            }, wrapMeteorCallback((err) => {
                if(!err) {
                    this.setState({loadingNewId: false});
                }
            }));
        }
        const { namespace } = project || {};
        const prod = project && project.deploymentEnvironments && project.deploymentEnvironments.includes('production') ? true : false;
        return (
            <>
                <PageMenu icon='sitemap' title={project._id ? project.name : 'New project'} />
                <Container>
                    {!loading && (
                        <Segment>
                            <AutoForm
                                schema={Projects.simpleSchema()}
                                onSubmit={p => this.updateProject(p, service)}
                                model={project}
                            >
                                <AutoField name='name' data-cy='project-name' />
                                <InfoField
                                    name='namespace'
                                    label='Namespace'
                                    data-cy='project-namespace'
                                    info='The namespace to be used for Kubernetes and Google Cloud. Must be composed of only lower case letters, dashes, and underscores.'
                                    disabled={!!namespace}
                                />
                                <SelectField name='defaultLanguage' label={null} placeholder='Select the default language of your project' />
                                <br />
                                {can('resources:r', project._Id) && (
                                    <>
                                        <InfoField
                                            name='deploymentEnvironments'
                                            label='Deployment environments'
                                            info='Clai will enable additional environments for your workflow'
                                            data-cy='deployment-environments'
                                            disabled={!can('resources:w', project._Id)}
                                            // Component={ToggleField}
                                            // onChange={() => this.prodCheck()}
                                        />
                                        <Message
                                            size='tiny'
                                            info
                                            content='If you remove all environments, all stories will be published'
                                        />
                                    </>
                                )}
                                
                                {services != [] ?
                                <>
                                <SelectService name='defaultDevelopmentService' services={services} label='Development Service' placeholder='Select the default development service of your project' />
                                <br />
                                <SelectService name='trainingService' services={allServices} label='Training Service' placeholder='Select the training service of your project' />
                                <br />
                                {prod ? <> 
                                <SelectService name='defaultProductionService' services={services} label='Production Service' placeholder='Select the default production service of your project' />
                                <br />
                                </> : null}
                                </> : null}
                                
                                <AutoField name='disabled' data-cy='disable' />
                                <ErrorsField />
                                <SubmitField data-cy='submit-field' />
                            </AutoForm>
                        </Segment>
                    )}
                    {!loading && project._id && (
                        <Can I='global-admin'>
                            <Segment>
                                <Header content='Delete project' />
                                {!project.disabled && <Message info content='A project must be disabled to be deletable' />}
                                <br />
                                <Button icon='trash' disabled={!project.disabled} negative content='Delete project' onClick={() => this.setState({ confirmOpen: true })} data-cy='delete-project' />
                                <Confirm
                                    open={confirmOpen}
                                    header={`Delete project ${project.name}?`}
                                    content='This cannot be undone!'
                                    onCancel={() => this.setState({ confirmOpen: false })}
                                    onConfirm={() => this.deleteProject()}
                                />
                            </Segment>
                        </Can>
                    )}
                </Container>
            </>
        );
    }
}

Project.defaultProps = {
    project: {},
    service: [],
    services: [],
    allServices: [],
    // prodEnabled: false,
    // avaialbleservices: [],
};

Project.propTypes = {
    loading: PropTypes.bool.isRequired,
    project: PropTypes.object,
    service: PropTypes.array,
    services: PropTypes.array,
    allServices: PropTypes.array,
    // prodEnabled: PropTypes.bool,
    // avaialbleservices: PropTypes.array,
    
};

const ProjectContainer = withTracker(({ params }) => {
    let project = null;
    let loading = true;
    let service = null;
    let services = [];
    // let avaialbleservices = [];
    let serviceloading = true;
    // const [serv, setServ] = useState([]);
    // const [prodEnabled, setProdEnabled] = useState(null);
    //const [avail, setAvail] = useState([]);
    //const [allServices, setAllServices] = useState([]);
    //const [loadData, setloadData] = useState(true);
    //const [loadServ, setloadServ] = useState(true);
    if (params.project_id) {
        const projectsHandle = Meteor.subscribe('projects', params.project_id);
        loading = !projectsHandle.ready();
        const serviceHandle = Meteor.subscribe('claiservice', params.project_id);
        serviceloading = !serviceHandle.ready();
        [project] = Projects.find(
            { _id: params.project_id },
            {
                fields: {
                    name: 1,
                    namespace: 1,
                    disabled: 1,
                    apiKey: 1,
                    defaultLanguage: 1,
                    defaultDevelopmentService: 1,
                    defaultProductionService: 1,
                    trainingService: 1,
                    deploymentEnvironments: 1,
                },
            },
        ).fetch();
        
        !serviceloading ? service = ClaiService.find({}).fetch() || [] : [];

        if (avail == undefined){
            Meteor.apply('claiservice.avaliableservices', [], wrapMeteorCallback((err, test) => {
                if(!err) {test != [] ? avail = test : []; };
            }));
        }

        if (allServices == undefined){
            Meteor.apply('claiservice.allservices', [], wrapMeteorCallback((err, data) => {
                if(!err) {data != [] ? allServices = data : [];}
            }));
        }
        
        services = avail;
        project && project.defaultDevelopmentService && services ? services.push(project.defaultDevelopmentService) : null;
        project && project.defaultProductionService && services ? services.push(project.defaultProductionService) : null;
        
        // project && project.trainingService ? services.push(project.trainingService) : null;
        let uniqueChars = [];

        if(services){
        services.forEach((c) => {
            if (!uniqueChars.includes(c)) {
                uniqueChars.push(c);
            }
        });
        }

        services = uniqueChars;
        
    }
    return {
        loading,
        project,
        service,
        services,
        allServices
    };
})(Project);

export default ProjectContainer;
