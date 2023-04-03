import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import uuidv4 from 'uuid/v4';
import { useDrop } from 'react-dnd-cjs';
import LikeDislike from './LikeDislike';

function LikeDislikes({
    value, onChange
}) {
    let tempValue = [
        {
            title: 'like',
            type: 'postback',
            payload: '/like_intent',
            payload_value: '',
        },
        {
            title: 'dislike',
            type: 'postback',
            payload: '/dislike_intent',
            payload_value: '',
        },
    ]
    const [buttons, setButtons] = useState(value[0].title != '' ? value : tempValue);
    const id = useMemo(() => uuidv4(), [false]);
    const [, drop] = useDrop({ accept: `qr-for-${id}` });
    const handleChange = (button, i) => {
        const newButtons = [...buttons.slice(0, i), button, ...buttons.slice(i + 1)];
        setButtons(newButtons);
        onChange(newButtons);
    };

    const likeDislike = buttons.map((b, index) => (
        <React.Fragment key={b.title + index}>
            <LikeDislike
                key={b.title + index}
                value={b}
                onChange={butt => handleChange(butt, index)}
                parentId={id}
                buttonIndex={index}
            />
            
        </React.Fragment>
    ));


    return (<div className={`quick-replies`} ref={drop}>
                {likeDislike}  
            </div>);
}

LikeDislikes.propTypes = {
    value: PropTypes.arrayOf(PropTypes.object),
    onChange: PropTypes.func.isRequired,
};

LikeDislikes.defaultProps = {
    value: [],
};

export default LikeDislikes;
