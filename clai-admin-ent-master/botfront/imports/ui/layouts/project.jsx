import { withTracker } from 'meteor/react-meteor-data';
import 'react-s-alert/dist/s-alert-default.css';
import { browserHistory } from 'react-router';
import SplitPane from 'react-split-pane';
import { Meteor } from 'meteor/meteor';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { DndProvider } from 'react-dnd-cjs';
import HTML5Backend from 'react-dnd-html5-backend-cjs';
import Alert from 'react-s-alert';
import yaml from 'js-yaml';
import React, { useState, useEffect, useContext } from 'react';
import {
    Placeholder,
    Header,
    Menu,
    Container,
    Button,
    Loader,
    Popup,
    Image,
} from 'semantic-ui-react';
import { useIntentAndEntityList } from '../components/nlu/models/hooks';
import { wrapMeteorCallback } from '../components/utils/Errors';
import ProjectSidebarComponent from '../components/project/ProjectSidebar';
import { Projects } from '../../api/project/project.collection';
import { languages as languageOptions } from '../../lib/languages';
import { setProjectId, setWorkingLanguage, setShowChat } from '../store/actions/actions';
import { Credentials } from '../../api/credentials';
import { ClaiService } from '../../api/claiservice';
import { NLUModels } from '../../api/nlu_model/nlu_model.collection';
import { Instances } from '../../api/instances/instances.collection';
import { Slots } from '../../api/slots/slots.collection';
import { Stories } from '../../api/story/stories.collection';
import '../../../client/fonts/semantic.min.css';
import { GlobalSettings } from '../../api/globalSettings/globalSettings.collection';
import { ProjectContext } from './context';
import { setsAreIdentical, cleanDucklingFromExamples } from '../../lib/utils';
import { INSERT_EXAMPLES } from '../components/nlu/models/graphql';
import apolloClient from '../../startup/client/apollo';
import { useResponsesContext } from './response.hooks';
import { can } from '../../lib/scopes';
import Draggable, {DraggableCore} from 'react-draggable';
import { models } from 'mongoose';
// import claiserviceResolver from '../../api/graphql/clai/claiServiceResolver';

var instance;
var credentials;
const ProjectChat = React.lazy(() => import('../components/project/ProjectChat'));

