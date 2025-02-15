import React, { PureComponent } from 'react';
import { defineMessages, injectIntl } from 'react-intl';
import cx from 'classnames';
import TextareaAutosize from 'react-autosize-textarea';
import browser from 'browser-detect';
import { styles } from './styles.scss';
import Button from '../../button/component';

const propTypes = {
};

const defaultProps = {
};

const messages = defineMessages({
  submitLabel: {
    id: 'app.chat.submitLabel',
    description: 'Chat submit button label',
  },
  inputLabel: {
    id: 'app.chat.inputLabel',
    description: 'Chat message input label',
  },
  inputPlaceholder: {
    id: 'app.chat.inputPlaceholder',
    description: 'Chat message input placeholder',
  },
  errorMinMessageLength: {
    id: 'app.chat.errorMinMessageLength',
  },
  errorMaxMessageLength: {
    id: 'app.chat.errorMaxMessageLength',
  },
  errorServerDisconnected: {
    id: 'app.chat.disconnected',
  },
});

class MessageForm extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      message: '',
      error: '',
      hasErrors: false,
    };

    this.BROWSER_RESULTS = browser();

    this.handleMessageChange = this.handleMessageChange.bind(this);
    this.handleMessageKeyDown = this.handleMessageKeyDown.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.setMessageHint = this.setMessageHint.bind(this);
  }

  componentDidMount() {
    const { mobile } = this.BROWSER_RESULTS;

    this.setMessageState();

    if (!mobile) {
      this.textarea.focus();
    }
  }

  componentDidUpdate(prevProps) {
    const { chatId, disabled } = this.props;
    const { message } = this.state;
    const { mobile } = this.BROWSER_RESULTS;

    if (prevProps.chatId !== chatId && !mobile) {
      this.textarea.focus();
    }

    if (prevProps.chatId !== chatId) {
      this.updateUnsentMessagesCollection(prevProps.chatId, message);
      this.setMessageState();
    }

    if (prevProps.disabled !== disabled && disabled) {
      this.setMessageHint();
    }

    if (prevProps.disabled !== disabled && !disabled) {
      this.setMessageHint();
    }
  }

  componentWillUnmount() {
    const { chatId } = this.props;
    const { message } = this.state;
    this.updateUnsentMessagesCollection(chatId, message);
    this.setMessageState();
  }

  setMessageHint() {
    const { disabled, intl } = this.props;
    this.setState({
      hasErrors: disabled,
      error: intl.formatMessage(messages.errorServerDisconnected),
    });
  }

  setMessageState() {
    const { chatId, UnsentMessagesCollection } = this.props;
    const unsentMessageByChat = UnsentMessagesCollection.findOne({ chatId });
    this.setState({ message: unsentMessageByChat ? unsentMessageByChat.message : '' });
  }

  updateUnsentMessagesCollection(chatId, message) {
    const { UnsentMessagesCollection } = this.props;
    UnsentMessagesCollection.upsert(
      { chatId },
      { $set: { message } },
    );
  }

  handleMessageKeyDown(e) {
    // TODO Prevent send message pressing enter on mobile and/or virtual keyboard
    if (e.keyCode === 13 && !e.shiftKey) {
      e.preventDefault();

      const event = new Event('submit', {
        bubbles: true,
        cancelable: true,
      });

      this.form.dispatchEvent(event);
    }
  }

  handleMessageChange(e) {
    const { intl } = this.props;

    const message = e.target.value;
    let error = '';

    const { minMessageLength, maxMessageLength } = this.props;

    if (message.length < minMessageLength) {
      error = intl.formatMessage(
        messages.errorMinMessageLength,
        { 0: minMessageLength - message.length },
      );
    }

    if (message.length > maxMessageLength) {
      error = intl.formatMessage(
        messages.errorMaxMessageLength,
        { 0: message.length - maxMessageLength },
      );
    }


    this.setState({
      message,
      error,
    });
  }

  handleSubmit(e) {
    e.preventDefault();

    const {
      disabled, minMessageLength, maxMessageLength, handleSendMessage,
    } = this.props;
    const { message } = this.state;
    let msg = message.trim();


    if (disabled
      || msg.length === 0
      || msg.length < minMessageLength
      || msg.length > maxMessageLength) {
      this.setState({ hasErrors: true });
      return false;
    }

    // Sanitize. See: http://shebang.brandonmintern.com/foolproof-html-escaping-in-javascript/

    const div = document.createElement('div');
    div.appendChild(document.createTextNode(msg));
    msg = div.innerHTML;

    return (
      handleSendMessage(msg),
      this.setState({
        message: '',
        hasErrors: false,
      })
    );
  }

  render() {
    const {
      intl, chatTitle, chatName, disabled, className, chatAreaId,
    } = this.props;

    const { hasErrors, error, message } = this.state;

    return (
      <form
        ref={(ref) => { this.form = ref; }}
        className={cx(className, styles.form)}
        onSubmit={this.handleSubmit}
      >
        <div className={styles.wrapper}>
          <TextareaAutosize
            className={styles.input}
            id="message-input"
            innerRef={(ref) => { this.textarea = ref; return this.textarea; }}
            placeholder={intl.formatMessage(messages.inputPlaceholder, { 0: chatName })}
            aria-controls={chatAreaId}
            aria-label={intl.formatMessage(messages.inputLabel, { 0: chatTitle })}
            aria-invalid={hasErrors ? 'true' : 'false'}
            aria-describedby={hasErrors ? 'message-input-error' : null}
            autoCorrect="off"
            autoComplete="off"
            spellCheck="true"
            disabled={disabled}
            value={message}
            onChange={this.handleMessageChange}
            onKeyDown={this.handleMessageKeyDown}
          />
          <Button
            hideLabel
            circle
            className={styles.sendButton}
            aria-label={intl.formatMessage(messages.submitLabel)}
            type="submit"
            disabled={disabled}
            label={intl.formatMessage(messages.submitLabel)}
            color="primary"
            icon="send"
            onClick={() => null}
          />
        </div>
        <div className={styles.info}>
          {hasErrors ? <span id="message-input-error">{error}</span> : null}
        </div>
      </form>
    );
  }
}

MessageForm.propTypes = propTypes;
MessageForm.defaultProps = defaultProps;

export default injectIntl(MessageForm);
