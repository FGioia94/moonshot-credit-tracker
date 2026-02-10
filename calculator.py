import json

with open("assets_data.json", "w") as f:
    ASSET_DATA = json.read(f)

class Calculator():

    def __init__(self):
        self.asset_purchases = {}
        
    def add_asset_purchase(self, asset, amount):
        self.asset_purchases[asset] = amount

    def add_all_assets_purchase(self, amount):
        for asset in self.asset_purchases:
            self.asset_purchases[asset] += amount

    def calculate(self):
        for asset in self.asset_purchases:
            total_credits = 0
            for artist in ASSET_DATA[asset]:
                total_credits += ASSET_DATA[asset][artist]

            for artist in ASSET_DATA[asset]:
                percentage = (ASSET_DATA[asset][artist]/total_credits)*100

                
