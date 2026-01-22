//+------------------------------------------------------------------+
//|                                              bridge_monitor.mq4 |
//|                                      Revisi: NET DEPOSIT ONLY    |
//+------------------------------------------------------------------+
#property strict
#property show_inputs

input int UpdateInterval = 2000; // Interval Update (ms)

string url = "https://YOUR_DOMAIN.com/api/tick";
string headers = "Content-Type: application/json\r\n";

string GetMonthName(int m) {
   switch(m) {
      case 1: return "Jan"; case 2: return "Feb"; case 3: return "Mar";
      case 4: return "Apr"; case 5: return "May"; case 6: return "Jun";
      case 7: return "Jul"; case 8: return "Aug"; case 9: return "Sep";
      case 10: return "Oct"; case 11: return "Nov"; case 12: return "Dec";
   }
   return "";
}

void OnStart()
{
   Print(">>> MT4 MONITORING (MODE: NET DEPOSIT) STARTED <<<");

   while(!IsStopped()) 
   {
      datetime now = TimeCurrent();
      int m1 = TimeMonth(now)-1; int y1 = TimeYear(now); if(m1<1){m1=12;y1--;}
      int m2 = m1-1; int y2 = y1; if(m2<1){m2=12;y2--;}
      int m3 = m2-1; int y3 = y2; if(m3<1){m3=12;y3--;}
      
      double profit_m1=0, profit_m2=0, profit_m3=0;
      bool act_m1=false, act_m2=false, act_m3=false;
      double tot_depo=0, tot_wd=0, tot_prof=0, pure_init=0;
      datetime first_time = D'2099.12.31';
      int wins=0, losses=0, trades=0, algo=0;
      
      int histTotal = OrdersHistoryTotal();
      for(int i=0; i<histTotal; i++)
      {
         if(OrderSelect(i, SELECT_BY_POS, MODE_HISTORY))
         {
            if(OrderType() <= OP_SELL) // TRADES
            {
               trades++;
               double p = OrderProfit() + OrderSwap() + OrderCommission();
               tot_prof += p;
               
               if(p > 0) wins++; else losses++;
               if(OrderMagicNumber() > 0) algo++;
               
               int tm = TimeMonth(OrderCloseTime()); int ty = TimeYear(OrderCloseTime());
               if(tm==m1 && ty==y1) { profit_m1+=p; act_m1=true; }
               else if(tm==m2 && ty==y2) { profit_m2+=p; act_m2=true; }
               else if(tm==m3 && ty==y3) { profit_m3+=p; act_m3=true; }
            }
            else if(OrderType() == 6) // BALANCE
            {
               double amt = OrderProfit();
               if(amt > 0) {
                  tot_depo += amt;
                  // Cari deposit paling awal berdasarkan waktu
                  if(OrderOpenTime() < first_time) {
                     first_time = OrderOpenTime();
                     pure_init = amt;
                  }
               }
               else {
                  tot_wd += MathAbs(amt);
               }
            }
         }
      }

      // --- RUMUS BARU: NET DEPOSIT ---
      // Investment = Total Deposit - Withdraw
      double inv = tot_depo - tot_wd;
      
      // Safety: Jika user WD semua dana (inv <= 0), pakai Balance sisa agar tidak error pembagian nol
      if(inv <= 0) inv = AccountBalance();
      
      // Top Up Only (Total - Initial)
      double top_up = tot_depo - pure_init; 
      if(top_up < 0) top_up = 0;

      double growth = 0;
      if(inv > 0) growth = (tot_prof / inv) * 100.0;
      
      // JSON Data
      string jm = "[";
      jm += "{\"month\":\""+GetMonthName(m1)+"\",\"profit\":"+(act_m1?DoubleToString(profit_m1,2):"null")+"},";
      jm += "{\"month\":\""+GetMonthName(m2)+"\",\"profit\":"+(act_m2?DoubleToString(profit_m2,2):"null")+"},";
      jm += "{\"month\":\""+GetMonthName(m3)+"\",\"profit\":"+(act_m3?DoubleToString(profit_m3,2):"null")+"}]";

      string json = "{"
           "\"id\": " + IntegerToString(AccountNumber()) + ","
           "\"balance\": " + DoubleToString(AccountBalance(), 2) + ","
           "\"equity\": " + DoubleToString(AccountEquity(), 2) + ","
           "\"broker\": \"" + AccountCompany() + "\","
           "\"platform\": \"MT4\","
           "\"floating\": " + DoubleToString(AccountEquity() - AccountBalance(), 2) + ","
           "\"growth\": " + DoubleToString(growth, 2) + ","
           
           // DATA UTAMA SESUAI REQUEST BARU
           "\"initial_deposit\": " + DoubleToString(inv, 2) + ","  // Label Investment
           "\"pure_initial_deposit\": " + DoubleToString(pure_init, 2) + "," // Label Initial
           "\"top_up_only\": " + DoubleToString(top_up, 2) + "," // Label Deposits
           
           "\"withdrawals\": " + DoubleToString(tot_wd, 2) + ","
           "\"deposits\": " + DoubleToString(tot_depo, 2) + "," 
           "\"profit_total\": " + DoubleToString(tot_prof, 2) + ","
           "\"win_rate\": " + DoubleToString(wins*100.0/MathMax(1,trades), 1) + ","
           "\"loss_rate\": " + DoubleToString(losses*100.0/MathMax(1,trades), 1) + ","
           "\"algo_ratio\": " + DoubleToString(algo*100.0/MathMax(1,trades), 1) + ","
           "\"activity\": " + IntegerToString(MathMin(trades, 100)) + ","
           "\"monthly_history\": " + jm + 
      "}";

      char postBody[]; char resultBody[]; string resultHeaders;
      StringToCharArray(json, postBody, 0, StringLen(json));
      int res = WebRequest("POST", url, headers, 5000, postBody, resultBody, resultHeaders);
      
      if(res == 200) Print("✅ MT4 OK | Inv: " + DoubleToString(inv, 2));
      else Print("❌ Error: " + IntegerToString(res));
      
      Sleep(UpdateInterval);
   }
}