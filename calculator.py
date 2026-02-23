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

    def remove_asset_purchase(self, asset, amount, price_without_vat):
        if asset not in self.asset_purchases:
            return

        price_without_vat *= 0.6
        self.asset_purchases[asset] -= (price_without_vat * amount)
        if self.asset_purchases[asset] <= 0:
            del self.asset_purchases[asset]

    def calculate(self):
        results = {}
        for asset in self.asset_purchases:
            total_money = self.asset_purchases[asset]
            total_credits = 0
            for artist in ASSET_DATA[asset]:
                total_credits += ASSET_DATA[asset][artist]

            asset_results = {}
            for artist in ASSET_DATA[asset]:
                percentage = (ASSET_DATA[asset][artist]/total_credits)
                revenue = total_money * percentage
                asset_results[artist] = {
                    "percentage": percentage,
                    "revenue": revenue,
                }
            results[asset] = asset_results

        return results
                
                
if __name__ == "__main__":
    calc = Calculator()
    calc.add_asset_purchase("Rhino", 3, 4000)
    calculation = calc.calculate()
    for asset, artists_data in calculation.items():
        for artist, artist_data in artists_data.items():
            print(
                f"artist> {artist}, asset > {asset}, "
                f"perc > {artist_data['percentage']}, "
                f"revenue > {artist_data['revenue']}\n"
            )