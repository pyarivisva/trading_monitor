import os
from dotenv import load_dotenv

import MetaTrader5 as mt5
import requests
import time
from datetime import datetime, timedelta

# KONFIGURASI
load_dotenv()
NODE_SERVER_URL = os.getenv("SERVER_URL")
if not NODE_SERVER_URL:
    print("❌ Error: SERVER_URL belum disetting di file .env")
    quit()

# Helper: Hitung profit bulanan
def get_monthly_profit(deals, year, month):
    monthly_deals = [d for d in deals if datetime.fromtimestamp(d.time).year == year 
                     and datetime.fromtimestamp(d.time).month == month 
                     and d.entry == mt5.DEAL_ENTRY_OUT]
    if not monthly_deals: return None
    return sum(d.profit for d in monthly_deals)

# Helper: Hitung statistik history
def hitung_statistik_history():
    from_date = datetime(2015, 1, 1)
    deals = mt5.history_deals_get(from_date, datetime.now())
    
    if deals is None or len(deals) == 0: return {}

    total_profit = 0.0
    total_deposit = 0.0
    total_withdrawal = 0.0
    
    pure_initial_deposit = 0.0
    first_deposit_found = False

    win_count = 0; trade_count = 0; algo_count = 0

    # Sort history biar urut waktu
    sorted_deals = sorted(list(deals), key=lambda x: x.time)

    for deal in sorted_deals:
        if deal.type == mt5.DEAL_TYPE_BALANCE:
            if deal.profit > 0: 
                total_deposit += deal.profit
                # Tangkap Deposit Pertama (Initial)
                if not first_deposit_found:
                    pure_initial_deposit = deal.profit
                    first_deposit_found = True
            else: 
                total_withdrawal += abs(deal.profit)
        
        elif deal.entry == mt5.DEAL_ENTRY_OUT:
            trade_count += 1
            total_profit += deal.profit
            if deal.profit > 0: win_count += 1
            if deal.magic > 0: algo_count += 1

    # Logic: Top Up = Total - Initial
    top_up_only = total_deposit - pure_initial_deposit
    if top_up_only < 0: top_up_only = 0

    # History 3 Bulan
    now = datetime.now()
    current_pointer = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    months_data = []
    
    for i in range(3):
        prev_month_end = current_pointer - timedelta(days=1)
        y, m = prev_month_end.year, prev_month_end.month
        months_data.append({
            "month": prev_month_end.strftime("%b"),
            "profit": get_monthly_profit(deals, y, m)
        })
        current_pointer = prev_month_end.replace(day=1)

    return {
        "total_deposit": total_deposit,       
        "pure_initial_deposit": pure_initial_deposit, 
        "top_up_only": top_up_only,           
        "total_withdrawal": total_withdrawal,
        "total_profit_history": total_profit,
        "win_rate": (win_count / trade_count * 100) if trade_count > 0 else 0,
        "loss_rate": ((trade_count - win_count) / trade_count * 100) if trade_count > 0 else 0,
        "algo_ratio": (algo_count / trade_count * 100) if trade_count > 0 else 0,
        "trade_activity": min(trade_count, 100),
        "monthly_history": months_data 
    }

# FUNGSI UTAMA
def main():
    if not mt5.initialize():
        print("❌ Gagal connect MT5")
        quit()
    
    print(f"✅ MT5 CONNECTED: {mt5.account_info().login}")
    print("🚀 Mode: NET DEPOSIT (Initial + TopUp - WD)")

    while True:
        info = mt5.account_info()
        if info is not None:
            stats = hitung_statistik_history()

            profit_total = stats.get('total_profit_history', 0)
            deposits_all = stats.get('total_deposit', 0)
            withdrawals = stats.get('total_withdrawal', 0)
            
            # Investment = (Initial + TopUp) - WD
            # Secara matematika sama dengan: Total Deposit - WD
            custom_investment = deposits_all - withdrawals
            
            # Safety: Kalau WD habis (Investment <= 0), pakai Balance sisa
            if custom_investment <= 0: custom_investment = info.balance

            # Hitung Growth
            growth = (profit_total / custom_investment * 100) if custom_investment > 0 else 0

            payload = {
                "id": info.login,
                "balance": info.balance,
                "equity": info.equity,
                "broker": info.company,
                "platform": "MT5",
                "floating": info.equity - info.balance,
                "growth": growth, 
                
                # DATA DISPLAY
                "initial_deposit": custom_investment, # Label Investment
                "pure_initial_deposit": stats.get('pure_initial_deposit', 0), # Label Initial
                "top_up_only": stats.get('top_up_only', 0), # Label Deposits (TopUp)
                "withdrawals": withdrawals,
                
                # DATA RAW
                "deposits": deposits_all, 
                "profit_total": profit_total,
                "win_rate": stats.get('win_rate', 0),
                "loss_rate": stats.get('loss_rate', 0),
                "algo_ratio": stats.get('algo_ratio', 0),
                "activity": stats.get('trade_activity', 0),
                "monthly_history": stats.get('monthly_history', [])
            }
            
            try:
                requests.post(NODE_SERVER_URL, json=payload)
                print(f"📡 Update {info.login}: Growth {growth:.2f}% | Inv: {custom_investment:.2f}")
            except Exception as e:
                print(f"⚠️ Gagal kirim data {info.login}:", e)
        
        # Update setiap 2 detik
        time.sleep(2)
    
    mt5.shutdown()

if __name__ == "__main__":
    main()