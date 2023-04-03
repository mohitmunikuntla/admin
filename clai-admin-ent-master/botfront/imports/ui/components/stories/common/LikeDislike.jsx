import React, {
    useRef, useState, useEffect, useContext, useMemo
} from 'react';
import PropTypes, { element } from 'prop-types';
import { Popup } from 'semantic-ui-react';
import TextareaAutosize from 'react-autosize-textarea';
import { useDrag, useDrop } from 'react-dnd-cjs';
import ResponseButtonEditor from './ResponseButtonEditor';
import { stringPayloadToObject } from '../../../../lib/story.utils';
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

function LikeDislike({
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

    function renderLike(){
        return (
            <>
                <Popup
                    wide='very'
                    trigger={<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAABmJLR0QA/wD/AP+gvaeTAAABIUlEQVRIie2UMUsDQRCF32xEFNHSynT+ivQ2NraSM2mEHETBysrGX6CFHGJxWMWDAxsRrGysxd5SiAh2QhThcvtssjFEMBPYLQRfNfPYmW9gZxf46xLtwSTLqrC8B5B9lP2D/WbzXVNn1KOUqAFYBrC3UKmcasv0ALE1FxKy4RWQpukiYNa/Aeh7A+R5Pvs5N38JcNV5Ajx6AZCU16I4B7A26gt46wWQdLJDgdTH/ZLMtYDhmiadC7p4J6rLwHsDsKRtNlBXaFrtrc0bYPIdTNscAFYo9swl+jWdTtXQgKegAILXIQHWWHsSEnDVbjSGD9E7gODxaO4ZwIfdKLoLCMDRuDEJ0FW3FjzP9Ho/vpBfAULTUkJeLLkdx3GhHuhfTl8bm1Rx5iLvJgAAAABJRU5ErkJggg=="/>}
                    on='click'
                    // hideOnScroll={true}
                    // open={isOpen}
                    onOpen={() => setIsOpen(true)}
                    onClick={handleSave}
                >
                    <ResponseButtonEditor
                        value={buttonValue}
                        onChange={setButtonValue}
                        onDelete={null}
                        onClose={handleSave}
                        showDelete={null}
                        valid={!!valid}
                        hideButtonType={true}
                    />
                </Popup>
            </>  
              
        );
    }

    function renderDislike(){
        return (
            <>
                <Popup
                    wide='very'
                    trigger={<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAFJSURBVEhL7ZSxSsNQFIbPuTXg0FkQBUc3hz6Ai5MgLkJA06VkECkZ9AFEH0GohQhObYKriyDuvoCrm4LgqIgibY43yc91sOamkEz6QTj/f4d8JPcm9I8NxqTTKBZE6no72Xp/eLEunJzpuJj2Ap4Skk7gedfoBoU5kZI3T5lXzOdhGDrohkKBpszNc4QWRs2mi2awCablANNQsYBbvShaRcmo+gn0qeF9xIzKBZrN/mCwjFyLQCVKBci1CNLXtIFYj0CzhFmb4AHTKnjBnIZHFrWL/P0vmkRvGB8z0yGqIZFkJWi371ALKXyCrrd9JCQxqqHB/OOX8BuFAmaWOcfp6HiTr+QI8RqiFesmu677OfvxvqV191jSAjIfko1Sp8j3/Vf95q9Q042bQbRSSpAh6hZJC+QS0Up5QYNSwbO+Tt7G471s7Q9A9AUVHETZ8m6NvwAAAABJRU5ErkJggg=="/>}
                    on='click'
                    // hideOnScroll={true}
                    // open={isOpen}
                    onOpen={() => setIsOpen(true)}
                    onClick={handleSave}
                >
                    <ResponseButtonEditor
                        value={buttonValue}
                        onChange={setButtonValue}
                        onDelete={null}
                        onClose={handleSave}
                        showDelete={null}
                        valid={!!valid}
                        hideButtonType={true}
                    />
                </Popup>
            </>  
              
        );
    }

    return (
        <>
            <div className='likedislike'>
                {buttonValue.title=='like' ? renderLike() : null}
                {buttonValue.title=='dislike' ? renderDislike() : null}
            </div> 
        </>

    );
}

LikeDislike.propTypes = {
    value: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
    onDelete: PropTypes.func,
    showDelete: PropTypes.bool,
    parentId: PropTypes.string,
    buttonIndex: PropTypes.number,
    onReorder: PropTypes.func,
};

LikeDislike.defaultProps = {
    showDelete: true,
    parentId: 'default',
    buttonIndex: 0,
    onReorder: () => {},
};

export default LikeDislike;