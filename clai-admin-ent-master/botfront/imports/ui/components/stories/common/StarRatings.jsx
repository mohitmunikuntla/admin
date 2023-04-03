import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Icon, Popup } from 'semantic-ui-react';
import uuidv4 from 'uuid/v4';
import { useDrop } from 'react-dnd-cjs';
import StarRating, { isButtonValid } from './StarRating';


function StarRatings({
    value, onChange, fluid
}) {
    let defValue = [{
        title: 'star_1',
        type: 'postback',
        payload: '/feedback_1',
        payload_value: ''
    }];
    const [buttons, setButtons] = useState(value[0].title != '' ? value : defValue);
    const id = useMemo(() => uuidv4(), [false]);
    const [, drop] = useDrop({ accept: `qr-for-${id}` });
    
    const handleChange = (button, i) => {
        const newButtons = [...buttons.slice(0, i), button, ...buttons.slice(i + 1)];
        setButtons(newButtons);
        if (newButtons.every(isButtonValid)) onChange(newButtons);
    };

    const handleAddStar = (len) => {
        const newButtons = [
            ...buttons,
            {
                title: 'star_'+(len+1),
                type: 'postback',
                payload: '/feedback_'+(len+1),
                payload_value: '',
            },
        ];
        setButtons(newButtons);
        if (newButtons.every(isButtonValid)) onChange(newButtons);
    };

    const handleDelete = (index) => {
        const newButtons = [...buttons.slice(0, index), ...buttons.slice(index + 1)];
        setButtons(newButtons);
        if (newButtons.every(isButtonValid)) onChange(newButtons);
    };
    // const handleSwapButtons = (index, draggedButtonIndex) => {
    //     const newButtons = [...buttons];
    //     newButtons[index] = buttons[draggedButtonIndex];
    //     newButtons[draggedButtonIndex] = buttons[index];
    //     setButtons(newButtons);
    //     onChange(newButtons);
    // };

    const starRatings = buttons.map((b, index) => (
        <React.Fragment key={b.title + index}>
            <StarRating
                key={b.title + index}
                value={b}
                onChange={butt => handleChange(butt, index)}
                onDelete={() => handleDelete(index)}
                showDelete={buttons.length > 1}
                parentId={id}
                buttonIndex={index}
            />
        </React.Fragment>
        
    ));

    const renderLastStar = () => (
        <>
            {starRatings[starRatings.length - 1]}
            {buttons.length < 10 && buttons.every(b => isButtonValid(b)) && (
                <Popup
                    size='mini'
                    inverted
                    position='top center'
                    content='Add a star'
                    trigger={(
                        <Icon
                            className='add-quick-reply'
                            data-cy='add-quick-reply'
                            name='add'
                            color='grey'
                            onClick={()=>handleAddStar(buttons.length)}
                        />
                    )}
                />
            )}
        </>
    );


    return (<div className={`quick-replies ${fluid ? 'fluid' : ''}`} ref={drop}>
                {starRatings.slice(0, starRatings.length - 1)}
                {fluid
                    ? renderLastStar()
                    : <div className='last-button'>{renderLastStar()}</div>
                }
            </div>);

}

StarRatings.propTypes = {
    value: PropTypes.arrayOf(PropTypes.object),
    onChange: PropTypes.func.isRequired,
    fluid: PropTypes.bool,
};

StarRatings.defaultProps = {
    fluid: false,
};

export default StarRatings;
