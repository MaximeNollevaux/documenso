import { generateHOTP } from 'oslo/otp';

import { generateTwoFactorCredentialsFromPhone } from './generate-2fa-credentials-from-phone';

export type ValidateTwoFactorTokenFromPhoneOptions = {
  envelopeId: string;
  phoneNumber: string;
  code: string;
  period?: number;
  window?: number;
};

export const validateTwoFactorTokenFromPhone = async ({
  envelopeId,
  phoneNumber,
  code,
  period = 30_000,
  window = 1,
}: ValidateTwoFactorTokenFromPhoneOptions) => {
  const { secret } = generateTwoFactorCredentialsFromPhone({ phoneNumber, envelopeId });

  let now = Date.now();

  for (let i = 0; i < window; i++) {
    const counter = Math.floor(now / period);

    const hotp = await generateHOTP(secret, counter);

    if (code === hotp) {
      return true;
    }

    now -= period;
  }

  return false;
};
