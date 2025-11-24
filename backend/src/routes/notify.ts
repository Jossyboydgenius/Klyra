import { Router, Request, Response } from 'express';
import { sendFrameNotification } from '../services/notification-client.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const { fid, notification } = body;

    const result = await sendFrameNotification({
      fid,
      title: notification.title,
      body: notification.body,
      notificationDetails: notification.notificationDetails,
    });

    if (result.state === "error") {
      return res.status(500).json({
        error: result.error
      });
    }

    return res.json({ success: true }, { status: 200 });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;

