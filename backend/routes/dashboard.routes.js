const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const db = require('../config/db');

const router = express.Router();

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const [students] = await db.promise().query(
      'SELECT COUNT(*) AS totalStudents FROM students'
    );
    const [teachers] = await db.promise().query(
      'SELECT COUNT(*) AS totalTeachers FROM teachers'
    );
    const [classes] = await db.promise().query(
      'SELECT COUNT(*) AS totalClasses FROM classes'
    );
    const [subjects] = await db.promise().query(
      'SELECT COUNT(*) AS totalSubjects FROM subjects'
    );

    const [fees] = await db.promise().query(
      'SELECT COALESCE(SUM(amount),0) AS feesCollected FROM fees WHERE status="Paid"'
    );

    const [activeExams] = await db.promise().query(
      'SELECT COUNT(*) AS activeExams FROM exams WHERE status IN ("Active")'
    );

    const [reports] = await db.promise().query(
      'SELECT 318 AS reportsGenerated'
    );

    const [attendance] = await db.promise().query(
      'SELECT COALESCE(AVG(percentage),0) AS attendanceRate FROM attendance WHERE date = CURDATE()'
    );

    return res.json({
      totalStudents: students[0]?.totalStudents ?? 0,
      totalTeachers: teachers[0]?.totalTeachers ?? 0,
      totalClasses: classes[0]?.totalClasses ?? 0,
      totalSubjects: subjects[0]?.totalSubjects ?? 0,
      feesCollected: Number(fees[0]?.feesCollected ?? 0),
      activeExams: activeExams[0]?.activeExams ?? 0,
      reportsGenerated: reports[0]?.reportsGenerated ?? 0,
      attendanceRate: Number(attendance[0]?.attendanceRate ?? 0),
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to load dashboard stats', error: err.message });
  }
});

module.exports = router;

