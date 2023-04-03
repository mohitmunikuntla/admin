/* eslint-disable no-underscore-dangle */
import React, {
    useState, useEffect, useRef,
} from 'react';
import PropTypes from 'prop-types';
import { Button } from 'semantic-ui-react';
import TextareaAutosize from 'react-autosize-textarea';
import ImageThumbnail from './ImageThumbnail';
import VideoThumbnail from './VideoThumbnail';
import TableThumbnail from './TableThumbnail';
import CarouselEditor from './CarouselEditor';
import QuickReplies from './QuickReplies';
import StarRatings from './StarRatings';
import LikeDislikes from './LikeDislikes';

const BotResponseContainer = (props) => {
    const {
        value, onDelete, onChange, focus, onFocus, editCustom, tag, hasMetadata, metadata, editable, disableEnterKey,
    } = props;
    const [input, setInput] = useState();
    const focusGrabber = useRef();
    const focusHasBeenSet = useRef(false);
    const isCustom = value.__typename === 'CustomPayload';
    const isTextResponse = value.__typename === 'TextPayload';
    const isQRResponse = value.__typename === 'QuickRepliesPayload';
    const isButtonsResponse = value.__typename === 'TextWithButtonsPayload';
    const isCarouselResponse = value.__typename === 'CarouselPayload';
    const isImageResponse = value.__typename === 'ImagePayload';
    const isVideoResponse = value.__typename === 'VideoPayload';
    const isTableResponse = value.__typename === 'TablePayload';
    const isStarRatingResponse = value.__typename === 'StarRatingPayload';
    const isLikeDislikeResponse = value.__typename === 'LikeDislikePayload';
    const hasText = Object.keys(value).includes('text') && value.text !== null;


    const unformatNewlines = (response) => {
        if (!response) return response;
        return response.replace(/ {2}\n/g, '\n');
    };

    const formatNewlines = text => text.replace(/\n/g, '  \n');

    useEffect(() => {
        setInput(unformatNewlines(value.text));
    }, [value.text]);
    useEffect(() => {
        if (focus && !focusHasBeenSet.current && focusGrabber.current) {
            focusGrabber.current.focus();
            focusHasBeenSet.current = true;
        }
    }, [focus]);

    const setText = (e) => {
        //code added to remove unwanted characters from dialogue box - A.C(Pemari)
        var te = e.target.value
        var le = te.length
        while(le >= 0) {
            le--;
            if(!(te.charCodeAt(le) >= 0 && te.charCodeAt(le) <= 32)) {

                le++;
                break
            }
            
          
        }
        e.target.value = te.substring(0, le)
        onChange({ ...value, text: formatNewlines(e.target.value) }, false);
        //onChange({ ...value, text: formatNewlines(input) }, false);
    }
    const setImage = (image, alt) => onChange({ ...value, image : { url: image, alt: alt }}, false);
    const setVideo = (video, type, alt) => {
        onChange({ ...value, video: { url: video, type: type, tag: alt } }, false);
    }
    const setTable = (headings, data, limitrow, stylehead, stylebody) => {
        onChange({ ...value, table: { limitrow:limitrow, headings:headings, data:data, stylehead:stylehead, stylebody:stylebody } }, false); //stylehead: stylehead, stylebody: stylebody
    }

    function handleTextBlur(e) {
        const tagRegex = new RegExp(tag);
        if (e.relatedTarget && !!e.relatedTarget.id.match(tagRegex)) return;
        setText(e);
    }

    const handleKeyDown = (e) => {

        const { key, shiftKey } = e;
        if (key === 'Backspace' && !input) {
            e.preventDefault();
            onDelete();
        }
        if (key === 'Enter' && isTextResponse && !disableEnterKey) {
            if (shiftKey) return;
            e.preventDefault();
            onChange({ text: formatNewlines(input) }, true);
        }
    };

    const renderText = () => (
        <TextareaAutosize
            ref={focusGrabber}
            placeholder='Type a message'
            role='button'
            tabIndex={0}
            value={input}
            onChange={(event) => {
                setInput(event.target.value);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => onFocus()}
            onBlur={handleTextBlur}
        />
    );

    const renderButtons = () => (
        <QuickReplies
            buttonCss={getCustomButtonStyle()}
            value={value.buttons}
            onChange={(buttons) => {
                onChange({ ...value, buttons }, false);
            }}
        />
    );

    const renderQuickReply = () => (
        <QuickReplies
            buttonCss={getCustomButtonStyle()}
            value={value.quick_replies}
            onChange={(buttons) => {
                onChange({ ...value, quick_replies: buttons }, false);
            }}
        />
    );

    const renderCustom = () => (
        <Button
            className='edit-custom-response'
            onClick={() => editCustom()}
            data-cy='edit-custom-response'
        >
            Custom Format Response
        </Button>
    );

    const renderStarRating = () => (
        <StarRatings
            buttonCss={getCustomButtonStyle()}
            value={value.starrating}
            onChange={(starrating) => {
                onChange({ ...value, starrating }, false);
            }}
        />
    )    

    const renderLikeDislike = () => (
        <LikeDislikes
            buttonCss={getCustomButtonStyle()}
            value={value.likedislike}
            onChange={(likedislike) => {
                onChange({ ...value, likedislike }, false);
            }}
        />
    )

    let extraClass = '';
    if (isImageResponse) extraClass = `${extraClass} image-response-container`;
    if (isVideoResponse) extraClass = `${extraClass} video-response-container`;
    if (isTableResponse) extraClass = `${extraClass} table-response-container`;
    if (isCarouselResponse) extraClass = `${extraClass} carousel-response-container`;
    if (isStarRatingResponse) extraClass = `${extraClass} starrating-response-container`;
    const metadataClass = hasMetadata ? 'metadata-response' : '';

    const getCustomStyle = () => {
        if (metadata
            && metadata.customCss
            && metadata.customCss.style === 'custom'
            && metadata.customCss.css
        ) {
            return { style: { cssText: metadata.customCss.css } };
        }
        return {};
    }

    const getCustomButtonStyle = () => {
        if (metadata
            && metadata.customCss
            && metadata.customCss.style === 'custom'
            && metadata.customCss.buttoncss
        ) {
            return { style: { cssText: metadata.customCss.buttoncss } };
        }
        return {};
    }

    return (
        <div
            className={`utterance-container ${extraClass} ${metadataClass} ${editable ? '' : 'read-only'}`}
            agent='bot'
            data-cy='bot-response-input'
            {...getCustomStyle()}
        >
            <div className={`${hasMetadata ? 'metadata-response' : ''} ${editable ? '' : 'read-only'}`}>
                {hasText && !isImageResponse && !isVideoResponse && renderText()}
                {isImageResponse && <ImageThumbnail value={value.image.url} alt={value.image.alt} onChange={setImage} />}
                {isVideoResponse && <VideoThumbnail value={value.video.url} alt={value.video.tag} type={value.video.type} onChange={setVideo} />}
                {isTableResponse && <TableThumbnail limitrow={value.table.limitrow} stylebody={value.table.stylebody} stylehead={value.table.stylehead} headings={value.table.headings} data={value.table.data} onChange={setTable} />}
                {isStarRatingResponse && renderStarRating()}
                {isCarouselResponse && <CarouselEditor value={value} onChange={onChange} buttonCss={getCustomButtonStyle()} />}
                {isButtonsResponse && renderButtons()}
                {isQRResponse && renderQuickReply()}
                {isCustom && renderCustom()}
                {isLikeDislikeResponse && renderLikeDislike()}
            </div>
        </div>
    );
};

BotResponseContainer.propTypes = {
    value: PropTypes.object.isRequired,
    buttonCss: PropTypes.object,
    focus: PropTypes.bool,
    type: PropTypes.string,
    alt: PropTypes.string,
    onFocus: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    editCustom: PropTypes.func,
    tag: PropTypes.string,
    hasMetadata: PropTypes.bool,
    metadata: PropTypes.object,
    editable: PropTypes.bool,
    disableEnterKey: PropTypes.bool,
};

BotResponseContainer.defaultProps = {
    focus: false,
    editCustom: () => {},
    tag: null,
    hasMetadata: false,
    metadata: {},
    editable: true,
    disableEnterKey: false,
};

export default BotResponseContainer;
