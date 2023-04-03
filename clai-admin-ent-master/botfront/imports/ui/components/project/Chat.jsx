import React from 'react';
import PropTypes from 'prop-types';
import Widget from 'clai-webchat';

class Chat extends React.Component {
    // WARNING
    // Returns false, because for some uninvestigated reason, Widget creates
    // leaking connections on ComponentWillUpdate
    constructor(props){
        super(props)
        const customData = {
            clarity: {
                authToken: "",
              url: ""
            }
        }
        this.state ={
            customDataResp: localStorage.getItem('UserContext') ? JSON.parse(localStorage.getItem('UserContext')) : customData
        }
    }
    shouldComponentUpdate(nextProps, nextState) {
        // WARNING
        // This component will never update itself
        // return false;
        if(this.state.customDataResp != nextState.customDataResp){
            this.setState({customDataResp: JSON.parse(localStorage.getItem('UserContext'))})
            return true;
        }
        return false;
    }

    render() {
        const {
            socketUrl,
            language,
            path,
            initialPayLoad,
            closePayload,
            innerRef,
        } = this.props;
        // const customDataResp = localStorage.getItem('UserContext') ? JSON.parse(localStorage.getItem('UserContext')) : customData;
        const cdata = { language, ...this.state.customDataResp }
        return (
            <Widget
                ref={innerRef}
                interval={0}
                initPayload={initialPayLoad}
                closePayload={closePayload}
                socketUrl={socketUrl}
                socketPath={path}
                inputTextFieldHint='Try out your chatbot ...'
                hideWhenNotConnected={false}
                customData={{ language, ...this.state.customDataResp }}
                embedded
                customMessageDelay={() => 0}
                customComponent={(message) => {
                    const {
                        dispatch, id, isLast, store, ...custom
                    } = message;
                    return (
                        <div className='rw-response'>
                            You have to define a custom component prop on the clai webchat to display this message.
                            {JSON.stringify(custom)}
                        </div>
                    );
                }}
                withRules
            />
        );
    }
}

Chat.propTypes = {
    socketUrl: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired,
    language: PropTypes.string,
    initialPayLoad: PropTypes.string,
    closePayload: PropTypes.string,
    innerRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
};

Chat.defaultProps = {
    language: '',
    initialPayLoad: '',
    closePayload: '',
};

export default React.forwardRef((props, ref) => <Chat innerRef={ref} {...props} />);
