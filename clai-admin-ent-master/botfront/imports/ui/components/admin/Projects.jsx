import { withTracker } from 'meteor/react-meteor-data';
import {
    Container, Menu, Button, Icon, Popup,
} from 'semantic-ui-react';
import { Link, browserHistory } from 'react-router';
import matchSorter from 'match-sorter';
import { Meteor } from 'meteor/meteor';
import ReactTable from 'react-table-v6';
import PropTypes from 'prop-types';
import React from 'react';

import { Projects } from '../../../api/project/project.collection';
import { ClaiService } from '../../../api/claiservice';
import PageMenu from '../utils/PageMenu';
import { can } from '../../../lib/scopes';
import { wrapMeteorCallback } from '../utils/Errors';

class ProjectsList extends React.Component {
    filterItem = (filter, rows, filterKey) => {
        if (matchSorter([rows], filter.value, { keys: [filterKey] }).length > 0) return true;
        return false;
    }

    getColumns = () => [
        {
            id: 'name',
            accessor: 'name',
            filterable: true,
            filterMethod: (filter, rows) => (this.filterItem(filter, rows, 'name')),
            Header: 'Name',
            Cell: props => (
                <Link to={`/project/${props.original._id}/nlu/models`}>{props.value}</Link>
            ),
        },
        {
            id: 'id',
            accessor: '_id',
            filterable: true,
            filterMethod: (filter, rows) => (this.filterItem(filter, rows, 'id')),
            Header: 'ID',
        },
        {
            id: 'defaultDevelopmentService',
            accessor: 'defaultDevelopmentService',
            filterable: true,
            filterMethod: (filter, rows) => (this.filterItem(filter, rows, 'defaultDevelopmentService')),
            Header: 'Development Service',
            Cell: props => (
                <>
                    {props.original.defaultDevelopmentService == null ? <p style={{textAlign: 'center', color: 'red', fontWeight: 'bold'}}>x</p> : <p>{props.original.defaultDevelopmentService}</p>}
                </>
            ),
        },
        {
            id: 'trainingService',
            accessor: 'trainingService',
            filterable: true,
            filterMethod: (filter, rows) => (this.filterItem(filter, rows, 'trainingService')),
            Header: 'Training Service',
            Cell: props => (
                <>
                    {props.original.trainingService == null ? <p style={{textAlign: 'center', color: 'red', fontWeight: 'bold'}}>x</p> : <p>{props.original.trainingService}</p>}
                </>
            ),
        },
        {
            id: 'defaultProductionService',
            accessor: 'defaultProductionService',
            filterable: true,
            filterMethod: (filter, rows) => (this.filterItem(filter, rows, 'defaultProductionService')),
            Header: 'Production Service',
            Cell: props => (
                <>
                    {props.original.defaultProductionService == null ? <p style={{textAlign: 'center', color: 'red', fontWeight: 'bold'}}>x</p> : <p>{props.original.defaultProductionService}</p>}
                </>
            ),
        },
        ...(can('projects:w')
            ? [{
                id: 'edit',
                accessor: '_id',
                width: 55,
                Header: 'Edit',
                Cell: props => (
                    <div className='center'>
                        <Link to={`/admin/project/${props.value}`}>
                            <Icon name='edit' color='grey' link size='small' data-cy='edit-projects' />
                        </Link>
                    </div>
                ),
            }]
            : []),
    ];

    render() {
        const { loading, projects } = this.props;
        return (
            <div>
                <PageMenu icon='sitemap' title='Projects' headerDataCy='projects-page-header'>
                    <Menu.Menu position='right'>
                        {can('projects:w') && (
                            <Menu.Item>
                                
                                <div data-cy='new-project-trigger'>
                                    <Button
                                        data-cy='new-project'
                                        onClick={() => {
                                            browserHistory.push('/admin/project/add');
                                        }}
                                        primary
                                        disabled={loading}
                                        icon='add'
                                        content='Add project'
                                        labelPosition='left'
                                    />
                                </div>
                            </Menu.Item>
                        )
                        }
                    </Menu.Menu>
                </PageMenu>
                <Container>
                    <ReactTable
                        data={projects}
                        columns={this.getColumns()}
                        getTrProps={() => ({
                            style: {
                                height: '37px',
                                paddingLeft: '10px',
                            },
                        })}
                    />
                </Container>
            </div>
        );
    }
}

ProjectsList.propTypes = {
    projects: PropTypes.arrayOf(PropTypes.object),
    loading: PropTypes.bool.isRequired,
};

const ProjectsListContainer = withTracker(() => {
    const projectsHandle = Meteor.subscribe('projects.services');
    const loading = !projectsHandle.ready();
    var projects = !loading ? Projects.find({}, { fields: { name: 1, namespace: 1, defaultDevelopmentService: 1, defaultProductionService: 1, trainingService: 1 } }).fetch() : [];
    return {
        loading,
        projects,
    };
})(ProjectsList);

export default ProjectsListContainer;
