const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect('mongodb+srv://atlas-sample-dataset-load-67f3a849a5f73d5e430fabe3:8z7aaXDtGn5KZT4P@meetz.wrdokza.mongodb.net/?retryWrites=true&w=majority&appName=meetz', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const User = mongoose.model('User', userSchema);

// Pin Schema
const pinSchema = new mongoose.Schema({
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 },
  title: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  creatorEmail: { type: String, required: true },
  votes: [{ email: { type: String, required: true }, vote: { type: Boolean, required: true } }],
  createdAt: { type: Date, default: Date.now },
});
const Pin = mongoose.model('Pin', pinSchema);

// Nodemailer transporter (Hardcoded Credentials)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'rahman90143@gmail.com',
    pass: 'gmvi iqed whxw jdfu'
  }
});

// Email endpoint
app.post('/api/send-email', async (req, res) => {
  const { name, email, message } = req.body;

  const mailOptions = {
    from: 'your-email@gmail.com',
    to: 'rahman90143@gmail.com',
    subject: `New Contact Form Submission from ${name}`,
    text: `
      Name: ${name}
      Email: ${email}
      Message: ${message}
    `,
    html: `
      <h3>New Contact Form Submission</h3>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong> ${message}</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Error sending email' });
  }
});

// Signup Route
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }
    const user = new User({ name, email, password });
    await user.save();
    res.status(201).json({ message: 'User created successfully', email });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login Route
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    res.status(200).json({ message: 'Login successful', email });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create Pin Route
app.post('/api/pins', async (req, res) => {
  const { latitude, longitude, title, creatorEmail } = req.body;
  try {
    if (!latitude || !longitude || !title || !creatorEmail) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const pin = new Pin({ latitude, longitude, title, creatorEmail, votes: [] });
    await pin.save();
    res.status(201).json(pin);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get All Pins Route
app.get('/api/pins', async (req, res) => {
  try {
    const pins = await Pin.find();
    res.status(200).json(pins);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Vote on Pin Route
app.post('/api/pins/:id/vote', async (req, res) => {
  const { id } = req.params;
  const { email, vote } = req.body;
  try {
    if (!email || typeof vote !== 'boolean') {
      return res.status(400).json({ message: 'Email and vote (boolean) are required' });
    }
    const pin = await Pin.findById(id);
    if (!pin) {
      return res.status(404).json({ message: 'Pin not found' });
    }
    if (pin.creatorEmail === email) {
      return res.status(403).json({ message: 'You cannot vote on your own pin' });
    }
    const existingVoteIndex = pin.votes.findIndex((v) => v.email === email);
    if (existingVoteIndex >= 0) {
      pin.votes[existingVoteIndex].vote = vote; // Update existing vote
    } else {
      pin.votes.push({ email, vote }); // Add new vote
    }
    await pin.save();
    res.status(200).json(pin);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
