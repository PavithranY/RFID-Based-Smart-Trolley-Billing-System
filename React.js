import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [rfid, setRfid] = useState('');
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [invoice, setInvoice] = useState(null);

  const scanProduct = async () => {
    try {
      const res = await axios.post('http://localhost:5000/scan', { rfid_tag: rfid });
      setCart([...cart, { ...res.data, quantity: 1 }]);
      setRfid('');
    } catch (err) {
      alert(err.response.data.message);
    }
  };

  const generateInvoice = async () => {
    try {
      const items = cart.map(item => ({ product_id: item.id, quantity: item.quantity }));
      const res = await axios.post('http://localhost:5000/invoice', { customer_name: customerName, items });
      setInvoice(res.data);
      alert(`Invoice Created! Total: ₹${res.data.total}`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Smart Trolley Billing</h1>

      <input placeholder="RFID Tag" value={rfid} onChange={e => setRfid(e.target.value)} />
      <button onClick={scanProduct}>Scan Product</button>

      <h2>Cart</h2>
      <ul>
        {cart.map((item, idx) => <li key={idx}>{item.name} - ₹{item.price} x {item.quantity}</li>)}
      </ul>

      <input placeholder="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)} />
      <button onClick={generateInvoice}>Generate Invoice</button>

      {invoice && <p>Invoice ID: {invoice.invoice_id}, Total: ₹{invoice.total}</p>}
    </div>
  );
}

export default App;
