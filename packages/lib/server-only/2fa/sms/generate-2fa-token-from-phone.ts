import { generateHOTP } from 'oslo/otp';

import { generateTwoFactorCredentialsFromPhone } from './generate-2fa-credentials-from-phone';

export type GenerateTwoFactorTokenFromPhoneOptions = {
  envelopeId: string;
  phoneNumber: string;
  period?: number;
};

export const generateTwoFactorTokenFromPhone = async ({
  phoneNumber,
  envelopeId,
  period = 30_000,
}: GenerateTwoFactorTokenFromPhoneOptions) => {
  const { secret } = generateTwoFactorCredentialsFromPhone({ phoneNumber, envelopeId });

  const counter = Math.floor(Date.now() / period);

  const token = await generateHOTP(secret, counter);

  return token;
};
