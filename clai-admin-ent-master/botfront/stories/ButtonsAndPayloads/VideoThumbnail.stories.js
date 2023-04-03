import React, { useState, useEffect } from 'react';
import { withKnobs, text, select } from '@storybook/addon-knobs';
import { action } from '@storybook/addon-actions';
import { withBackground } from '../../.storybook/decorators';

import VideoThumbnail from '../../imports/ui/components/stories/common/VideoThumbnail';

const CarouselSlideWrapped = (props) => {
    const { initialVideo = '' } = props;
    const [video, setVideo] = useState(initialVideo);
    useEffect(() => setVideo(initialVideo), [initialVideo]);
    return (
        <VideoThumbnail
            {...props}
            value={video}
            onChange={(...args) => {
                setVideo(...args);
                action('onChange')(...args);
            }}
        />
    );
};

export default {
    title: 'ButtonsAndPayloads/VideoThumbnail',
    component: VideoThumbnail,
    decorators: [withKnobs, withBackground],
};

export const Basic = () => (
    <CarouselSlideWrapped initialVideo={select(
        'Initial video URL',
        [
            '',
            'http://botfront.io/image.png',
            'https://www.google.com/logos/doodles/2020/thank-you-teachers-and-childcare-workers-6753651837108762.3-law.gif',
        ],
        '',
    )}
    />
);
export const WithExtraAction = () => (
    <CarouselSlideWrapped
        otherActions={[
            [text('Other action name', 'Do some other thing'), action('otherActionCallback')],
        ]}
    />
);
