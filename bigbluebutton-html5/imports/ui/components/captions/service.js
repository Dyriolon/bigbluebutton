import _ from 'lodash';
import Captions from '/imports/api/captions';
import Users from '/imports/api/users';
import Auth from '/imports/ui/services/auth';
import mapUser from '/imports/ui/services/user/mapUser';
import { makeCall } from '/imports/ui/services/api';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';

const CAPTIONS_CONFIG = Meteor.settings.public.captions;
const CAPTIONS = '_captions_';
const LINE_BREAK = '\n';

const getActiveCaptions = () => {
  const activeCaptions = Session.get('activeCaptions');
  if (!activeCaptions) return '';
  return activeCaptions;
};

const getCaptions = (locale) => {
  const captions = Captions.findOne({
    meetingId: Auth.meetingID,
    padId: { $regex: `${CAPTIONS}${locale}$` },
  });
  return captions;
};

const getCaptionsData = () => {
  const activeCaptions = getActiveCaptions();
  let padId = '';
  let revs = 0;
  let data = '';
  if (activeCaptions) {
    const captions = getCaptions(activeCaptions);
    if (!_.isEmpty(captions)) {
      padId = captions.padId; // eslint-disable-line prefer-destructuring
      revs = captions.revs; // eslint-disable-line prefer-destructuring
      data = captions.data; // eslint-disable-line prefer-destructuring
    }
  }

  return { padId, revs, data };
};

const getAvailableLocales = () => {
  const { meetingID } = Auth;
  const locales = [];
  Captions.find({ meetingId: meetingID }).forEach((caption) => {
    if (caption.ownerId === '') {
      locales.push(caption.locale);
    }
  });
  return locales;
};

const getOwnedLocales = () => {
  const { meetingID } = Auth;
  const locales = [];
  Captions.find({ meetingId: meetingID }).forEach((caption) => {
    if (caption.ownerId !== '') {
      locales.push(caption.locale);
    }
  });
  return locales;
};

const takeOwnership = (locale) => {
  makeCall('takeOwnership', locale);
};

const formatEntry = (entry) => {
  const letterIndex = entry.charAt(0) === ' ' ? 1 : 0;
  const formattedEntry = `${entry.charAt(letterIndex).toUpperCase() + entry.slice(letterIndex + 1)}.\n\n`;
  return formattedEntry;
};

const appendText = (text, locale) => {
  makeCall('appendText', formatEntry(text), locale);
};

const canIOwnThisPad = (ownerId) => {
  const { userID } = Auth;
  if (!CAPTIONS_CONFIG.takeOwnership) return false;
  if (ownerId === '') return false;
  return ownerId !== userID;
};

const canIDictateThisPad = (ownerId) => {
  const { userID } = Auth;
  if (!CAPTIONS_CONFIG.enableDictation) return false;
  if (ownerId === '') return false;
  const SpeechRecognitionAPI = getSpeechRecognitionAPI();
  if (!SpeechRecognitionAPI) return false;
  return ownerId === userID;
};

const setActiveCaptions = (locale) => {
  Session.set('activeCaptions', locale);
};

const setCaptionsSettings = (settings) => {
  Session.set('captionsSettings', settings);
};

const getCaptionsSettings = () => {
  const settings = Session.get('captionsSettings');
  if (!settings) {
    const {
      backgroundColor, fontColor, fontFamily, fontSize,
    } = CAPTIONS_CONFIG;
    return {
      backgroundColor, fontColor, fontFamily, fontSize,
    };
  }
  return settings;
};

const isCaptionsEnabled = () => CAPTIONS_CONFIG.enabled;

const isCaptionsAvailable = () => {
  if (isCaptionsEnabled) {
    const ownedLocales = getOwnedLocales();
    return (ownedLocales.length > 0);
  }
  return false;
};

const isCaptionsActive = () => {
  const enabled = isCaptionsEnabled();
  const activated = getActiveCaptions() !== '';
  return (enabled && activated);
};

const deactivateCaptions = () => {
  setActiveCaptions('');
};

const activateCaptions = (locale, settings) => {
  setCaptionsSettings(settings);
  setActiveCaptions(locale);
};

const formatCaptionsText = (text) => {
  const splitText = text.split(LINE_BREAK);
  const filteredText = splitText.filter((line, index) => {
    const lastLine = index === (splitText.length - 1);
    const emptyLine = line.length === 0;
    return (!emptyLine || lastLine);
  });
  while (filteredText.length > CAPTIONS_CONFIG.lines) filteredText.shift();
  return filteredText.join(LINE_BREAK);
};

const amIModerator = () => {
  const currentUser = Users.findOne({ userId: Auth.userID });
  return mapUser(currentUser).isModerator;
};

const getSpeechRecognitionAPI = () => {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
};

const initSpeechRecognition = (locale) => {
  const SpeechRecognitionAPI = getSpeechRecognitionAPI();
  let recognition = null;
  if (SpeechRecognitionAPI) {
    recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = locale;
  }

  return recognition;
};

export default {
  getCaptionsData,
  getAvailableLocales,
  getOwnedLocales,
  takeOwnership,
  appendText,
  getCaptions,
  canIOwnThisPad,
  canIDictateThisPad,
  getCaptionsSettings,
  isCaptionsEnabled,
  isCaptionsAvailable,
  isCaptionsActive,
  deactivateCaptions,
  activateCaptions,
  formatCaptionsText,
  amIModerator,
  initSpeechRecognition,
};
