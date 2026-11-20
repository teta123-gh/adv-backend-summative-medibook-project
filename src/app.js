const express = require('express');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error-handler');

const app = express();

app.use(express.json());
app.use('/', apiRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
