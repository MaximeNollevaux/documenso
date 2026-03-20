import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { createTOTPKeyURI } from 'oslo/otp';

import { DOCUMENSO_ENCRYPTION_KEY } from '../../../constants/crypto';

const ISSUER = 'Documenso SMS 2FA';

export type GenerateTwoFactorCredentialsFromPhoneOptions = {
  envelopeId: string;
  phoneNumber: string;
};

export const generateTwoFactorCredentialsFromPhone = ({
  envelopeId,
  phoneNumber,
}: GenerateTwoFactorCredentialsFromPhoneOptions) => {
  if (!DOCUMENSO_ENCRYPTION_KEY) {
    throw new Error('Missing DOCUMENSO_ENCRYPTION_KEY');
  }

  const identity = `sms-2fa|v1|phone:${phoneNumber}|id:${envelopeId}`;

  const secret = hmac(sha256, DOCUMENSO_ENCRYPTION_KEY, identity);

  const uri = createTOTPKeyURI(ISSUER, phoneNumber, secret);

  return {
    uri,
    secret,
  };
};
