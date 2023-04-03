import { configure, addDecorator } from '@storybook/react';
import '../../../client/fonts/semantic.min.css';
import '../client/main.less';
import {
    withReduxProvider,
    withProjectContext,
    withStoriesContext,
} from './decorators';

addDecorator(withReduxProvider);
addDecorator(withProjectContext);
addDecorator(withStoriesContext);

configure(require.context('../stories', true, /\.stories\.js$/), module);