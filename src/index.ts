import express from 'express';
import bodyParser from 'body-parser';
import { Webhook } from 'svix';
import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Initialize Notion client
const notion = new Client({ auth: process.env.NOTION_SECRET });
const NOTION_DB_ID = process.env.NOTION_USERS_DB_ID;

app.use(bodyParser.raw({ type: '*/*' }));

app.post('/clerk-webhook', async (req, res) => {
  const payload = req.body.toString();
  const headers = req.headers;

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '');

  let evt: any;
  try {
    evt = wh.verify(payload, headers as Record<string, string>);
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return res.status(400).send('Invalid signature');
  }

  if (evt?.type === 'user.created') {
    const user = evt.data;

    try {
      await notion.pages.create({
        parent: { database_id: NOTION_DB_ID! },
        properties: {
          Name: {
            title: [
              {
                text: {
                  content: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
                },
              },
            ],
          },
          Email: {
            email: user.email_addresses?.[0]?.email_address || '',
          },
          Role: {
            select: {
              name: 'student',
            },
          },
          ClerkID: {
            rich_text: [
              {
                text: {
                  content: user.id,
                },
              },
            ],
          },
        },
      });

      console.log(`✅ Added user ${user.id} to Notion with role 'student'`);
    } catch (err) {
      console.error('❌ Error writing to Notion:', err);
    }
  }

  res.status(200).json({ success: true });
});

app.listen(port, () => {
  console.log(`🚀 Clerk webhook server running on port ${port}`);
});
