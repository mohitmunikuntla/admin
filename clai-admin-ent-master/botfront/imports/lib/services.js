import { Meteor } from 'meteor/meteor';
// import { Projects } from '../api/project/project.collection';
// import { ClaiService } from '../api/claiservice';
import React, { useState } from 'react';

export const services = () => {
    const [serv, setServ] = useState([]);
    Meteor.callWithPromise('claiservice.setup').then((res)=>{
        let data =Object.keys(res);
        data != [] ? setServ(data) : [];
    });
    // const pHandle = Meteor.subscribe('claiservice.setup');
    // const ploading = !pHandle.ready();
    // var allProjects;
    // var notUsedService;
    // const loadServ = () => {
    //     allProjects = ClaiService.find({}, {fields: {claiservice: 1} }).fetch() || [];
    //     let aproject = [];
    //     allProjects.forEach((element)=> {
    //         aproject.includes(element.claiservice) ? null : aproject.push(element.claiservice)
    //     });
    //     notUsedService = serv.filter(function(obj) { return aproject.indexOf(obj) == -1; });
    // }
    // !ploading ? loadServ() : null;
    let ref = {};
    serv.map((ref)=>{ return {...ser, 
        ref: { name: `${ref}`}}
    })
    return ref;
}
// export const services = {
//     rasa_development: { name: 'rasa_development' },
//     rasa_production: { name: 'rasa_production' },
//     rasa_development2: { name: 'rasa_development2' },
//     rasa_production2: { name: 'rasa_production2' },
//     rasa_development3: { name: 'rasa_development3' },
//     rasa_production3: { name: 'rasa_production3' },
//     rasa_service2: { name: 'rasa_service2' },
// };

export const servFromCode = code => services?.[code]?.name;
