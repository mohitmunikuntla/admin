/* eslint-disable no-console */

import { useContext } from 'react';
import { Meteor } from 'meteor/meteor';
import { wrapMeteorCallback } from '../../utils/Errors';
import { ProjectContext } from '../../../layouts/context';

export function useUploadTab(templateKey) {
    const { language, project: { _id: projectId } } = useContext(ProjectContext);
    const reader = new FileReader();

    const uploadTable = async ({
        file, setTable, resetUploadStatus,
    }) => {
        try {
            reader.readAsBinaryString(file);
            reader.onload = () => {
                const fileData = btoa(reader.result);
                const data = {
                    projectId, data: fileData, mimeType: file.type, language, responseId: `${templateKey}_${new Date().getTime()}`,
                };
                Meteor.call('upload.table', projectId, data, wrapMeteorCallback((err, response = {}) => {
                    if (!err) setTable(response.data.uri);
                    resetUploadStatus();
                }));
            };
        } catch (e) {
            console.log('error while uploading the table, check admin logs');
            resetUploadStatus();
        }
    };
    if (templateKey && language && projectId && reader) return [uploadTable];
    // will not initialize if any of those missing
    return [null];
}
