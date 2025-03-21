const express = require('express');
const newsRoutes = require('./newsRoutes');
const gamesRoutes = require('./gamesRoutes');

const router = express.Router();

router.use('/news', newsRoutes);
router.use('/games', gamesRoutes);

module.exports = router;