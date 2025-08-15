import express from 'express';
import mysql from 'mysql2';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import Razorpay from 'razorpay';
import twilio from 'twilio';
import cors from 'cors';

dotenv.config();
const app = express();
app.use(bodyParser.json());
app.use(cors());

// MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});
db.connect(err => {
  if (err) throw err;
  console.log("✅ MySQL Connected");
});

// Simulate RFID Scan
app.post('/scan', (req, res) => {
  const { rfid_tag } = req.body;
  db.query('SELECT * FROM products WHERE rfid_tag = ?', [rfid_tag], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    if (result.length === 0) return res.status(404).json({ message: "Product not found" });
    res.json(result[0]);
  });
});

// Create Invoice
app.post('/invoice', (req, res) => {
  const { customer_name, items } = req.body;
  let total = 0;
  const productIds = items.map(i => i.product_id);

  db.query(`SELECT id, price FROM products WHERE id IN (?)`, [productIds], (err, products) => {
    if (err) return res.status(500).json({ error: err });

    items.forEach(item => {
      const prod = products.find(p => p.id === item.product_id);
      if (prod) total += prod.price * item.quantity;
    });

    db.query(`INSERT INTO invoices (customer_name, total_amount, timestamp) VALUES (?, ?, NOW())`,
      [customer_name, total],
      (err, result) => {
        if (err) return res.status(500).json({ error: err });
        const invoiceId = result.insertId;

        items.forEach(item => {
          db.query(`INSERT INTO invoice_items (invoice_id, product_id, quantity) VALUES (?, ?, ?)`,
            [invoiceId, item.product_id, item.quantity]);
        });

        res.json({ invoice_id: invoiceId, total });
      }
    );
  });
});

// Payment (UPI placeholder)
app.post('/payment', async (req, res) => {
  const { amount, currency = "INR" } = req.body;
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY,
      key_secret: process.env.RAZORPAY_SECRET
    });
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency,
      payment_capture: 1
    });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SMS Dispatch via Twilio
const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
app.post('/send-sms', (req, res) => {
  const { to, message } = req.body;
  twilioClient.messages
    .create({ body: message, from: process.env.TWILIO_PHONE, to })
    .then(msg => res.json({ success: true, sid: msg.sid }))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.listen(5000, () => console.log("🚀 Backend running on port 5000"));
