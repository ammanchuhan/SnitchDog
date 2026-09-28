import { Share } from 'react-native';

import { witnessInviteUrl } from './api';
import type { Witness } from './types';

/** The text that goes to a witness, in the owner's voice, because it's sent from their phone to
 *  their friend. Snitch never messages anyone who hasn't tapped the link. */
export const inviteMessage = (w: Witness) =>
  `${w.name ? `${w.name}, ` : ''}I’m using an app called SnitchDog to keep myself honest about training and weighing in, and I picked you as one of my witnesses. Nothing to install: tap the link and you’ll only hear from Snitch, the app’s coach, if I start slipping.\n\n${witnessInviteUrl(w.inviteToken)}`;

/** Opens the share sheet (WIT-4). Nothing records that it was sent: the status only changes
 *  when they tap it. */
export const shareInvite = (w: Witness) => Share.share({ message: inviteMessage(w) });
