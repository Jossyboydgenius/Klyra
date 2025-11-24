import { Router, Request, Response } from 'express';
import express from 'express';
import crypto from 'crypto';
import { paystackService } from '../services/paystack.js';
import { transactionService } from '../services/database.js';
import { orderQueue } from '../services/pool/order-queue.js';

const router = Router();

router.post('/paystack', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const body = req.body.toString();
    const signature = req.headers['x-paystack-signature'] as string;

    if (!signature) {
      return res.status(400).json({
        error: 'No signature provided'
      });
    }

    const hash = crypto
      .createHmac('sha512', process.env.DEV_PAYSTACK_SECRET_KEY!)
      .update(body)
      .digest('hex');

    if (hash !== signature) {
      return res.status(400).json({
        error: 'Invalid signature'
      });
    }

    const event = JSON.parse(body);

    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data);
        break;
      case 'charge.failed':
        await handleChargeFailed(event.data);
        break;
      default:
        console.log(`Unhandled webhook event: ${event.event}`);
    }

    return res.json({ status: 'success' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({
      error: 'Webhook processing failed'
    });
  }
});

async function handleChargeSuccess(data: any) {
  try {
    const reference = data.reference;
    const transaction = await transactionService.getTransactionByReference(reference);

    if (transaction) {
      await transactionService.updateTransaction(transaction.id!, {
        payment_status: 'success',
        payment_method: data.channel
      });

      console.log(`Payment confirmed for transaction: ${transaction.id}`);
    }
  } catch (error) {
    console.error('Error handling charge success:', error);
  }
}

async function handleChargeFailed(data: any) {
  try {
    const reference = data.reference;
    const transaction = await transactionService.getTransactionByReference(reference);

    if (transaction) {
      await transactionService.updateTransaction(transaction.id!, {
        payment_status: 'failed',
        error_message: data.gateway_response || 'Payment failed'
      });

      console.log(`Payment failed for transaction: ${transaction.id}`);
    }
  } catch (error) {
    console.error('Error handling charge failure:', error);
  }
}

router.post('/', express.json(), async (req: Request, res: Response) => {
  try {
    const requestJson = req.body;
    const { header: encodedHeader, payload: encodedPayload } = requestJson;

    function decode(encoded: string) {
      return JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
    }

    const headerData = decode(encodedHeader);
    const event = decode(encodedPayload);

    const { fid, key } = headerData;

    const KEY_REGISTRY_ADDRESS = "0x00000000Fc1237824fb747aBDE0FF18990E59b7e";
    const { createPublicClient, http } = await import('viem');
    const { optimism } = await import('viem/chains');

    const KEY_REGISTRY_ABI = [
      {
        inputs: [
          { name: "fid", type: "uint256" },
          { name: "key", type: "bytes" },
        ],
        name: "keyDataOf",
        outputs: [
          {
            components: [
              { name: "state", type: "uint8" },
              { name: "keyType", type: "uint32" },
            ],
            name: "",
            type: "tuple",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
    ] as const;

    async function verifyFidOwnership(fid: number, appKey: `0x${string}`) {
      const client = createPublicClient({
        chain: optimism,
        transport: http(),
      });

      try {
        const result = await client.readContract({
          address: KEY_REGISTRY_ADDRESS,
          abi: KEY_REGISTRY_ABI,
          functionName: "keyDataOf",
          args: [BigInt(fid), appKey],
        });

        return result.state === 1 && result.keyType === 1;
      } catch (error) {
        console.error("Key Registry verification failed:", error);
        return false;
      }
    }

    const valid = await verifyFidOwnership(fid, key);

    if (!valid) {
      return res.status(401).json(
        { success: false, error: "Invalid FID ownership" }
      );
    }

    const appName = process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME;
    const { setUserNotificationDetails, deleteUserNotificationDetails } = await import('../services/notification.js');
    const { sendFrameNotification } = await import('../services/notification-client.js');

    switch (event.event) {
      case "frame_added":
        console.log(
          "frame_added",
          "event.notificationDetails",
          event.notificationDetails,
        );
        if (event.notificationDetails) {
          await setUserNotificationDetails(fid, event.notificationDetails);
          await sendFrameNotification({
            fid,
            title: `Welcome to ${appName}`,
            body: `Thank you for adding ${appName}`,
          });
        } else {
          await deleteUserNotificationDetails(fid);
        }
        break;
      case "frame_removed": {
        console.log("frame_removed");
        await deleteUserNotificationDetails(fid);
        break;
      }
      case "notifications_enabled": {
        console.log("notifications_enabled", event.notificationDetails);
        await setUserNotificationDetails(fid, event.notificationDetails);
        await sendFrameNotification({
          fid,
          title: `Welcome to ${appName}`,
          body: `Thank you for enabling notifications for ${appName}`,
        });
        break;
      }
      case "notifications_disabled": {
        console.log("notifications_disabled");
        await deleteUserNotificationDetails(fid);
        break;
      }
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({
      error: 'Webhook processing failed'
    });
  }
});

router.post('/paystack-liquidity', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const body = JSON.parse(req.body.toString());
    const signature = req.headers['x-paystack-signature'] as string;

    if (signature) {
      const isValid = verifyPaystackSignature(body, signature);
      if (!isValid) {
        return res.status(401).json({
          error: 'Invalid signature'
        });
      }
    }

    const event = body.event;
    const data = body.data;

    console.log('Paystack webhook event:', event);

    if (event === 'charge.success') {
      await handleSuccessfulPayment(data);
    }

    return res.json({ message: 'Webhook processed' });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({
      error: error.message || 'Webhook processing failed'
    });
  }
});

async function handleSuccessfulPayment(data: any) {
  const reference = data.reference;
  const amount = data.amount / 100;

  console.log(`Processing successful payment: ${reference}, Amount: ${amount}`);

  const order = await orderQueue.getOrderByReference(reference);

  if (!order) {
    console.log(`No order found for reference: ${reference}`);
    return;
  }

  if (order.status !== 'pending') {
    console.log(`Order ${order.id} is not pending: ${order.status}`);
    return;
  }

  await orderQueue.processOrder(order.id);
}

function verifyPaystackSignature(body: any, signature: string): boolean {
  const secretKey = process.env.DEV_PAYSTACK_SECRET_KEY || '';
  const hash = crypto
    .createHmac('sha512', secretKey)
    .update(JSON.stringify(body))
    .digest('hex');

  return hash === signature;
}

export default router;

