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

import { Projects } from '../../../api/project/project.collection';
import PageMenu from '../utils/PageMenu';
import { can } from '../../../lib/scopes';
import { wrapMeteorCallback } from '../utils/Errors';
import { ClaiService } from '../../../api/claiservice';
import { load } from 'js-yaml/lib/js-yaml';
import { Dropdown } from 'semantic-ui-react';
import { useEffect } from 'react';

class ServicesList extends React.Component {
    constructor(props) {
        super(props);
        this.state = { completeService: [] };
    }

    filterItem = (filter, rows, filterKey) => {
        if (matchSorter([rows], filter.value, { keys: [filterKey] }).length > 0) return true;
        return false;
    }

    onChange = (value) => {
        ClaiService.findOneAndUpdate(
            {
                projectId: value.projectId
            },
            { $set: { claiservice: value.claiservice, updatedAt: new Date(), ...value } },
            { upsert: true, new: true, lean: true },
        ).lean();
    }

    getColumns = () => [
        {
            id: 'claiservice',
            accessor: 'claiservice',
            filterable: true,
            filterMethod: (filter, rows) => (this.filterItem(filter, rows, 'claiservice')),
            Header: 'Clai Service',
            Cell: props => (
                <>
                    {props.original.claiservice == null ? <p style={{textAlign: 'center', color: 'red', fontWeight: 'bold'}}>x</p> : <p>{props.original.claiservice}</p>}
                </>
            ),
        },
        {
            id: 'projectId',
            accessor: 'projectId',
            filterable: true,
            filterMethod: (filter, rows) => (this.filterItem(filter, rows, 'projectId')),
            Header: 'Project ID',
        },
        {
            id: 'environment',
            accessor: 'environment',
            filterable: true,
            filterMethod: (filter, rows) => (this.filterItem(filter, rows, 'environment')),
            Header: 'Environment',
        },
        ...(can('projects:w')
            ? [{
                id: 'edit',
                accessor: 'projectId',
                width: 55,
                Header: 'Edit',
                Cell: props => (<>
                    {
                        props.original.projectId ? 
                        <div className='center'>
                            <Link to={`/admin/project/${props.value}`}>
                                <Icon name='edit' color='grey' link size='small' data-cy='edit-services' />
                            </Link>
                        </div> : <div className='center'>
                            <Icon name='edit' disabled color='grey' size='small' data-cy='edit-services' />
                        </div>
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
                <PageMenu icon='server' title='Services' headerDataCy='projects-page-header'>
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

ServicesList.propTypes = {
    projects: PropTypes.arrayOf(PropTypes.object),
    loading: PropTypes.bool,
};

var service;
const ServicesListContainer = withTracker(() => {
    //const [service, setService] = useState([]);
    //const [load, setLoad] = useState(true);
    const serviceHandler = Meteor.subscribe('claiservice.services');
    const loading = !serviceHandler.ready();
    var projects = !loading ? ClaiService.find({}).fetch() : [];
    
    if (service == undefined){
        Meteor.apply('claiservice.avaliableservices', wrapMeteorCallback((err, result) => {
            if(!err) {service = Object.values(result)};
        }));
    }

    if(service != [] && service != undefined) {
    if(service != []) {
        service.forEach(data=>{
            projects.push({claiservice: data})
        })
    }}

    return {
        projects,
    };
})(ServicesList);

export default ServicesListContainer;