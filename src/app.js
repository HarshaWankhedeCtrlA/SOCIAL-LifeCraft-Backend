const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
// const masterRoutes = require('./routes/');

const app = express();

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.json({ ok: true, msg: 'LifeCraft API' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
// app.use('/api/v1', masterRoutes);

module.exports = app;
