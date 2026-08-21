const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

exports.createOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in to create an order.");
  }

  const { items, address, paymentMethod, utr, selectedWeight } = data;
  if (!items || !items.length || !address || !paymentMethod) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required order fields.");
  }

  if (paymentMethod === "QR_CODE" && (!utr || utr.length < 12)) {
    throw new functions.https.HttpsError("invalid-argument", "Valid UTR is required for QR_CODE payment.");
  }

  try {
    let subtotal = 0;
    let totalWeight = 0;
    const stockUpdates = [];

    // 1. Fetch real prices & calculate totals
    const productsSnap = await db.collection("products").get();
    const priceMap = {};
    const weightMap = {};
    const stockMap = {};

    productsSnap.forEach(doc => {
      const d = doc.data();
      priceMap[doc.id] = d.price;
      weightMap[doc.id] = d.weight || 0;
      stockMap[doc.id] = d.stock !== undefined ? d.stock : null;
    });

    for (const item of items) {
      if (!priceMap[item.variantId]) {
        throw new functions.https.HttpsError("not-found", `Product ${item.variantId} not found.`);
      }

      // Check stock
      if (stockMap[item.variantId] !== null) {
        if (stockMap[item.variantId] < item.qty) {
          throw new functions.https.HttpsError("failed-precondition", `Insufficient stock for ${item.title}`);
        }
        stockUpdates.push({
          ref: db.collection("products").doc(item.variantId),
          newStock: stockMap[item.variantId] - item.qty
        });
      }

      subtotal += priceMap[item.variantId] * item.qty;
      totalWeight += (weightMap[item.variantId] || 0) * item.qty;
    }

    if (selectedWeight && selectedWeight !== totalWeight) {
        throw new functions.https.HttpsError("invalid-argument", "Weight mismatch detected.");
    }

    // Shipping logic (flat rate 100 per 5kg)
    const baseShipping = 100;
    const additionalWeight = Math.max(0, totalWeight - 5);
    const extraShipping = Math.ceil(additionalWeight / 5) * 100;
    let shipping = baseShipping + extraShipping;
    if (totalWeight === 0) shipping = 0; // fallback if no weight

    const total = subtotal + shipping;

    // 2. Perform Transaction for Stock & Order
    const orderRef = db.collection("orders").doc();
    
    await db.runTransaction(async (t) => {
      // Create order
      t.set(orderRef, {
        uid: context.auth.uid,
        items,
        address,
        subtotal,
        shipping,
        total,
        paymentMethod,
        utr: utr || null,
        status: "Pending",
        createdAt: new Date().toISOString()
      });

      // Update stock
      for (const update of stockUpdates) {
        t.update(update.ref, { stock: update.newStock });
      }
    });

    return { success: true, orderId: orderRef.id };
  } catch (error) {
    console.error("Order creation failed:", error);
    throw new functions.https.HttpsError("internal", error.message || "Failed to create order");
  }
});

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'organicindia.missions@gmail.com',
    pass: functions.config().gmail?.pass || process.env.GMAIL_PASS // Needs to be configured in Firebase Config
  }
});

exports.sendOrderEmail = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data();
    const orderId = context.params.orderId.slice(-6).toUpperCase();

    // Fetch user email
    let userEmail = 'Customer';
    try {
      const userRecord = await admin.auth().getUser(order.uid);
      userEmail = userRecord.email || userRecord.displayName || 'Customer';
    } catch (e) {
      console.log('Could not fetch user info', e);
    }

    const mailOptions = {
      from: 'organicindia.missions@gmail.com',
      to: userEmail.includes('@') ? userEmail : 'organicindia.missions@gmail.com', // fallback to admin if no email
      bcc: 'organicindia.missions@gmail.com', // Admin notification
      subject: `Order Confirmation - KAD Multiplier #${orderId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #1a3c1a;">Order Confirmation</h2>
          <p>Hi ${userEmail.split('@')[0]},</p>
          <p>Thank you for your order! We have received your request.</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
            <h3>Order Summary (#${orderId})</h3>
            <p><strong>Total:</strong> ₹${order.total}</p>
            <p><strong>Payment:</strong> ${order.paymentMethod}</p>
            ${order.utr ? `<p><strong>UTR:</strong> ${order.utr}</p>` : ''}
          </div>
          <p style="margin-top: 20px;">We will process your order soon.</p>
          <p style="color: #666; font-size: 0.9em;">- KAD Multiplier Team</p>
        </div>
      `
    };

    try {
      if (mailOptions.auth?.pass) {
        await transporter.sendMail(mailOptions);
        console.log('Order email sent successfully');
      } else {
        console.log('Skipping email send: Gmail password not configured.');
      }
    } catch (error) {
      console.error('Error sending email:', error);
    }
  });
