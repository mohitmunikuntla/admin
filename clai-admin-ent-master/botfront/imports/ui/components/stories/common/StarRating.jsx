import React, {
    useRef, useState, useEffect, useContext, useMemo
} from 'react';
import PropTypes, { element } from 'prop-types';
import { Popup } from 'semantic-ui-react';
import TextareaAutosize from 'react-autosize-textarea';
import { useDrag, useDrop } from 'react-dnd-cjs';
import ResponseButtonEditor from './ResponseButtonEditor';
import { stringPayloadToObject } from '../../../../lib/story.utils';
import { FaStar } from "react-icons/fa";
import uuidv4 from 'uuid/v4';

export const isButtonValid = ({
    title = '',
    type,
    url,
    payload, // eslint-disable-line camelcase
}) => {
    const titleOk = title.length > 0;
    const payloadOk = type === 'postback'
        ? !!stringPayloadToObject(payload).intent
        : !!url;

    return titleOk && payloadOk;
};

function StarRating({
    value, onChange, onDelete, showDelete, parentId, buttonIndex, onReorder, buttonCss
}) {
    const [buttonValue, setButtonValue] = useState(value);
    const valid = isButtonValid(buttonValue);
    const [isOpen, setIsOpen] = useState(false);
    const [, drag] = useDrag({
        item: { type: `slide-for-${parentId}`, buttonIndex },
    });
    const [{ canDrop, isOver }, drop] = useDrop({
        accept: `slide-for-${parentId}`,
        drop: ({ buttonIndex: draggedButtonIndex }) => {
            if (draggedButtonIndex !== buttonIndex) onReorder(buttonIndex, draggedButtonIndex);
        },
        collect: monitor => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    });

    function Star( props ){
        return ( 
          <div className={`star ${(props.value == 0) ? 'semi-active' : ''} ${(props.position <= props.rated) ? 'active' : ''} `} 
               onMouseEnter={ props.onMouseEnter }
            //    onMouseLeave={ props.onMouseLeave }
               onClick={ props.onClick }
      
          >
            <FaStar />
          </div>
        );
    }

    const handleSave = (e) => {
        let origin = e.target; let depth = 0;
        while (origin.className !== 'intent-dropdown' && depth < 8) {
            origin = origin.parentElement || {};
            depth += 1;
        }
        if (origin.className === 'intent-dropdown') return;
        setIsOpen(false);
        buttonValue.__typename = buttonValue.type === 'postback' ? 'PostbackButton' : '';
        onChange(buttonValue);
    };

    function renderStar(){
        return (
            <>
                <Popup
                    wide='very'
                    trigger={<Star />}
                    on='hover'
                    // hideOnScroll={true}
                    open={isOpen}
                    onOpen={() => setIsOpen(true)}
                    onClose={handleSave}
                >
                    <ResponseButtonEditor
                        value={buttonValue}
                        onChange={setButtonValue}
                        onDelete={onDelete}
                        onClose={handleSave}
                        showDelete={showDelete}
                        valid={!!valid}
                        hideButtonType={true}
                    />
                </Popup>
            </>  
              
        );
    }

    return (
        <>
            <div className='rating-stars'>
                {renderStar()}
            </div> 
        </>

    );
}

StarRating.propTypes = {
    value: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    showDelete: PropTypes.bool,
    parentId: PropTypes.string,
    buttonIndex: PropTypes.number,
    onReorder: PropTypes.func,
};

StarRating.defaultProps = {
    showDelete: true,
    parentId: 'default',
    buttonIndex: 0,
    onReorder: () => {},
};

export default StarRating;