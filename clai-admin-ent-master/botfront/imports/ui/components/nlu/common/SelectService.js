import React from 'react';
import classnames from 'classnames';
import connectField from 'uniforms/connectField';
import filterDOMProps from 'uniforms/filterDOMProps';
import { Dropdown } from 'semantic-ui-react';
import { languages } from '../../../../lib/languages';
// import { services } from '../../../../lib/services';

handleChange = (event, selectedOption, onChange) => {
    // this.setState({ selectedOption: selectedOption.value });
    console.log('selectedOption', selectedOption)
    console.log('onChange', onChange)
    console.log('event', event)
    onChange(selectedOption.value);
};

const renderCheckboxes = ({
    allowedValues,
    fieldType,
    id,
    name,
    onChange,
    transform,
    value,
    disable,
    services,
}) => (
    <Dropdown
        placeholder='Select services'
        clearable
        id={id}
        name={name}
        fluid
        multiple
        search
        selection
        value={value}
        onChange={(e, { value }) => onChange(value)}
        options={services.map(code => ({ text: code, key: code, value: code }))}
        disabled={disable}
    />
);

const renderSelect = ({
    allowedValues,
    disable,
    id,
    inputRef,
    label,
    name,
    onChange,
    placeholder,
    required,
    transform,
    value,
    services,
}) => (
    <Dropdown
        placeholder={placeholder || 'Select service'}
        clearable
        id={id}
        name={name}
        fluid
        search
        selection
        value={value}
        onChange={(e, { value }) => onChange(value)}
        options={services.map(code => ({ text: code, key: code, value: code }))}
        disabled={disable}
    />
);
const Select = ({
    allowedValues,
    checkboxes,
    className,
    disabled,
    error,
    errorMessage,
    fieldType,
    id,
    inputRef,
    label,
    name,
    onChange,
    placeholder,
    required,
    showInlineError,
    transform,
    value,
    services,
    disable,
    ...props
}) => (
    <div
        className={classnames({ disabled, error, required }, className, 'field')}
        {...filterDOMProps(props)}
    >
        {label && <label htmlFor={id}>{label}</label>}

        {/* TODO: Better handling of these props. */}
        {/* eslint-disable max-len */}
        {checkboxes || fieldType === Array
            ? renderCheckboxes({
                allowedValues,
                disable,
                id,
                name,
                onChange,
                transform,
                services,
                value,
                fieldType,
            })
            : renderSelect({
                allowedValues,
                disable,
                id,
                name,
                services,
                onChange,
                transform,
                value,
                inputRef,
                label,
                placeholder,
                required,
            })}
        {/* eslint-enable */}

        {!!(error && showInlineError) && (
            <div className='ui red basic pointing label'>{errorMessage}</div>
        )}
    </div>
);

export default connectField(Select);
