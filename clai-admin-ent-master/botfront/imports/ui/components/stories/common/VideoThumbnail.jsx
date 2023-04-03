import React, {
    useRef, useState, useEffect, useContext,
} from 'react';
import PropTypes from 'prop-types';
import {
    Embed, Input, Button, Modal, Icon, Dimmer, Loader, Radio, Form, Dropdown
} from 'semantic-ui-react';
import { NativeTypes } from 'react-dnd-html5-backend-cjs';
import { useDrop } from 'react-dnd-cjs';
import { ResponseContext } from './BotResponsesContainer';
import { ProjectContext } from '../../../layouts/context';
import { wrapMeteorCallback } from '../../utils/Errors';
import { Types } from 'mongoose';

export default function VideoThumbnail(props) {
    const {
        value, type, alt, editable, onChange, otherActions, className,
    } = props;

    const [newValue, setNewValue] = useState(value);
    const [modalOpen, setModalOpen] = useState(false);
    const [types, setTypes] = useState(type);
    const [alts, setAlt] = useState(alt);
    const checkvalue = (type == "video") ? true : false;
    const [checked, setChecked] = useState(checkvalue);
    const { uploadImage, name } = useContext(ResponseContext) || {};
    const { project: { _id: projectId }, language } = useContext(ProjectContext);
    useEffect(() => setNewValue(value), [value]);
    useEffect(() => setTypes(type), [type]);
    useEffect(() => setAlt(alts), [alts]);

    const videoUrlRef = useRef();
    const typeRef = useRef();
    const altRef = useRef();
    const fileField = useRef();
    const [isUploading, setIsUploading] = useState();

    const handleSrcChange = (src) => {
        onChange(src);
        Meteor.call('delete.video', projectId, value, name, language, wrapMeteorCallback);
    };

    const setVideoFromUrlBox = () => {
        // handleSrcChange(videoUrlRef.current.inputRef.current.value);
        // code added to fix video upload issue (A.C - Pemari)
        onChange(videoUrlRef.current.inputRef.current.value, types, alts);
        
        if(videoUrlRef.current.inputRef.current.value != value){
        Meteor.call('delete.video', projectId, value, name, language, wrapMeteorCallback);
        }
        setModalOpen(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            setVideoFromUrlBox();
        }
    };

    const handleFileDrop = async (files) => {
        const validFiles = Array.from(files).filter(f => f.type.startsWith('video/'));
        if (validFiles.length !== 1) return; // reject sets, and non-videos
        setIsUploading(true);
        setModalOpen(false);
        uploadImage({
            file: validFiles[0], setVideo: handleSrcChange, resetUploadStatus: () => setIsUploading(false),
        });
    };

    const [{ canDrop, isOver }, drop] = useDrop({
        accept: [NativeTypes.FILE],
        drop: item => handleFileDrop(item.files),
        collect: monitor => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    });

    const actions = [
        ['Set video', () => setModalOpen(true), 'set-video'],
        ...otherActions,
    ];

    const checkClicked = (event) => {
        if(event.target.value == "video") {
            setChecked(true)
        } else {
            setChecked(false)
        }
        setTypes(event.target.value);
    }

    const videoClick = () => {
        window.open(value);
    }

    const videoStyle = {
        position: "absolute",
        top: "0",
        zIndex: "0",
        left:"0",
        width: "100%",
        height: "100%"
    }

    const altChange = (event) => {
        setAlt(event.target.value)
    }

    const renderSetVideo = () => (
        <div className={`image-modal ${canDrop && isOver ? 'upload-target' : ''}`} ref={drop}>
            {uploadImage && (
            <>
                <div className='align-center'>
                    <Icon name='video' size='huge' color='grey' />
                    <Form>
                        <input ref={typeRef} type="radio" checked={types === 'mp4'} value='mp4' name="videos" id="mp4" onChange={checkClicked} />
                        <label>Mp4</label>&nbsp;&nbsp;&nbsp;&nbsp;
                        <input ref={typeRef} type="radio" checked={types === 'video'} value='video' name="videos" id="video" onChange={checkClicked}/>
                        <label>YouTube</label>
                    </Form>
                </div>
                <div className='or'> and </div>
            </>
            )}
            <div className='side-by-side middle'>
                <div>    
                    <b>Insert video from URL</b>
                    <Input
                    ref={videoUrlRef}
                    autoFocus
                    value={newValue}
                    //code added to fix video upload issue (A.C -Pemari)
                    onChange={(_, { value: v}) => {Meteor.call('delete.video', projectId, value, name, language, wrapMeteorCallback);setNewValue(v)}}
                    placeholder='URL'
                    onKeyDown={handleKeyDown}
                    size='small'
                    data-cy='video-url-input'
                    className='image-url-input'
                    />
                </div>
                <div>
                    <b>Add alt tag</b>
                    <Input className='image-url-input' placeholder='Tag' autoFocus ref={altRef} value={alts} onChange={altChange} />
                </div>
                {/* <Button primary onClick={()=>{setVideoFromUrlBox}} size='small' content='Save' /> */}
            </div>
        </div>
    );

    return (
        <div data-cy='video-container' className={`image-container ${value.trim() ? 'image-set' : ''} ${className}`}>
            {!isUploading
                ? (
                    <>
                        <div className={`overlay-menu ${!editable ? 'uneditable' : ''}`}>
                            <div>
                                {editable && (
                                    <Button.Group vertical>
                                        {actions.map(([title, func, dataCy, buttonClass]) => (
                                            <Button basic key={title} onClick={func} content={title} data-cy={dataCy} className={buttonClass} />
                                        ))}
                                    </Button.Group>
                                )}
                            </div>
                        </div>
                        {checked ? (<iframe title={alts} src={newValue || '/images/image-temp.svg'} style={videoStyle} allowFullScreen frameBorder="0"></iframe>)
                        : (<video title={alts} src={newValue || '/images/image-temp.svg'} style={videoStyle} controls type="video/mp4" onClick={videoClick}></video>)}
                    </>
                )
                : (
                    <Dimmer active inverted>
                        <Loader inverted size='small'>
                            <span className='small grey'>Uploading</span>
                        </Loader>
                    </Dimmer>
                )
            }
            {modalOpen && (
                <Modal
                    open
                    size='tiny'
                    onClose={setVideoFromUrlBox}
                    content={renderSetVideo()}
                />
            )}
        </div>
    );
}

VideoThumbnail.propTypes = {
    onChange: PropTypes.func,
    value: PropTypes.string,
    type: PropTypes.string,
    alt: PropTypes.string,
    editable: PropTypes.bool,
    otherActions: PropTypes.array,
    className: PropTypes.string,
};

VideoThumbnail.defaultProps = {
    onChange: () => {},
    otherActions: [],
    editable: true,
    value: '',
    type: 'mp4',
    alt: '',
    className: '',
};
