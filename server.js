require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const secretsRouter = require('./src/routes/secrets');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/credential-vault')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const { initScheduler } = require('./src/services/scheduler');

let isUnsealed = false;
let globalMasterKey = null;

// Middleware to check if vault is unsealed
const checkUnsealed = (req, res, next) => {
    if (!isUnsealed && req.path !== '/unseal') {
        return res.status(503).json({ error: 'Vault is sealed. Please unseal with master key.' });
    }
    next();
};

app.use(checkUnsealed);

// Unseal endpoint
app.post('/unseal', (req, res) => {
    const { masterKey } = req.body;
    if (!masterKey || masterKey.length !== 64) {
        return res.status(400).json({ error: 'Valid 32-byte hex master key required' });
    }

    globalMasterKey = masterKey;
    isUnsealed = true;
    initScheduler(globalMasterKey);

    res.json({ message: 'Vault unsealed successfully' });
});

// Routes
app.use('/secrets', secretsRouter);

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Vault is currently SEALED.');
});
