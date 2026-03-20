import { env } from '../../utils/env';

const BIRD_API_URL = 'https://api.bird.com';

const getBirdConfig = () => {
  const apiKey = env('BIRD_API_KEY');
  const workspaceId = env('BIRD_WORKSPACE_ID');
  const channelId = env('BIRD_CHANNEL_ID');

  if (!apiKey || !workspaceId || !channelId) {
    throw new Error('Missing Bird SMS configuration (BIRD_API_KEY, BIRD_WORKSPACE_ID, BIRD_CHANNEL_ID)');
  }

  return { apiKey, workspaceId, channelId };
};

export type SendSmsOptions = {
  to: string;
  body: string;
};

export const sendSms = async ({ to, body }: SendSmsOptions): Promise<void> => {
  const { apiKey, workspaceId, channelId } = getBirdConfig();

  const response = await fetch(
    `${BIRD_API_URL}/workspaces/${workspaceId}/channels/${channelId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `AccessKey ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receiver: {
          contacts: [
            {
              identifierValue: to,
            },
          ],
        },
        body: {
          type: 'text',
          text: {
            text: body,
          },
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Bird SMS API error (${response.status}): ${errorText}`);
  }
};
