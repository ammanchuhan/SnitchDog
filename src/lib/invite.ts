import { Share } from 'react-native';

import { witnessInviteUrl } from './api';
import type { Plan } from './types';

/** The text that goes to the witness. Written in the owner's voice, because it's sent from their
 *  phone to their friend; the app never messages anyone who hasn't agreed to it. */
export const inviteMessage = ({ witness }: Plan) =>
  `${witness.name} — I’m using an app called Accountable to stay on top of training and weighing in, and I picked you as my witness. You don’t install anything, and you’ll only hear from Ember, the app’s coach, if I go quiet.\n\n${witnessInviteUrl(witness.inviteToken)}`;

/** Opens the share sheet. We can't know whether it was actually sent, so nothing records that it was. */
export const shareInvite = (plan: Plan) => Share.share({ message: inviteMessage(plan) });
