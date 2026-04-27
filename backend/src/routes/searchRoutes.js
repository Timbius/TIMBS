const express = require('express');
const { searchGlobal } = require('../controllers/searchController');

const router = express.Router();

router.get('/', searchGlobal);

module.exports = router;
