const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const db = require('../config/db');

const router = express.Router();

router.get('/recent', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT id, name, class, gender, fee_status, avatar_initials, enrolled_date
       FROM students
       ORDER BY enrolled_date DESC
       LIMIT 5`
    );

    return res.json({
      students: rows.map((s) => ({
        id: s.id,
        name: s.name,
        class: s.class,
        gender: s.gender,
        fee_status: s.fee_status,
        avatar_initials: s.avatar_initials,
        enrolled_date: s.enrolled_date,
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to load recent students', error: err.message });
  }
});

module.exports = router;

