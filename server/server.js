const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Tempat penyimpanan data sementara
let latestData = {
    mt4: {},
    mt5: {}
};

app.post('/api/tick', (req, res) => {
    const data = req.body;
    
    // --- LOGIKA PEMISAH (SORTING) ---
    // Jika data membawa label "platform: MT5", masukkan ke kotak MT5
    if (data.platform === 'MT5') {
        latestData.mt5[data.id] = data;
        console.log(`🔵 Masuk data MT5 [${data.id}]`);
    } 
    // Jika tidak ada label (atau labelnya MT4), masukkan ke kotak MT4
    else {
        latestData.mt4[data.id] = data;
        console.log(`🟢 Masuk data MT4 [${data.id}]`);
    }
    
    res.send("Data diterima");
});

app.get('/api/dashboard', (req, res) => {
    res.json(latestData);
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Server jalan`);
});