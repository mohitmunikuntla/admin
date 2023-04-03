import { withTracker } from 'meteor/react-meteor-data';
import {
    Container, Menu, Button, Icon, Popup,
} from 'semantic-ui-react';
import { Link, browserHistory } from 'react-router';
import matchSorter from 'match-sorter';
import { Meteor } from 'meteor/meteor';
import ReactTable from 'react-table-v6';
import PropTypes, { element } from 'prop-types';
import React, { useState } from 'react';
import { Models } from '../../../api/models';
import PageMenu from '../utils/PageMenu';
import { can } from '../../../lib/scopes';
import { wrapMeteorCallback } from '../utils/Errors';
import { ModelService } from '../../../api/model';
import { load } from 'js-yaml';

class ModelsList extends React.Component {
    filterItem = (filter, rows, filterKey) => {
        if (matchSorter([rows], filter.value, { keys: [filterKey] }).length > 0) return true;
        return false;
    }

    onChange = (value) => {
        ModelService.findOneAndUpdate(
            {
                projectId: value.projectId
            },
            { $set: { modelservice: value.modelservice, updatedAt: new Date(), ...value } },
            { upsert: true, new: true, lean: true },
        ).lean();
    }

    deleteModel = (model) => {
        Meteor.call('models.delete', model, wrapMeteorCallback((err) => {
            if(!err) {
                // browserHistory.goBack();
                browserHistory.push('/admin/models');
            }
        }));
    }

    getColumns = () => [
        {
            id: 'file',
            accessor: 'file',
            filterable: true,
            filterMethod: (filter, rows) => (this.filterItem(filter, rows, 'file')),
            Header: 'Name',
            Cell: props => (<>
                {props.original.file ? 
                    <p>{props.original.file}</p> : <p style={{textAlign: 'center', color: 'red', fontWeight: 'bold'}}>x</p>
                }
                </>
            ),
        },
        {
            id: 'projectid',
            accessor: 'projectid',
            filterable: true,
            width: 225,
            filterMethod: (filter, rows) => (this.filterItem(filter, rows, 'projectid')),
            Header: 'Project ID',
        },
        {
            id: 'environment',
            accessor: 'environment',
            filterable: true,
            width: 200,
            filterMethod: (filter, rows) => (this.filterItem(filter, rows, 'environment')),
            Header: 'Environment',
        },
        {
            id: 'publisheddate',
            accessor: 'publisheddate',
            filterable: true,
            width: 225,
            filterMethod: (filter, rows) => (this.filterItem(filter, rows, 'publisheddate')),
            Header: 'Published At',
            Cell: props => (<>
                {props.original.publisheddate ? <p>{props.original.publisheddate.toString().split(' GMT')[0]}</p> : <p>Not Published</p>}
            </>),
        },
        ...(can('projects:w')
            ? [{
                id: 'edit',
                accessor: 'projectId',
                width: 55,
                Header: 'Delete',
                Cell: props => (<>
                    {props.original.file ? 
                        (<div className='center'>
                            <Icon name='trash' onClick={()=> this.deleteModel(props.original)} color='red' link size='small' data-cy='edit-models' />  
                        </div>) : (<div className='center'>
                            <Icon name='trash' disabled color='grey' link size='small' data-cy='edit-models' />  
                        </div>)
                    }
                    </>
                ),
            }]
            : []),
    ];

    render() {
        const { projects } = this.props;
        return (
            <div>
                <PageMenu icon='save' title='Models' headerDataCy='projects-page-header'>
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

ModelsList.propTypes = {
    projects: PropTypes.arrayOf(PropTypes.object),
    loading: PropTypes.bool,
};

const ModelsListContainer = withTracker(() => {
    const projectsHandle = Meteor.subscribe('models.all');
    const loading = !projectsHandle.ready();
    const projects = !loading ? Models.find({}).fetch() : [];
    return {
        projects,
    };
})(ModelsList);

export default ModelsListContainer;