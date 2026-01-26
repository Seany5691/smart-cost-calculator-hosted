# Calculator Total Costs Fixes Required

## Current Issues and Required Fixes

### Hardware & Installation Section
1. ✅ **Extension Count**: 7 - CORRECT
2. ✅ **Hardware Total**: R 8,652.00 - CORRECT
3. ❌ **Installation Base**: R 0.00 - INCORRECT
   - Should pull from scales config sliding scale based on extension count
   - Bands: 0-4, 5-8, 9-16, 17-32, 33+
4. ❌ **Extension Cost**: R 5,250.00 - INCORRECT
   - Should be: Cost per point (from scales config) × Extension Count
5. ✅ **Fuel Cost**: R 82.50 - CORRECT
6. ❌ **Total Installation**: R 5,332.50 - INCORRECT
   - Should be: Installation Base + Extension Cost + Fuel Cost

### Gross Profit Section
- Custom Gross Profit: R 10,000.00
- Works on sliding scale from scales config based on extension count
- Bands: 0-4, 5-8, 9-16, 17-32, 33+
- Can be manually overridden

### Finance & Settlement Section
1. ✅ **Settlement Amount**: R 40,000.00 - CORRECT (from Settlement step)
2. ❌ **Finance Fee**: R 0.00 - INCORRECT
   - Should pull from scales config sliding scale
   - Based on Total Payout amount (iterative calculation)
   - Bands: 0-20000, 20001-50000, 50001-100000, 100001+
3. ❌ **Total Payout**: INCORRECT
   - Should be: Hardware Total + Total Installation + Gross Profit + Settlement Amount + Finance Fee
4. ❌ **Finance Amount**: MUST BE EXACTLY THE SAME AS TOTAL PAYOUT

### Monthly Recurring Costs Section
1. ❌ **Hardware Rental**: INCORRECT
   - Should be: Total Payout × Factor
   - Factor selected by: term, escalation, and finance amount
2. ✅ **Connectivity**: R 24,694.00 - CORRECT
3. ✅ **Licensing**: R 12,345.00 - CORRECT
4. **Total MRC (Ex VAT)**: Hardware Rental + Connectivity + Licensing
5. **VAT (15%)**: Total MRC (Ex VAT) × 0.15
6. **Total MRC (Inc VAT)**: Total MRC (Ex VAT) + VAT

### Additional Requirements
- Display "Factor Used" under Hardware Rental showing the exact factor being used

## Calculation Flow (Correct Order)

1. Calculate Hardware Total (sum of hardware items)
2. Calculate Installation Base (from sliding scale based on extension count)
3. Calculate Extension Cost (cost_per_point × extension count)
4. Calculate Fuel Cost (cost_per_kilometer × distance)
5. Calculate Total Installation (Installation Base + Extension Cost + Fuel Cost)
6. Calculate Gross Profit (from sliding scale or custom value)
7. Calculate Settlement Amount (from settlement step)
8. Calculate Finance Fee (iterative):
   - Start with: Base = Hardware Total + Total Installation + Gross Profit + Settlement
   - Loop: Calculate finance fee based on (Base + previous finance fee)
   - Continue until finance fee stabilizes
9. Calculate Total Payout = Hardware Total + Total Installation + Gross Profit + Settlement + Finance Fee
10. Finance Amount = Total Payout (SAME VALUE)
11. Look up Factor (based on term, escalation, and Finance Amount)
12. Calculate Hardware Rental = Finance Amount × Factor
13. Calculate Total MRC = Hardware Rental + Connectivity + Licensing
14. Calculate VAT = Total MRC × 0.15
15. Calculate Total with VAT = Total MRC + VAT
