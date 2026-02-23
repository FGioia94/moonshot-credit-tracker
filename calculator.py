import json

with open("assets_data.json", "r") as f:
    ASSET_DATA = json.load(f)

class Calculator():

    def __init__(self):
        self.asset_purchases = {}
        
    def add_asset_purchase(self, asset, amount, price_without_vat):
        price_without_vat *= 0.6 # removing the studio/marketing part
        if not asset in self.asset_purchases:
            self.asset_purchases[asset] = 0
        self.asset_purchases[asset] += (price_without_vat * amount)

    def calculate(self):
        for asset in self.asset_purchases:
            total_money = self.asset_purchases[asset]
            total_credits = 0
            for artist in ASSET_DATA[asset]:
                total_credits += ASSET_DATA[asset][artist]

            for artist in ASSET_DATA[asset]:
                percentage = (ASSET_DATA[asset][artist]/total_credits)
                revenue = total_money * percentage
                print(f"artist> {artist}, asset > {asset}, perc > {percentage}, revenue > {revenue}\n")
                
                
calc = Calculator()
calc.add_asset_purchase("Rhino", 3, 4000)
calc.calculate()