const express = require('express');
const { fetchUserById, updateUser } = require('../controller/User');



const router = express.Router();
//user is added in base path
router.get('/own',fetchUserById)
      .patch('/:id',updateUser);

exports.router = router;
