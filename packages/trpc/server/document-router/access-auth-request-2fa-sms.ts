import { EnvelopeType } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { DateTime } from 'luxon';

import { TWO_FACTOR_SMS_EXPIRATION_MINUTES } from '@documenso/lib/server-only/2fa/sms/constants';
import { send2FATokenSms } from '@documenso/lib/server-only/2fa/sms/send-2fa-token-sms';
import { assertRateLimit } from '@documenso/lib/server-only/rate-limit/rate-limit-middleware';
import { request2FASmsRateLimit } from '@documenso/lib/server-only/rate-limit/rate-limits';
import { DocumentAuth } from '@documenso/lib/types/document-auth';
import { extractDocumentAuthMethods } from '@documenso/lib/utils/document-auth';
import { prisma } from '@documenso/prisma';

import { procedure } from '../trpc';
import {
  ZAccessAuthRequest2FASmsRequestSchema,
  ZAccessAuthRequest2FASmsResponseSchema,
} from './access-auth-request-2fa-sms.types';

export const accessAuthRequest2FASmsRoute = procedure
  .input(ZAccessAuthRequest2FASmsRequestSchema)
  .output(ZAccessAuthRequest2FASmsResponseSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const { token } = input;

      const rateLimitResult = await request2FASmsRateLimit.check({
        ip: ctx.metadata.requestMetadata.ipAddress ?? 'unknown',
        identifier: token,
      });

      assertRateLimit(rateLimitResult);

      const envelope = await prisma.envelope.findFirst({
        where: {
          type: EnvelopeType.DOCUMENT,
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
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document not found',
        });
      }

      const [recipient] = envelope.recipients;

      if (!recipient?.phoneNumber) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Recipient does not have a phone number configured for SMS verification',
        });
      }

      const { derivedRecipientAccessAuth } = extractDocumentAuthMethods({
        documentAuth: envelope.authOptions,
        recipientAuth: recipient.authOptions,
      });

      if (!derivedRecipientAccessAuth.includes(DocumentAuth.TWO_FACTOR_AUTH)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '2FA is not required for this document',
        });
      }

      const expiresAt = DateTime.now().plus({ minutes: TWO_FACTOR_SMS_EXPIRATION_MINUTES });

      await send2FATokenSms({
        token,
        envelopeId: envelope.id,
      });

      return {
        success: true,
        expiresAt: expiresAt.toJSDate(),
      };
    } catch (error) {
      console.error('Error sending access auth 2FA SMS:', error);

      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to send 2FA SMS',
      });
    }
  });
