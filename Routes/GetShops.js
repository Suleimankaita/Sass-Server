const express = require('express');
const route = express.Router();
const {GetShops,GetSingleShop} = require('../Controllers/GetShops');

route.route('/').get(GetShops);
route.route('/:id').get(GetSingleShop);

module.exports = route;
