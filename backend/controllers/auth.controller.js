const jwt = require('jsonwebtoken');
const db = require('../config/db');

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const results = await db.promise().query(
      'SELECT * FROM users WHERE email=? AND password=?',
      [email, password]
    );

    // Debug logging (safe to remove later)
    // eslint-disable-next-line no-console
    console.log('AUTH_LOGIN_QUERY', { email, password, results });

    if (!results || results.length === 0) {
      // eslint-disable-next-line no-console
      console.log('AUTH_LOGIN_NO_RESULTS');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = results[0];

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Login failed', error: err.message });
  }
};


module.exports = { login };


