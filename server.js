const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const axios = require('axios');
const session = require('express-session');

dotenv.config();
const app = express();
const PORT = process.env.FRONEND_PORT;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'beldexSecretSessionKey',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 5 * 60 * 1000 } // 5 minutes session expiry
}));

// Middleware to protect dashboard
function isAuthenticated(req, res, next) {
  if (req.session && req.session.authenticated) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Serve login page
app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Handle login POST
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  let decodedPassword = '';
  try {
    decodedPassword = Buffer.from(password, 'base64').toString('utf-8');
  } catch (e) {
    return res.status(400).send('<h1>Bad Request</h1><p>Invalid password format.</p>');
  }

  if (
    username === process.env.LOGIN_USERNAME &&
    decodedPassword === process.env.LOGIN_PASSWORD
  ) {
    req.session.authenticated = true;
    req.session.cookie.expires = new Date(Date.now() + 5 * 60 * 1000); // extend session
    res.redirect('/dashboard');
  } else {
    res.status(401).send('<h1>Access Denied</h1><p>Invalid credentials.</p>');
  }
});


// Handle logout
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout failed:', err);
      res.status(500).send('Logout failed');
    } else {
      res.redirect('/login');
    }
  });
});

// Dashboard with tabs (protected)
app.get('/dashboard', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// Fetch account list
app.post('/list-accounts', isAuthenticated, async (req, res) => {
  try {
    const response = await axios.post(process.env.ADMIN_SERVER_ADDRESS+'/list_accounts', {
      auth: process.env.AUTH_KEY
    });
    res.json(response.data);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to list accounts' });
  }
});

// Add account
app.post('/add-account', isAuthenticated, async (req, res) => {
  const { address, key } = req.body;
  try {
    const response = await axios.post(process.env.ADMIN_SERVER_ADDRESS+'/add_account', {
      params: { address, key },
      auth: process.env.AUTH_KEY
    });
    res.json(response.data);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to add account' });
  }
});

// Rescan
app.post('/rescan', isAuthenticated, async (req, res) => {
  const { height, addresses } = req.body;
  try {
    const response = await axios.post(process.env.ADMIN_SERVER_ADDRESS+'/rescan', {
      params: {
        height,
        addresses
      },
      auth: process.env.AUTH_KEY
    });
    res.json(response.data);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to rescan addresses' });
  }
});

// Modify account status
app.post('/modify-account-status', isAuthenticated, async (req, res) => {
  const { status, addresses } = req.body;
  try {
    const response = await axios.post(process.env.ADMIN_SERVER_ADDRESS+'/modify_account_status', {
      params: {
        status,
        addresses
      },
      auth: process.env.AUTH_KEY
    });
    res.json(response.data);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to modify account status' });
  }
});

app.listen(PORT, () => {
  console.log(`Beldex Admin Server running at http://localhost:${PORT}`);
});
