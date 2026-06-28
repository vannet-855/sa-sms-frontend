const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const db = require('../config/db');

const router = express.Router();

router.get('/upcoming', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT id, name, class, date, status
       FROM exams
       ORDER BY date ASC
       LIMIT 5`
    );

    return res.json({
      exams: rows.map((e) => ({
        id: e.id,
        name: e.name,
        class: e.class,
        date: e.date,
        status: e.status,
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to load upcoming exams', error: err.message });
  }
});

module.exports = router;

