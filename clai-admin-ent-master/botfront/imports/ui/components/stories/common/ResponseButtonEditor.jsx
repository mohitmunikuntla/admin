import React from 'react';
import PropTypes from 'prop-types';
import {
    Form, Grid, Divider, Button,
} from 'semantic-ui-react';
import PayloadEditor from './PayloadEditor';
import {
    stringPayloadToObject,
    objectPayloadToString,
} from '../../../../lib/story.utils';

function ResponseButtonEditor({
    value: {
        title,
        type = 'postback',
        payload,
        url,
        payload_value = "",
    },
    onChange,
    onDelete,
    onClose,
    showDelete,
    valid,
    noButtonTitle,
    hideButtonType,
}) {
    const options = [
        { text: 'Postback', value: 'postback' },
        { text: 'Web URL', value: 'web_url' },
    ]; 
    function getPayloadValue(e){
        return e.target.value;
    }
    return (
        <Form className='response-button-editor'>
            <Grid columns={16} textAlign='left'>
                <Grid.Row>
                    {!noButtonTitle && (
                        <Grid.Column width={12}>
                            {hideButtonType === false && (
                                <Form.Input
                                label='Button title'
                                data-cy='enter-button-title'
                                autoFocus
                                placeholder='Button title'
                                onChange={(_event, { value }) => {
                                    const updatedVal = { title: value, type };
                                    if (type === 'web_url') updatedVal.url = url;
                                    else updatedVal.payload = payload;
                                    onChange(updatedVal);
                                }}
                                value={title}
                            />
                            )}
                            {hideButtonType === true && (
                                <Form.Input
                                label='Button title'
                                data-cy='enter-button-title'
                                autoFocus
                                placeholder='Button title'
                                onChange={(_event, { value }) => {
                                    const updatedVal = { title: value, type };
                                    if (type === 'web_url') updatedVal.url = url;
                                    else updatedVal.payload = payload;
                                    onChange(updatedVal);
                                }}
                                value={title}
                                disabled={true}
                            />
                            )}
                        </Grid.Column>
                    )}
                    {hideButtonType === false && (
                    <Grid.Column width={noButtonTitle ? 6 : 4}>
                        <Form.Select
                            label={noButtonTitle ? 'Type' : 'Button type'}
                            onChange={(event, { value }) => {
                                const updatedVal = { title, type: value };
                                updatedVal.payload = '';
                                onChange(updatedVal);
                            }}
                            value={type}
                            options={options}
                            data-cy='select-button-type'
                        />
                    </Grid.Column>)}
                </Grid.Row>
                <Grid.Row columns={16}>
                    <Grid.Column width={15}>
                        {type === 'web_url' && (
                            <Form.Input
                                label='URL'
                                placeholder='http://'
                                value={url}
                                onChange={(_event, { value }) => onChange({ title, type, url: value })
                                }
                                data-cy='enter_url'
                            />
                        )}
                        {type === 'postback' && (
                            <>
                                <PayloadEditor
                                    value={stringPayloadToObject(payload)}
                                    autofocusOnIntent={false}
                                    onChange={pl => onChange({
                                        title,
                                        type,
                                        payload: objectPayloadToString(pl),
                                        payload_value,
                                    })}
                                />
                                    <Form.Input
                                        label='Value'
                                        data-cy='enter-value'
                                        autoFocus
                                        placeholder='Value'
                                        onChange={pl => onChange({
                                            title,
                                            type,
                                            payload,
                                            payload_value: getPayloadValue(pl),
                                        })}
                                        value={payload_value}
                                        width={12}
                                    />
                            </>
                        )}
                        <Divider />
                        {showDelete && !noButtonTitle && (
                            <Button
                                basic
                                color='red'
                                icon='trash'
                                content='Delete button'
                                type='button'
                                onClick={onDelete}
                            />
                        )}
                        <Button
                            primary
                            content='Save'
                            data-cy='save-button'
                            disabled={!valid}
                            onClick={onClose}
                            floated='right'
                        />
                    </Grid.Column>
                </Grid.Row>
            </Grid>
        </Form>
    );
}

ResponseButtonEditor.propTypes = {
    value: PropTypes.any,
    onChange: PropTypes.func.isRequired,
    onDelete: PropTypes.func,
    onClose: PropTypes.func.isRequired,
    showDelete: PropTypes.bool,
    valid: PropTypes.bool.isRequired,
    noButtonTitle: PropTypes.bool,
    hideButtonType: PropTypes.bool
};

ResponseButtonEditor.defaultProps = {
    showDelete: true,
    onDelete: () => {},
    noButtonTitle: false,
    hideButtonType: false,
};

export default ResponseButtonEditor;