function Project(props) {
    const {
        project,
        projectId,
        loading,
        workingLanguage,
        workingDeploymentEnvironment,
        projectLanguages,
        router: { replace, location: { pathname } } = {},
        showChat,
        changeShowChat,
        instance,
        slots,
        dialogueActions,
        channel,
        children,
        settings,
        allowContextualQuestions,
        hasNoWhitespace,
    } = props;
    const [resizingChatPane, setResizingChatPane] = useState(false);
    const [requestedSlot, setRequestedSlot] = useState(null);
    const {
        intents: intentsList = {},
        entities: entitiesList = [],
        refetch: refreshEntitiesAndIntents,
    } = useIntentAndEntityList({ projectId, language: workingLanguage || '' });
    const screenWidth = window.innerWidth;
    const {
        responses,
        addResponses,
        upsertResponse,
        resetResponseInCache,
        setResponseInCache,
    } = useResponsesContext({ projectId, workingLanguage, projectLanguages });

    useEffect(() => {
        if (refreshEntitiesAndIntents) {
            refreshEntitiesAndIntents();
        }
    }, [workingLanguage, projectId]);

    useEffect(() => () => {
        Meteor.call(
            'project.getContextualSlot',
            projectId,
            wrapMeteorCallback((err, res) => {
                setRequestedSlot(res);
            }),
        );
    }, [allowContextualQuestions]);

    const findExactMatch = (canonicals, entities) => {
        const exactMatch = canonicals.filter(ex => setsAreIdentical(
            ex.entities.map(e => `${e.entity}:${e.value}`),
            entities.map(e => `${e.entity}:${e.value}`),
        ))[0];
        return exactMatch ? exactMatch.example : null;
    };

    const getCanonicalExamples = ({ intent, entities = [] }) => {
        // both intent and entities are optional and serve to restrict the result
        const filtered = intent
            ? intent in intentsList
                ? { [intent]: intentsList[intent] }
                : {}
            : intentsList;
        return Object.keys(filtered).map(
            i => findExactMatch(filtered[i], entities),
        ).filter(ex => ex);
    };

    const parseUtterance = utterance => Meteor.callWithPromise('rasa.parse', instance, [
        { text: utterance, lang: workingLanguage },
    ]);

    const addUtterancesToTrainingData = (utterances, callback = () => {}) => {
        if (!(utterances || []).filter(u => u.text).length) { callback(null, { success: true }); }
        const cleanedUtterances = cleanDucklingFromExamples(utterances);
        apolloClient
            .mutate({
                mutation: INSERT_EXAMPLES,
                variables: {
                    examples: cleanedUtterances.filter(u => u.text),
                    projectId,
                    language: workingLanguage,
                },
            })
            .then(
                res => wrapMeteorCallback(callback)(null, res),
                wrapMeteorCallback(callback),
            );
    };

    const renderPlaceholder = (inverted, fluid) => (
        <Placeholder fluid={fluid} inverted={inverted} className='sidebar-placeholder'>
            <Placeholder.Header>
                <Placeholder.Line />
                <Placeholder.Line />
            </Placeholder.Header>
            <Placeholder.Paragraph>
                <Placeholder.Line />
                <Placeholder.Line />
                <Placeholder.Line />
            </Placeholder.Paragraph>
            <Placeholder.Paragraph>
                <Placeholder.Line />
                <Placeholder.Line />
                <Placeholder.Line />
            </Placeholder.Paragraph>
        </Placeholder>
    );

    setmaxSize = () => {
        switch (screenWidth) {
            case 1280:
                return 356;
            case 1440:
                return 600;
            case 1536:
                return 560;
            case 1920:
                return 800;
            case 2048:
                return 880;
            case 2560:
                return 1000;
            case 2835:
                return 800;
            case 2880:
                return 1200;
            case 5120:
                return 1635;
            case 6016:
                return 1516;
            case 4096:
                return 1281;
            case 4480:
                return 1435;
            case 2304:
                return 986;
            case 3072:
                return 1080;
            case 3024:
                return 940;
            case 3456:
                return 1130;
            case 3840:
                return 1231;
            case 1792:
                return 678;
            case 1344:
                return 404;
            case 1152:
                return 238;
            case 1360:
                return 416;
            case 1366:
                return 411;
            case 1400:
                return 438;
            case 1680:
                return 624;
            default:
                return 600;
        }
    }

    setMinAndDefaultSize = () => {        // minsize and default size should same
        switch (screenWidth) {
            case 1280:
                return 286;
            case 1440:
                return 337;
            case 1536:
                return 352;
            case 1920:
                return 408;
            case 2048:
                return 441;
            case 2560:
                return 541;
            case 2835:
                return 600;
            case 2880:
                return 605;
            case 5120:
                return 1080;
            case 6016:
                return 1275;
            case 4096:
                return 861;
            case 4480:
                return 950;
            case 2304:
                return 500;
            case 3072:
                return 663;
            case 3024:
                return 651;
            case 3456:
                return 741;
            case 3840:
                return 815;
            case 1792:
                return 406;
            case 1344:
                return 295;
            case 1152:
                return 238;
            case 1360:
                return 300;
            case 1366:
                return 319;
            case 1400:
                return 336;
            case 1680:
                return 357;
            default:
                return 337;
        }
    }
    

    return (
        <div style={{ height: '100vh' }}>
            <div className='project-sidebar'>
                {(settings && settings.settings && settings.settings.public && settings.settings.public.logoUrl) || project.logoUrl ? (
                    <Header as='h1' className='logo'>
                        <Image src={!loading ? project.logoUrl || settings.settings.public.logoUrl : ''} centered="true" className='custom-logo' />
                    </Header>
                ) : (
                    <Header as='h1' className='logo'>
                        <img className="custom-logo" centered="true" src="/images/clai.svg"/>
                    </Header>
                )}
                {(settings && settings.settings && settings.settings.public && settings.settings.public.smallLogoUrl) || project.smallLogoUrl ? (
                    <Header as='h1' className='simple-logo'>
                        <Image src={!loading ? project.smallLogoUrl || settings.settings.public.smallLogoUrl : ''} cecentered="true"ntered className='custom-small-logo' />
                    </Header>
                ) : (
                    <Header as='h1' className='simple-logo'>
                        <img className="custom-small-logo" centered="true" src="/images/clai-icon.svg" style={{height: "30px", width: "30px"}}/>
                    </Header>
                )}
                {loading && renderPlaceholder(true, false)}
                {!loading && (
                    <ProjectSidebarComponent
                        projectId={projectId}
                        handleChangeProject={pid => replace(
                            pathname.replace(/\/project\/.*?\//, `/project/${pid}/`),
                        )
                        }
                    />
                )}
            </div>
            <div className='project-children'>
                <SplitPane
                    split='vertical'
                    minSize={showChat ? setMinAndDefaultSize() : 0}
                    defaultSize={showChat ? setMinAndDefaultSize() : 0}
                    maxSize={showChat ? setmaxSize() : 0}
                    primary='second'
                    allowResize={showChat}
                    className={resizingChatPane ? '' : 'width-transition'}
                    onDragStarted={() => setResizingChatPane(true)}
                    onDragFinished={() => setResizingChatPane(false)}
                >
                    {loading && (
                        <div>
                            <Menu pointing secondary style={{ background: '#fff' }} />
                            <Container className='content-placeholder'>
                                {renderPlaceholder(false, true)}
                            </Container>
                        </div>
                    )}
                    {!loading && (
                        <ProjectContext.Provider
                            value={{
                                project,
                                instance,
                                projectLanguages,
                                intents: Object.keys(intentsList || {}),
                                entities: entitiesList || [],
                                slots,
                                dialogueActions,
                                language: workingLanguage,
                                environment: workingDeploymentEnvironment,
                                upsertResponse,
                                responses,
                                addResponses,
                                refreshEntitiesAndIntents,
                                parseUtterance,
                                addUtterancesToTrainingData,
                                getCanonicalExamples,
                                resetResponseInCache,
                                setResponseInCache,
                                requestedSlot,
                                hasNoWhitespace,
                            }}
                        >   
                                <DndProvider backend={HTML5Backend}>
                                    <div data-cy='left-pane'>
                                        {children}
                                        {!showChat && channel && (
                                                <Popup
                                                    trigger={(
                                                        <Draggable
                                                        bounds={{ top: -550, bottom: 0 }}
                                                        axis="y"
                                                        >
                                                            <Button
                                                                size='big'
                                                                circular
                                                                onClick={() => changeShowChat(!showChat)}
                                                                icon='comment'
                                                                primary
                                                                className='open-chat-button'
                                                                data-cy='open-chat'
                                                            />
                                                        </Draggable>
                                                    )}
                                                    content='Try out your chatbot'
                                                />
                                        )}
                                    </div>
                                </DndProvider>
                        </ProjectContext.Provider>
                    )}
                    {!showChat && (<div></div>)}
                    {!loading && showChat && (
                        <React.Suspense fallback={<Loader active />}>
                            <ProjectChat
                                channel={channel}
                                triggerChatPane={() => changeShowChat(!showChat)}
                                project={project}
                            />
                        </React.Suspense>
                    )}
                </SplitPane>
            </div>
            <Alert stack={{ limit: 3 }} html={true} />
        </div>
    );
}

Project.propTypes = {
    children: PropTypes.any.isRequired,
    router: PropTypes.object.isRequired,
    project: PropTypes.object,
    projectId: PropTypes.string.isRequired,
    instance: PropTypes.object,
    workingLanguage: PropTypes.string,
    workingDeploymentEnvironment: PropTypes.string,
    projectLanguages: PropTypes.array.isRequired,
    slots: PropTypes.array.isRequired,
    dialogueActions: PropTypes.array.isRequired,
    loading: PropTypes.bool.isRequired,
    channel: PropTypes.object,
    settings: PropTypes.object,
    showChat: PropTypes.bool.isRequired,
    changeShowChat: PropTypes.func.isRequired,
    allowContextualQuestions: PropTypes.bool,
    hasNoWhitespace: PropTypes.bool,
};

Project.defaultProps = {
    channel: null,
    settings: {},
    project: {},
    instance: {},
    workingLanguage: 'en',
    workingDeploymentEnvironment: 'development',
    allowContextualQuestions: false,
    hasNoWhitespace: false,
};

const ProjectContainer = withTracker((props) => {
    const {
        params: { project_id: projectId },
        projectId: storeProjectId,
        workingLanguage,
        changeWorkingLanguage,
        changeProjectId,
        router,
    } = props;

    if (!Meteor.userId()) {
        router.push('/login');
    }

    if (!projectId) return browserHistory.replace({ pathname: '/404' });
    const projectHandler = Meteor.subscribe('projects', projectId);
    // const credentialsHandler = Meteor.subscribe('credentials', projectId);
    const claiserviceHandler = Meteor.subscribe('claiservice', projectId);
    const modelsHandler = Meteor.subscribe('models', projectId);
    const settingsHandler = Meteor.subscribe('settings', projectId);
    const settings = GlobalSettings.findOne({}, {
        fields: { 'settings.public.logoUrl': 1, 'settings.public.smallLogoUrl': 1 },
    });
    // const instanceHandler = Meteor.subscribe('nlu_instances', projectId);
    const slotsHandler = Meteor.subscribe('slots', projectId);
    const allowContextualQuestionsHandler = Meteor.subscribe('project.requestedSlot', projectId);
    let nluModelsHandler = null;
    let hasNoWhitespace;
    if (can('nlu-data:r', projectId)) {
        nluModelsHandler = Meteor.subscribe('nlu_models', projectId, workingLanguage);
        ({ hasNoWhitespace } = NLUModels.findOne({ projectId, language: workingLanguage }, { fields: { hasNoWhitespace: 1 } }) || {});
    } else {
        hasNoWhitespace = false;
    }
    let storiesHandler = null;
    if (can('responses:r', projectId)) {
        storiesHandler = Meteor.subscribe('stories.events', projectId);
    }
    const dialogueActions = storiesHandler ? Array.from(new Set((Stories
        .find().fetch() || []).flatMap(story => story.events))) : [];
    
    //const [instance, setInstance] = useState({});
    //const [loadInstance, setLoadInstance] = useState(true);
    //var loadInstance = true;
    
    if (instance == undefined){
        Meteor.apply('claiservice.nlu_instance', [projectId], (error, res) => {
            if(!error) {
                instance = res;
                instance.projectId = projectId;
            }
        });
    }

    //setTimeout(() => console.log('instance', instance), 3000);

    const readyHandler = handler => handler;
    const readyHandlerList = [
        Meteor.user(),
        // credentialsHandler.ready(),
        claiserviceHandler.ready(),
        modelsHandler.ready(),
        projectHandler.ready(),
        settingsHandler.ready(),
        // instanceHandler.ready(),
        slotsHandler.ready(),
        storiesHandler ? storiesHandler.ready() : true,
        allowContextualQuestionsHandler.ready(),
        nluModelsHandler ? nluModelsHandler.ready() : true,
    ];
    const ready = readyHandlerList.every(readyHandler);
    const project = Projects.findOne({ _id: projectId });
    const { defaultLanguage } = project || {};
    //var [credentials, setCredentials] = useState(null);
    // const [loadCred, setLoadCred] = useState(true);


    var claiservice = {};
    var cred = {};

    if (credentials == undefined){
        Meteor.apply('claiservice.setup', [], (error, res) => {
            if(error) console.error(error)
            else{
                let cred = {};
                let claiservice = ClaiService.findOne({
                    $or: [
                        { projectId, environment: { $exists: false } },
                        { projectId, environment: 'development' },
                    ],
                });
                let services = Object.keys(res);
                if(services.includes(claiservice.claiservice)){
                    cred = res[claiservice.claiservice]['credentials'];
                }
    
                credentials = cred;

            }
        });
    }    

    if (ready && !project) {
        return browserHistory.replace({ pathname: '/404' });
    }

    let channel = null;

    // const callTimeOutFunc = () => {
    //     if(credentials != null || {}){
    //         channel = credentials['rasa_addons.core.channels.webchat.WebchatInput'];
    //         if (!channel) {
    //             channel = credentials['rasa_addons.core.channels.webchat_plus.WebchatPlusInput'];
    //         }
    //     }
    // }

    try{
        if (ready && (credentials != null || {})) {
            // let credentials = Credentials.findOne({
            //     $or: [
            //         { projectId, environment: { $exists: false } },
            //         { projectId, environment: 'development' },
            //     ],
            // });
            
            // credentials = credentials ? yaml.safeLoad(credentials.credentials) : {};
            channel = credentials['rasa_addons.core.channels.webchat.WebchatInput'];
            if (!channel) {
                channel = credentials['rasa_addons.core.channels.webchat_plus.WebchatPlusInput'];
            }
            // const tTime = setTimeout(callTimeOutFunc(), 3000);
            // clearTimeout(tTime);
            
        }
    } catch(e){}

    // update store if new projectId
    if (storeProjectId !== projectId) {
        changeProjectId(projectId);
    }

    const projectLanguages = ready
        ? (project.languages || []).map(value => ({
            text: languageOptions[value].name,
            value,
        }))
        : [];

    // update working language
    if (
        ready
        && defaultLanguage
        && !projectLanguages.some(({ value }) => value === workingLanguage)
    ) {
        changeWorkingLanguage(defaultLanguage);
    }

    return {
        loading: !ready,
        project,
        projectId,
        channel,
        instance,
        slots: Slots.find({}).fetch(),
        dialogueActions,
        projectLanguages,
        settings,
        allowContextualQuestions: ready ? project.allowContextualQuestions : false,
        hasNoWhitespace,
    };
})(Project);

const mapStateToProps = state => ({
    workingLanguage: state.settings.get('workingLanguage'),
    workingDeploymentEnvironment: state.settings.get('workingDeploymentEnvironment'),
    projectId: state.settings.get('projectId'),
    showChat: state.settings.get('showChat'),
});

const mapDispatchToProps = {
    changeWorkingLanguage: setWorkingLanguage,
    changeProjectId: setProjectId,
    changeShowChat: setShowChat,
};

export default connect(mapStateToProps, mapDispatchToProps)(ProjectContainer);