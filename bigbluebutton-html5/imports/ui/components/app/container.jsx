import React from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import { defineMessages, injectIntl } from 'react-intl';
import PropTypes from 'prop-types';
import Auth from '/imports/ui/services/auth';
import Users from '/imports/api/users';
import Meetings from '/imports/api/meetings';
import { notify } from '/imports/ui/services/notification';
import CaptionsContainer from '/imports/ui/components/captions/container';
import CaptionsService from '/imports/ui/components/captions/service';
import getFromUserSettings from '/imports/ui/services/users-settings';
import deviceInfo from '/imports/utils/deviceInfo';
import UserInfos from '/imports/api/users-infos';
import { startBandwidthMonitoring, updateNavigatorConnection } from '/imports/ui/services/network-information/index';
import mapUser from '../../services/user/mapUser';

import {
  getFontSize,
  getBreakoutRooms,
  validIOSVersion,
} from './service';

import { withModalMounter } from '../modal/service';

import App from './component';
import NavBarContainer from '../nav-bar/container';
import ActionsBarContainer from '../actions-bar/container';
import MediaContainer from '../media/container';

const propTypes = {
  navbar: PropTypes.node,
  actionsbar: PropTypes.node,
  media: PropTypes.node,
};

const defaultProps = {
  navbar: <NavBarContainer />,
  actionsbar: <ActionsBarContainer />,
  media: <MediaContainer />,
};

const intlMessages = defineMessages({
  waitingApprovalMessage: {
    id: 'app.guest.waiting',
    description: 'Message while a guest is waiting to be approved',
  },
});

const endMeeting = (code) => {
  Session.set('codeError', code);
  Session.set('isMeetingEnded', true);
};

const AppContainer = (props) => {
  const {
    navbar,
    actionsbar,
    media,
    ...otherProps
  } = props;

  return (
    <App
      navbar={navbar}
      actionsbar={actionsbar}
      media={media}
      {...otherProps}
    />
  );
};

export default injectIntl(withModalMounter(withTracker(({ intl, baseControls }) => {
  const currentUser = Users.findOne({ userId: Auth.userID });
  const currentMeeting = Meetings.findOne({ meetingId: Auth.meetingID });
  const { publishedPoll, voiceProp } = currentMeeting;

  if (!currentUser.approved) {
    baseControls.updateLoadingState(intl.formatMessage(intlMessages.waitingApprovalMessage));
  }

  // Check if user is removed out of the session
  Users.find({ userId: Auth.userID }).observeChanges({
    changed(id, fields) {
      const hasNewConnection = 'connectionId' in fields && (fields.connectionId !== Meteor.connection._lastSessionId);

      if (fields.ejected || hasNewConnection) {
        endMeeting('403');
      }
    },
  });

  const UserInfo = UserInfos.find({
    meetingId: Auth.meetingID,
    requesterUserId: Auth.userID,
  }).fetch();

  return {
    captions: CaptionsService.isCaptionsActive() ? <CaptionsContainer /> : null,
    fontSize: getFontSize(),
    hasBreakoutRooms: getBreakoutRooms().length > 0,
    customStyle: getFromUserSettings('customStyle', false),
    customStyleUrl: getFromUserSettings('customStyleUrl', false),
    openPanel: Session.get('openPanel'),
    UserInfo,
    notify,
    validIOSVersion,
    isPhone: deviceInfo.type().isPhone,
    isRTL: document.documentElement.getAttribute('dir') === 'rtl',
    meetingMuted: voiceProp.muteOnStart,
    currentUserEmoji: mapUser(currentUser).emoji,
    hasPublishedPoll: publishedPoll,
    startBandwidthMonitoring,
    handleNetworkConnection: () => updateNavigatorConnection(navigator.connection),
  };
})(AppContainer)));

AppContainer.defaultProps = defaultProps;
AppContainer.propTypes = propTypes;
