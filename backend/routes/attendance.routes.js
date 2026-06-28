const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const db = require('../config/db');

const router = express.Router();

router.get('/today', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT class_name, percentage
       FROM attendance
       WHERE date = CURDATE()
       ORDER BY class_name ASC
       LIMIT 6`
    );

    return res.json({
      attendance: rows.map((r) => ({
        class_name: r.class_name,
        percentage: Number(r.percentage),
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to load today attendance', error: err.message });
  }
});

module.exports = router;

