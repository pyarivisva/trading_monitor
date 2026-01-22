# Realtime Forex Monitoring Dashboard

A centralized realtime monitoring system for MetaTrader 4 (MT4) and MetaTrader 5 (MT5) trading accounts. This dashboard aggregates data from multiple trading terminals and visualizes performance metrics such as Equity, Growth, Drawdown, and Net Investment.

**Key Features:**
* **Multi-Platform Support:** Connects with MT4 (via MQL4 Script) and MT5 (via Python Bridge).
* **Net Deposit Logic:** Calculates growth based on `Investment = (Total Deposit - Withdrawals)`, providing a more accurate performance view.
* **Realtime Visualization:** Interactive Radar Charts and Equity Bars using React & Recharts.
* **Secure Architecture:** Decoupled backend/frontend with environment-based configuration.

---

## 📂 Project Structure

* **`/server`**: Node.js Express backend that acts as the data aggregator/API.
* **`/frontend`**: React.js (Vite) dashboard interface.
* **`/mt4_scripts`**: MQL4 scripts to push data from MT4 terminals.
* **`/mt5_bridge`**: Python scripts to fetch and push data from MT5 terminals.

---

## 🛠️ Prerequisites

Before running this project, ensure you have:
1.  **Node.js** (v16 or higher)
2.  **Python** (v3.11 recommended for MT5 stability)
3.  **MetaTrader 4 / 5 Terminal** (Installed and logged in)

---

## 🚀 Setup Instructions

### 1. Backend Setup
The server receives data from trading terminals and serves it to the frontend.

```bash
cd server
npm install
node server.js
```
Server runs on port 3000 by default.

---

### 2. Frontend Setup
The dashboard visualizes the data. You need to configure your account list and API URL.

1.  Install Dependencies
    ```bash
    cd frontend 
    npm install
    ```

2.  Configuration
* API URL: Create a .env file in the frontend folder.
    ```bash
    VITE_API_URL=http://localhost:3000/api/dashboard
    ```
* Account List: Duplicate src/accounts.example.js to src/accounts.js.
    ```bash
    // src/accounts.js
    export const DATA_MASTER = {
   "123456": { nama: "My Demo Account", broker: "Broker A" },
    // Add your Account IDs here
   };
   ```

2.  Run Dashboard
    ```bash
    npm run dev
    ```

---

### 3. MetaTrader 4 (MT4) Setup
Uses a script to push data via HTTP Request.

1. Copy mt4_scripts/BridgeMonitor.mq4 to your MT4 Data Folder (MQL4/Scripts).
2. Enable WebRequest:
* Go to Tools > Options > Expert Advisors.
* Check Allow WebRequest for listed URL.
* Add your server URL (e.g., http://localhost:3000 or your production domain).
3. Run: Drag the script onto any chart.

---

### 4. MetaTrader 5 (MT5) Setup
Uses a Python bridge to read terminal state.
1.  Install Python Libraries:
    ```bash
    pip install MetaTrader5 requests python-dotenv numpy==1.26.4
    ```
    (Note: Use numpy 1.26.4 to avoid compatibility issues with the MT5 library).

2.  Configuration
* Create a .env file in mt5_bridge/ folder:
    ```bash
    SERVER_URL=http://localhost:3000/api/tick
    ```
* Run bridge
    ```bash
    python bridge_mt5.py
   ```