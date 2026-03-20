import { EnvelopeType } from '@prisma/client';

import { prisma } from '@documenso/prisma';

import { AppError, AppErrorCode } from '../../../errors/app-error';
import { DOCUMENT_AUDIT_LOG_TYPE } from '../../../types/document-audit-logs';
import { createDocumentAuditLogData } from '../../../utils/document-audit-logs';
import { unsafeBuildEnvelopeIdQuery } from '../../../utils/envelope';
import { sendSms } from '../../sms/bird-sms';
import { TWO_FACTOR_SMS_EXPIRATION_MINUTES } from './constants';
import { generateTwoFactorTokenFromPhone } from './generate-2fa-token-from-phone';

export type Send2FATokenSmsOptions = {
  token: string;
  envelopeId: string;
};

export const send2FATokenSms = async ({ token, envelopeId }: Send2FATokenSmsOptions) => {
  const envelope = await prisma.envelope.findFirst({
    where: {
      ...unsafeBuildEnvelopeIdQuery(
        {
          type: 'envelopeId',
          id: envelopeId,
        },
        EnvelopeType.DOCUMENT,
      ),
      recipients: {
        some: {
          token,
        },
      },
    },
    include: {
      recipients: {
        where: {
          token,
        },
      },
    },
  });

  if (!envelope) {
    throw new AppError(AppErrorCode.NOT_FOUND, {
      message: 'Document not found',
    });
  }

  const [recipient] = envelope.recipients;

  if (!recipient) {
    throw new AppError(AppErrorCode.NOT_FOUND, {
      message: 'Recipient not found',
    });
  }

  if (!recipient.phoneNumber) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'Recipient is missing phone number for SMS verification',
    });
  }

  const code = await generateTwoFactorTokenFromPhone({
    envelopeId,
    phoneNumber: recipient.phoneNumber,
  });

  await sendSms({
    to: recipient.phoneNumber,
    body: `Your verification code for "${envelope.title}" is: ${code}. It expires in ${TWO_FACTOR_SMS_EXPIRATION_MINUTES} minutes.`,
  });

  await prisma.documentAuditLog.create({
    data: createDocumentAuditLogData({
      type: DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_ACCESS_AUTH_2FA_REQUESTED,
      envelopeId: envelope.id,
      data: {
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        recipientId: recipient.id,
      },
    }),
  });
};
