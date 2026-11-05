// JOLOF TRADING catalogue — ported from the approved home page.
// Product photos are the client-supplied images (see /public/products). Prices are the
// sample / client price-list prices used on the home page. `price: null` = price on request.

export const U = (id, w = 640, h = 800) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=75`;
export const productImg = (p) => (p?.img ? (p.img.startsWith('/') || p.img.startsWith('http') ? p.img : `/products/${p.img}.webp`) : '/brand/logo.webp');

/* ---------------- Demo catalogue (placeholder products & sample prices) ---------------- */

/* JOLOF TRADING product range (product photos supplied by the client; prices are sample prices) */
export const BASE_PRODUCTS = [
  // Food — Spices & Seasonings
  { id:'s1', dept:'Food', cat:'Spices & Seasonings', name:'Jumbo Stock Cubes', size:'Box of 48 tablets · 480 g', price:6.99, img:'jumbo-48', tag:'Bulk', desc:'Jumbo stock cube tablets in a 48-piece display box — a staple seasoning for soups, sauces and rice dishes.' },
  { id:'s2', dept:'Food', cat:'Spices & Seasonings', name:'Jumbo Stock Cubes Jar (100 + 20)', size:'Jar of 120 cubes', price:12.99, img:'jumbo-jar', desc:'Jumbo stock cubes in a resealable jar with 20 extra cubes included.' },
  { id:'s3', dept:'Food', cat:'Spices & Seasonings', name:'Maggi Shrimp Cubes (Crevette)', size:'Display box', price:8.49, img:'maggi-crevette', desc:'Maggi shrimp-flavoured seasoning cubes in a retail display box.' },
  { id:'s4', dept:'Food', cat:'Spices & Seasonings', name:'Adja Seasoning', size:'Sachet', price:1.49, img:'adja', tag:'New', desc:'Adja all-purpose seasoning for everyday home cooking.' },
  { id:'s5', dept:'Food', cat:'Spices & Seasonings', name:'Maggi Arôme Seasoning Sauce', size:'Bottle', price:4.99, img:'maggi-arome', tag:'New', desc:'Maggi Arôme liquid seasoning — a few drops to deepen the flavour of soups, sauces and meat.' },
  { id:'s6', dept:'Food', cat:'Spices & Seasonings', name:'Zena Spicy Pepper Sauce (Piment Fort)', size:'370 g jar', price:5.99, img:'zena-pepper', desc:'Zena spicy pepper sauce from the brand\'s range of West African flavours.' },
  // Food — Millet & Grains
  { id:'g1', dept:'Food', cat:'Millet & Grains', name:'Saafia Arraw', size:'500 g', price:3.49, img:'saafia-arraw', desc:'Saafia arraw — traditional millet granules for porridges and desserts.' },
  { id:'g2', dept:'Food', cat:'Millet & Grains', name:'Saafia Thiacry', size:'500 g', price:3.49, img:'saafia-thiacry', desc:'Saafia thiacry — fine millet couscous, traditionally served with sweetened curd.' },
  { id:'g3', dept:'Food', cat:'Millet & Grains', name:'Saafia Couscous Lalo', size:'500 g', price:3.49, img:'saafia-lalo', tag:'New', desc:'Saafia millet couscous prepared with lalo.' },
  { id:'g4', dept:'Food', cat:'Millet & Grains', name:'Kayna Medium Couscous', size:'1 kg', price:2.99, img:'kayna-couscous', desc:'Kayna medium-grain couscous made from durum wheat semolina.' },
  // Food — Tea & Coffee
  { id:'c1', dept:'Food', cat:'Tea & Coffee', name:'Black Star Green Tea 41022', size:'25 g', price:1.99, img:'black-star-tea', desc:'Black Star Chinese green tea, grade 41022.' },
  { id:'c2', dept:'Food', cat:'Tea & Coffee', name:'Thé Vert de Chine', size:'25 g', price:1.99, img:'the-vert-chine', tag:'New', desc:'Chinese green tea — 100% natural, in a 25 g pack.' },
  { id:'c3', dept:'Food', cat:'Tea & Coffee', name:'Thé Koutam Green Tea 41022', size:'250 g', price:7.99, img:'the-koutam', desc:'Thé Koutam Chinese green tea, grade 41022, in a 250 g pack.' },
  { id:'c4', dept:'Food', cat:'Tea & Coffee', name:'Achoura Thé Vert', size:'25 g', price:1.99, img:'achoura', desc:'Achoura green tea — 100% natural.' },
  { id:'c5', dept:'Food', cat:'Tea & Coffee', name:'Café Touba Bakhdad', size:'400 g', price:7.49, img:'cafe-touba', desc:'Café Touba Bakhdad — coffee blend in the Senegalese Café Touba style.' },
  { id:'c6', dept:'Food', cat:'Tea & Coffee', name:'Nescafé Classic', size:'100 g tin', price:6.49, img:'nescafe', desc:'Nescafé Classic instant coffee in a 100 g tin.' },
  // Food — Drinks
  { id:'d1', dept:'Food', cat:'Drinks', name:'Vimto Sparkling', size:'Crate of 24 cans', price:18.99, img:'vimto', tag:'Bulk', desc:'Vimto sparkling fruit-flavoured drink, supplied by the crate of 24 cans.' },
  { id:'d2', dept:'Food', cat:'Drinks', name:'Sagiko Tamarind Drink', size:'Can', price:1.49, img:'sagiko', desc:'Sagiko tamarind drink in a can.' },
  { id:'d3', dept:'Food', cat:'Drinks', name:'3X Energy Drink', size:'Case of 24 cans', price:22.99, img:'3x-energy', tag:'Bulk', desc:'3X energy drink, supplied by the case of 24 cans.' },
  { id:'d4', dept:'Food', cat:'Drinks', name:'Ginger · Honey · Lemon Drink', size:'Crate of 24 cans', price:21.99, img:'ginger-honey-lemon', desc:'Ginger, honey and lemon drink, supplied by the crate of 24 cans.' },
  { id:'d5', dept:'Food', cat:'Drinks', name:'IRA Fruit Cocktail Juice', size:'Can', price:1.49, img:'ira', tag:'New', desc:'IRA natural fruit cocktail juice without added sugar.' },
  // Food — Pantry Essentials
  { id:'p1', dept:'Food', cat:'Pantry Essentials', name:'Peak Evaporated Milk', size:'Can', price:1.99, img:'peak-milk', desc:'Peak full cream evaporated milk for tea, coffee, cooking and baking.' },
  { id:'p2', dept:'Food', cat:'Pantry Essentials', name:'Dieg Bou Diar Double Tomato Concentrate', size:'800 g tin', price:4.49, img:'dieg-bou-diar', desc:'Dieg Bou Diar double tomato concentrate — 100% tomatoes, a base for stews and sauces.' },
  { id:'p3', dept:'Food', cat:'Pantry Essentials', name:'Jadida Margarine', size:'Tub', price:4.99, img:'jadida', desc:'Jadida margarine in a handled tub, for cooking, baking and spreading.' },
  { id:'p4', dept:'Food', cat:'Pantry Essentials', name:'Kadi Moutarde de Dijon', size:'Jar', price:3.99, img:'kadi', tag:'New', desc:'Kadi Dijon mustard in a glass jar.' },
  { id:'p5', dept:'Food', cat:'Pantry Essentials', name:'Zena Madd Fruit Preserves', size:'450 g jar', price:6.99, img:'zena-madd', desc:'Zena madd (Saba senegalensis) fruit preserves — a West African favourite.' },
  { id:'p6', dept:'Food', cat:'Pantry Essentials', name:'Le Vainqueur Sucre Vanilliné', size:'Box', price:3.49, img:'vanilla-sugar', tag:'New', desc:'Le Vainqueur vanilla sugar for baking and desserts.' },
  { id:'p7', dept:'Food', cat:'Pantry Essentials', name:'Flavouring Essences', size:'Assorted bottles', price:5.99, img:'essences', desc:'Flavouring essences — banana, vanilla, exotic fruits, strawberry and pineapple.' },
  // Cosmetics
  // Cosmetics — JOLOF Cosmetics Wholesale catalogue (names & sizes as printed; pricing on request)
  // Carotone & Bio Claire — client wholesale price list (USD)
  { id:'jc29', dept:'Cosmetics', cat:'Skin Care', name:'Carotone Cream', size:'300MLx36', pack:null, price:126.00, real:true, img:'carotone-cream300', desc:'Carotone Cream — wholesale case of 36 (300MLx36). Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc30', dept:'Cosmetics', cat:'Skin Care', name:'Carotone Cream', size:'135MLx96', pack:null, price:176.00, real:true, img:'carotone-cream135', desc:'Carotone Cream — wholesale case of 96 (135MLx96). Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc18', dept:'Cosmetics', cat:'Cosmetics', name:'Carotone Savon Éclair', size:'190GRSx48', pack:null, price:101.00, real:true, img:'carotone-soap', desc:'Carotone Savon Éclair — wholesale case of 48 (190GRSx48). Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc31', dept:'Cosmetics', cat:'Skin Care', name:'Carotone Tube Crème', size:'50GRSx100', pack:null, price:226.80, real:true, img:'carotone-tube', desc:'Carotone Tube Crème — wholesale case of 100 (50GRSx100). Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc32', dept:'Cosmetics', cat:'Skin Care', name:'Carotone B.S.C Cream', size:'30GRx108', pack:null, price:175.00, real:true, img:'carotone-bsc-cream', desc:'Carotone B.S.C Cream — wholesale case of 108 (30GRx108). Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc33', dept:'Cosmetics', cat:'Cosmetics', name:'Carotone Gel Douche', size:'700MLx24', pack:null, price:131.00, real:true, img:'carotone-geldouche', desc:'Carotone Gel Douche — wholesale case of 24 (700MLx24). Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc34', dept:'Cosmetics', cat:'Skin Care', name:'Carotone Huile', size:'65MLx216', pack:null, price:408.00, real:true, img:'carotone-huile', desc:'Carotone Huile — wholesale case of 216 (65MLx216). Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc35', dept:'Cosmetics', cat:'Skin Care', name:'Carotone B.S.C Trio Kit', size:'30MLx24', pack:null, price:141.00, real:true, img:'carotone-trio', desc:'Carotone B.S.C Trio Kit — wholesale case of 24 (30MLx24). Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc36', dept:'Cosmetics', cat:'Skin Care', name:'Carotone B.S.C Lotion', size:'50MLx96', pack:null, price:196.00, real:true, img:'carotone-bsc-lotion', desc:'Carotone B.S.C Lotion — wholesale case of 96 (50MLx96). Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc37', dept:'Cosmetics', cat:'Skin Care', name:'Carotone B.S.C Serum', size:'30MLx96', pack:null, price:181.00, real:true, img:'carotone-bsc-serum', desc:'Carotone B.S.C Serum — wholesale case of 96 (30MLx96). Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc38', dept:'Cosmetics', cat:'Skin Care', name:'Bio Claire Original Cream', size:'300MLx24', pack:null, price:100.80, real:true, img:'bioclaire-cream', desc:'Bio Claire Original Cream — wholesale case of 24 (300MLx24). Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc39', dept:'Cosmetics', cat:'Skin Care', name:'Bio Claire Lotion', size:'500MLx24', pack:null, price:113.40, real:true, img:'bioclaire-lotion', desc:'Bio Claire Lotion — wholesale case of 24 (500MLx24). Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc23', dept:'Cosmetics', cat:'Cosmetics', name:'Bio Claire Savon', size:'190GRSx48', pack:null, price:100.80, real:true, img:'bioclaire-soap', desc:'Bio Claire Savon — wholesale case of 48 (190GRSx48). Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc1', dept:'Cosmetics', cat:'Skin Care', name:'Lait Clear Therapy CT+ Carotte', size:'500MLx12', pack:null, price:88.00, real:true, img:'ct-carotte-lait', desc:'Lait Clear Therapy CT+ Carotte — wholesale case of 12 (500MLx12). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc2', dept:'Cosmetics', cat:'Skin Care', name:'Crème Paw Paw', size:'300MLx48', pack:null, price:164.00, real:true, img:'pawpaw-cream', desc:'Crème Paw Paw — wholesale case of 48 (300MLx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc3', dept:'Cosmetics', cat:'Skin Care', name:'Vaseline Cocoa Glow Lotion', size:'260 gr', pack:'36 Units', price:null, img:'vaseline-cocoa' },
  { id:'jc4', dept:'Cosmetics', cat:'Skin Care', name:'Nature Secret Argan Cream', size:'300 g', pack:'24 units', price:null, img:'ns-argan-cream' },
  { id:'jc5', dept:'Cosmetics', cat:'Skin Care', name:'Dhin Dhin Body Brightening Cream', size:'360 ml', pack:'72 units', price:null, img:'dhindhin-cream' },
  { id:'jc6', dept:'Cosmetics', cat:'Hair Care', name:'Chebe Hair Oil', size:'250ml', pack:'24 units', price:null, img:'chebe-oil' },
  { id:'jc7', dept:'Cosmetics', cat:'Hair Care', name:'Chebe Hair Mask', size:'450g', pack:'48 units', price:null, img:'chebe-mask' },
  { id:'jc8', dept:'Cosmetics', cat:'Hair Care', name:'Chebe Hair Cream Moringa', size:'200g', pack:'96 units', price:null, img:'chebe-moringa' },
  { id:'jc9', dept:'Cosmetics', cat:'Hair Care', name:'Amalico Batana Oil', size:'100 ml', pack:'24 units', price:null, img:'amalico-batana' },
  { id:'jc10', dept:'Cosmetics', cat:'Hair Care', name:'Star Batana Hair Shampoo', size:'500 ml', pack:'48 units', price:null, img:'star-batana-shampoo' },
  { id:'jc11', dept:'Cosmetics', cat:'Cosmetics', name:'African Black Soap', size:'250g', pack:'72 pcs', price:null, img:'african-black-soap' },
  { id:'jc12', dept:'Cosmetics', cat:'Cosmetics', name:'Dudu Osun Black Soap Classic/Fragrance', size:'150g', pack:'48 pcs', price:null, img:'dudu-osun' },
  { id:'jc13', dept:'Cosmetics', cat:'Cosmetics', name:'Nature Secret Soap Argan', size:'350 g', pack:'48 units', price:null, img:'ns-argan-soap' },
  { id:'jc14', dept:'Cosmetics', cat:'Cosmetics', name:'Vaseline Pomade', size:'368gr | 13 Oz', pack:'24 Units', price:null, img:'vaseline-pomade' },
  { id:'jc15', dept:'Cosmetics', cat:'Cosmetics', name:'Florida Water', size:'7.5 oz', pack:'12 units', price:null, img:'florida-water' },
  { id:'jc16', dept:'Cosmetics', cat:'Cosmetics', name:'Elite Oud Perfum', size:'100 ML', pack:'48 pcs', price:null, img:'elite-oud' },
  { id:'jc17', dept:'Cosmetics', cat:'Cosmetics', name:'Gel Douche Paw Paw', size:'500MLx24', pack:null, price:94.00, real:true, img:'pawpaw-geldouche', desc:'Gel Douche Paw Paw — wholesale case of 24 (500MLx24). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc19', dept:'Cosmetics', cat:'Cosmetics', name:'Vaseline Pink Lotion', size:'725 ML', pack:'12 Units', price:null, img:'vaseline-pink' },
  { id:'jc20', dept:'Cosmetics', cat:'Cosmetics', name:'VO5', size:'370ML', pack:null, price:null, img:'vo5' },
  { id:'jc21', dept:'Cosmetics', cat:'Cosmetics', name:'Scurl', size:'425 g', pack:'12 pcs', price:null, img:'scurl' },
  { id:'jc22', dept:'Cosmetics', cat:'Cosmetics', name:'White Gold Turmeric Soap', size:'135Gx192', pack:null, price:806.00, real:true, img:'whitegold-soap', desc:'White Gold Turmeric Soap — wholesale case of 192 (135Gx192). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc24', dept:'Cosmetics', cat:'Cosmetics', name:'Kojie San Soap', size:'250g', pack:'72pcs', price:null, img:'kojiesan-soap' },
  { id:'jc25', dept:'Cosmetics', cat:'Cosmetics', name:'Soap H20 Papaya', size:'200Gx72', pack:null, price:101.00, real:true, img:'h2o-papaya-soap', desc:'Soap H20 Papaya — wholesale case of 72 (200Gx72). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc26', dept:'Cosmetics', cat:'Cosmetics', name:'Colgate Cavity', size:'8 Oz', pack:'32 Units', price:null, img:'colgate-cavity' },
  { id:'jc27', dept:'Cosmetics', cat:'Cosmetics', name:'Zote Soap', size:'400 gr', pack:'25 Units', price:null, img:'zote-soap' },
  { id:'jc28', dept:'Cosmetics', cat:'Cosmetics', name:'Spray Dove', size:null, pack:'12 units', price:null, img:'spray-dove' },
  { id:'k1', dept:'Cosmetics', cat:'Skin Care', name:'Raw Shea Butter', size:'Bulk carton', price:89.00, img:'shea-butter', tag:'Bulk', desc:'Unrefined shea butter supplied in bulk cartons for cosmetic makers, salons and resellers. Request bulk pricing for larger volumes.' },
  { id:'k2', dept:'Cosmetics', cat:'Cosmetics', name:'La Paix Congnon-Mousso Yako', size:'Bottle', price:4.99, img:'la-paix', tag:'New', desc:'La Paix Congnon-Mousso Yako personal care product.' },
  // Cosmetics — JOLOF Trade Center cosmetics price list (USD per case, sold by the case only)
  // White Secret
  { id:'jc40', dept:'Cosmetics', cat:'Skin Care', name:'Lait White Secret', size:'500MLx24', pack:null, price:126.00, real:true, img:'lait-white-secret-500mlx24', desc:'Lait White Secret — wholesale case of 24 (500MLx24). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc41', dept:'Cosmetics', cat:'Skin Care', name:'Cream White Secret', size:'320MLx36', pack:null, price:131.00, real:true, img:'cream-white-secret-320mlx36', desc:'Cream White Secret — wholesale case of 36 (320MLx36). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc42', dept:'Cosmetics', cat:'Cosmetics', name:'Savon White Secret', size:'190Gx48', pack:null, price:101.00, real:true, desc:'Savon White Secret — wholesale case of 48 (190Gx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc43', dept:'Cosmetics', cat:'Cosmetics', name:'Savon White Secret Exfoliant', size:'190Gx48', pack:null, price:101.00, real:true, desc:'Savon White Secret Exfoliant — wholesale case of 48 (190Gx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc44', dept:'Cosmetics', cat:'Skin Care', name:'Tube White Secret', size:'70Gx72', pack:null, price:189.00, real:true, desc:'Tube White Secret — wholesale case of 72 (70Gx72). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc45', dept:'Cosmetics', cat:'Skin Care', name:'Serum White Secret', size:'30MLx72', pack:null, price:189.00, real:true, desc:'Serum White Secret — wholesale case of 72 (30MLx72). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc46', dept:'Cosmetics', cat:'Skin Care', name:'DSR White Secret', size:'30MLx72', pack:null, price:126.00, real:true, img:'dsr-white-secret-30mlx72', desc:'DSR White Secret — wholesale case of 72 (30MLx72). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc47', dept:'Cosmetics', cat:'Cosmetics', name:'Gel Douche White Secret', size:'1000MLx12', pack:null, price:63.00, real:true, desc:'Gel Douche White Secret — wholesale case of 12 (1000MLx12). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc48', dept:'Cosmetics', cat:'Cosmetics', name:'Gel Douche White Secret Exfoliant', size:'500MLx24', pack:null, price:63.00, real:true, desc:'Gel Douche White Secret Exfoliant — wholesale case of 24 (500MLx24). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  // Carowhite
  { id:'jc49', dept:'Cosmetics', cat:'Skin Care', name:'Crème Corporelle Carowhite', size:'500MLx32', pack:null, price:126.00, real:true, img:'creme-corporelle-carowhite-500mlx32', desc:'Crème Corporelle Carowhite — wholesale case of 32 (500MLx32). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc50', dept:'Cosmetics', cat:'Skin Care', name:'Crème Corporelle Carowhite', size:'300MLx48', pack:null, price:150.00, real:true, img:'creme-corporelle-carowhite-300mlx48', desc:'Crème Corporelle Carowhite — wholesale case of 48 (300MLx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc51', dept:'Cosmetics', cat:'Cosmetics', name:'Gel Douche Carowhite', size:'1Lx12', pack:null, price:69.00, real:true, img:'gel-douche-carowhite-1lx12', desc:'Gel Douche Carowhite — wholesale case of 12 (1Lx12). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc52', dept:'Cosmetics', cat:'Skin Care', name:'Crème Carowhite', size:'120MLx72', pack:null, price:170.00, real:true, img:'creme-carowhite-120mlx72', desc:'Crème Carowhite — wholesale case of 72 (120MLx72). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc53', dept:'Cosmetics', cat:'Skin Care', name:'Lait Corporel Carowhite', size:'500MLx24', pack:null, price:101.00, real:true, img:'lait-corporel-carowhite-500mlx24', desc:'Lait Corporel Carowhite — wholesale case of 24 (500MLx24). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc54', dept:'Cosmetics', cat:'Skin Care', name:'Huile Carowhite', size:'50MLx144', pack:null, price:250.00, real:true, desc:'Huile Carowhite — wholesale case of 144 (50MLx144). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc55', dept:'Cosmetics', cat:'Skin Care', name:'Tube Carowhite', size:'30MLx144', pack:null, price:227.00, real:true, desc:'Tube Carowhite — wholesale case of 144 (30MLx144). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc56', dept:'Cosmetics', cat:'Cosmetics', name:'Carowhite Soap', size:'180Gx72', pack:null, price:114.00, real:true, desc:'Carowhite Soap — wholesale case of 72 (180Gx72). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc57', dept:'Cosmetics', cat:'Cosmetics', name:'Carowhite Soap', size:'100Gx96', pack:null, price:105.00, real:true, desc:'Carowhite Soap — wholesale case of 96 (100Gx96). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  // African SheaButter
  { id:'jc58', dept:'Cosmetics', cat:'Skin Care', name:'African SheaButter Yellow', size:'Case', pack:null, price:73.00, real:true, img:'african-sheabutter-yellow-case', desc:'African SheaButter Yellow — wholesale case (Case). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc59', dept:'Cosmetics', cat:'Skin Care', name:'African SheaButter White', size:'Case', pack:null, price:73.00, real:true, img:'african-sheabutter-white-case', desc:'African SheaButter White — wholesale case (Case). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  // Clairmen
  { id:'jc60', dept:'Cosmetics', cat:'Skin Care', name:'Clairmen Cream', size:'500MLx32', pack:null, price:126.00, real:true, img:'clairmen-cream-500mlx32', desc:'Clairmen Cream — wholesale case of 32 (500MLx32). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc61', dept:'Cosmetics', cat:'Cosmetics', name:'Clairmen Soap', size:'180Gx72', pack:null, price:114.00, real:true, desc:'Clairmen Soap — wholesale case of 72 (180Gx72). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  // Clear Therapy CT+
  { id:'jc62', dept:'Cosmetics', cat:'Skin Care', name:'Lait Clear Therapy CT+', size:'500MLx12', pack:null, price:88.00, real:true, img:'lait-clear-therapy-ct-500mlx12', desc:'Lait Clear Therapy CT+ — wholesale case of 12 (500MLx12). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc63', dept:'Cosmetics', cat:'Skin Care', name:'Lait Clear Therapy CT+ Carotte', size:'250MLx24', pack:null, price:88.00, real:true, img:'lait-clear-therapy-ct-carotte-250mlx24', desc:'Lait Clear Therapy CT+ Carotte — wholesale case of 24 (250MLx24). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc64', dept:'Cosmetics', cat:'Skin Care', name:'Lait Clear Therapy CT+', size:'250MLx24', pack:null, price:88.00, real:true, img:'lait-clear-therapy-ct-250mlx24', desc:'Lait Clear Therapy CT+ — wholesale case of 24 (250MLx24). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc65', dept:'Cosmetics', cat:'Skin Care', name:'Serum Clear Therapy CT+ Carotte', size:'75MLx48', pack:null, price:164.00, real:true, img:'serum-clear-therapy-ct-carotte-75mlx48', desc:'Serum Clear Therapy CT+ Carotte — wholesale case of 48 (75MLx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc66', dept:'Cosmetics', cat:'Skin Care', name:'Serum Clear Therapy CT+', size:'75MLx48', pack:null, price:164.00, real:true, desc:'Serum Clear Therapy CT+ — wholesale case of 48 (75MLx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc67', dept:'Cosmetics', cat:'Skin Care', name:'Crème Clear Therapy CT+ Carotte', size:'200MLx24', pack:null, price:82.00, real:true, img:'creme-clear-therapy-ct-carotte-200mlx24', desc:'Crème Clear Therapy CT+ Carotte — wholesale case of 24 (200MLx24). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc68', dept:'Cosmetics', cat:'Skin Care', name:'Crème Clear Therapy CT+', size:'200MLx24', pack:null, price:82.00, real:true, img:'creme-clear-therapy-ct-200mlx24', desc:'Crème Clear Therapy CT+ — wholesale case of 24 (200MLx24). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc69', dept:'Cosmetics', cat:'Skin Care', name:'Crème Clear Therapy CT+ Carotte', size:'400MLx12', pack:null, price:82.00, real:true, img:'creme-clear-therapy-ct-carotte-400mlx12', desc:'Crème Clear Therapy CT+ Carotte — wholesale case of 12 (400MLx12). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc70', dept:'Cosmetics', cat:'Skin Care', name:'Crème Clear Therapy CT+', size:'400MLx12', pack:null, price:82.00, real:true, img:'creme-clear-therapy-ct-400mlx12', desc:'Crème Clear Therapy CT+ — wholesale case of 12 (400MLx12). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc71', dept:'Cosmetics', cat:'Cosmetics', name:'Gel Douche Clear Therapy Carotte', size:'1000ML', pack:null, price:63.00, real:true, desc:'Gel Douche Clear Therapy Carotte — wholesale case (1000ML). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc72', dept:'Cosmetics', cat:'Cosmetics', name:'Gel Douche Clear Therapy', size:'1000ML', pack:null, price:63.00, real:true, desc:'Gel Douche Clear Therapy — wholesale case (1000ML). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc73', dept:'Cosmetics', cat:'Cosmetics', name:'CT+ Soap Carrot', size:'175Gx48', pack:null, price:88.00, real:true, img:'ct-soap-carrot-175gx48', desc:'CT+ Soap Carrot — wholesale case of 48 (175Gx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc74', dept:'Cosmetics', cat:'Cosmetics', name:'CT+ Soap', size:'175Gx48', pack:null, price:88.00, real:true, img:'ct-soap-175gx48', desc:'CT+ Soap — wholesale case of 48 (175Gx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  // Paw Paw
  { id:'jc75', dept:'Cosmetics', cat:'Skin Care', name:'Lait Paw Paw', size:'500MLx24', pack:null, price:101.00, real:true, img:'lait-paw-paw-500mlx24', desc:'Lait Paw Paw — wholesale case of 24 (500MLx24). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc76', dept:'Cosmetics', cat:'Skin Care', name:'Lait Paw Paw', size:'300MLx36', pack:null, price:114.00, real:true, img:'lait-paw-paw-300mlx36', desc:'Lait Paw Paw — wholesale case of 36 (300MLx36). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc77', dept:'Cosmetics', cat:'Skin Care', name:'DSR Paw Paw', size:'25MLx144 (12 packs)', pack:null, price:303.00, real:true, desc:'DSR Paw Paw — wholesale case of 144 (25MLx144 (12 packs)). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc78', dept:'Cosmetics', cat:'Skin Care', name:'Huile Paw Paw', size:'60MLx96', pack:null, price:150.00, real:true, img:'huile-paw-paw-60mlx96', desc:'Huile Paw Paw — wholesale case of 96 (60MLx96). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc79', dept:'Cosmetics', cat:'Skin Care', name:'Paw Paw Tube', size:'50Gx100', pack:null, price:183.00, real:true, desc:'Paw Paw Tube — wholesale case of 100 (50Gx100). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc80', dept:'Cosmetics', cat:'Skin Care', name:'Paw Paw Booster', size:'7MLx240', pack:null, price:164.00, real:true, desc:'Paw Paw Booster — wholesale case of 240 (7MLx240). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc81', dept:'Cosmetics', cat:'Cosmetics', name:'Paw Paw Soap', size:'180Gx60', pack:null, price:114.00, real:true, img:'paw-paw-soap-180gx60', desc:'Paw Paw Soap — wholesale case of 60 (180Gx60). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  // Yellow Tone
  { id:'jc82', dept:'Cosmetics', cat:'Skin Care', name:'Crème Yellow Tone', size:'450MLx24', pack:null, price:99.00, real:true, desc:'Crème Yellow Tone — wholesale case of 24 (450MLx24). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc83', dept:'Cosmetics', cat:'Cosmetics', name:'Savon Yellow Tone', size:'200Gx48', pack:null, price:84.00, real:true, desc:'Savon Yellow Tone — wholesale case of 48 (200Gx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc84', dept:'Cosmetics', cat:'Skin Care', name:'Serum Yellow Tone', size:'30MLx48', pack:null, price:94.00, real:true, desc:'Serum Yellow Tone — wholesale case of 48 (30MLx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc85', dept:'Cosmetics', cat:'Skin Care', name:'Lotion Yellow Tone', size:'400MLx24', pack:null, price:99.00, real:true, desc:'Lotion Yellow Tone — wholesale case of 24 (400MLx24). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  // Clinic Clear
  { id:'jc86', dept:'Cosmetics', cat:'Skin Care', name:'Lait Clinic Clear', size:'500MLx24', pack:null, price:150.00, real:true, img:'lait-clinic-clear-500mlx24', desc:'Lait Clinic Clear — wholesale case of 24 (500MLx24). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc87', dept:'Cosmetics', cat:'Skin Care', name:'Lait Clinic Clear', size:'250MLx36', pack:null, price:114.00, real:true, img:'lait-clinic-clear-250mlx36', desc:'Lait Clinic Clear — wholesale case of 36 (250MLx36). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc88', dept:'Cosmetics', cat:'Skin Care', name:'Crème Clinic Clear', size:'150Gx48', pack:null, price:94.00, real:true, desc:'Crème Clinic Clear — wholesale case of 48 (150Gx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc89', dept:'Cosmetics', cat:'Skin Care', name:'Crème Clinic Clear', size:'330Gx24', pack:null, price:105.00, real:true, desc:'Crème Clinic Clear — wholesale case of 24 (330Gx24). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc90', dept:'Cosmetics', cat:'Cosmetics', name:'Gel Douche Clinic Chocol', size:'750MLx24', pack:null, price:126.00, real:true, desc:'Gel Douche Clinic Chocol — wholesale case of 24 (750MLx24). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc91', dept:'Cosmetics', cat:'Cosmetics', name:'Gel Douche Clinic Clear', size:'750MLx24', pack:null, price:126.00, real:true, desc:'Gel Douche Clinic Clear — wholesale case of 24 (750MLx24). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc92', dept:'Cosmetics', cat:'Cosmetics', name:'Savon Clinic Clear', size:'225Gx72', pack:null, price:150.00, real:true, img:'savon-clinic-clear-225gx72', desc:'Savon Clinic Clear — wholesale case of 72 (225Gx72). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc93', dept:'Cosmetics', cat:'Skin Care', name:'Serum Clinic Clear', size:'50MLx120', pack:null, price:262.00, real:true, desc:'Serum Clinic Clear — wholesale case of 120 (50MLx120). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc94', dept:'Cosmetics', cat:'Skin Care', name:'Lotion Clinic Clear', size:'125MLx72', pack:null, price:262.00, real:true, desc:'Lotion Clinic Clear — wholesale case of 72 (125MLx72). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc95', dept:'Cosmetics', cat:'Skin Care', name:'Crème DSR Clinic', size:'50MLx120', pack:null, price:262.00, real:true, desc:'Crème DSR Clinic — wholesale case of 120 (50MLx120). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc96', dept:'Cosmetics', cat:'Cosmetics', name:'Savon GLY Clinic Clear', size:'180Gx72', pack:null, price:133.00, real:true, desc:'Savon GLY Clinic Clear — wholesale case of 72 (180Gx72). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc97', dept:'Cosmetics', cat:'Skin Care', name:'Tube Clinic Clear', size:'50Gx120', pack:null, price:168.00, real:true, desc:'Tube Clinic Clear — wholesale case of 120 (50Gx120). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  // White Gold
  { id:'jc98', dept:'Cosmetics', cat:'Skin Care', name:'White Gold Carrot Oil', size:'500MLx48', pack:null, price:352.00, real:true, desc:'White Gold Carrot Oil — wholesale case of 48 (500MLx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc99', dept:'Cosmetics', cat:'Skin Care', name:'White Gold Carrot Cleanser', size:'125MLx96', pack:null, price:503.00, real:true, desc:'White Gold Carrot Cleanser — wholesale case of 96 (125MLx96). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc100', dept:'Cosmetics', cat:'Skin Care', name:'White Gold Carrot Scrub', size:'521MLx48', pack:null, price:352.00, real:true, desc:'White Gold Carrot Scrub — wholesale case of 48 (521MLx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc101', dept:'Cosmetics', cat:'Skin Care', name:'White Gold Carrot Lotion', size:'500MLx48', pack:null, price:352.00, real:true, desc:'White Gold Carrot Lotion — wholesale case of 48 (500MLx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc102', dept:'Cosmetics', cat:'Skin Care', name:'White Gold Carrot Cream', size:'360Gx96', pack:null, price:705.00, real:true, desc:'White Gold Carrot Cream — wholesale case of 96 (360Gx96). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc103', dept:'Cosmetics', cat:'Cosmetics', name:'White Gold Carrot Soap', size:'135Gx192', pack:null, price:804.00, real:true, desc:'White Gold Carrot Soap — wholesale case of 192 (135Gx192). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc104', dept:'Cosmetics', cat:'Skin Care', name:'White Gold Carrot Serum', size:'Case', pack:null, price:733.00, real:true, desc:'White Gold Carrot Serum — wholesale case (Case). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc105', dept:'Cosmetics', cat:'Skin Care', name:'White Gold Turmeric Scrub', size:'521MLx48', pack:null, price:352.00, real:true, desc:'White Gold Turmeric Scrub — wholesale case of 48 (521MLx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc106', dept:'Cosmetics', cat:'Skin Care', name:'White Gold Turmeric Cleanser', size:'125MLx96', pack:null, price:503.00, real:true, desc:'White Gold Turmeric Cleanser — wholesale case of 96 (125MLx96). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc107', dept:'Cosmetics', cat:'Skin Care', name:'White Gold Turmeric Lotion', size:'500MLx48', pack:null, price:352.00, real:true, desc:'White Gold Turmeric Lotion — wholesale case of 48 (500MLx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc108', dept:'Cosmetics', cat:'Skin Care', name:'White Gold Turmeric Oil', size:'500MLx48', pack:null, price:352.00, real:true, desc:'White Gold Turmeric Oil — wholesale case of 48 (500MLx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc109', dept:'Cosmetics', cat:'Skin Care', name:'White Gold Turmeric Cream', size:'360Gx96', pack:null, price:705.00, real:true, desc:'White Gold Turmeric Cream — wholesale case of 96 (360Gx96). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc110', dept:'Cosmetics', cat:'Skin Care', name:'White Gold Turmeric Serum', size:'Case', pack:null, price:733.00, real:true, desc:'White Gold Turmeric Serum — wholesale case (Case). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  // Amalico Batana
  { id:'jc111', dept:'Cosmetics', cat:'Hair Care', name:'Amalico Batana Oil Hair Mask', size:'360Gx72', pack:null, price:604.00, real:true, desc:'Amalico Batana Oil Hair Mask — wholesale case of 72 (360Gx72). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc112', dept:'Cosmetics', cat:'Hair Care', name:'Amalico Batana Oil Hair Cream', size:'360Gx72', pack:null, price:604.00, real:true, desc:'Amalico Batana Oil Hair Cream — wholesale case of 72 (360Gx72). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc113', dept:'Cosmetics', cat:'Hair Care', name:'Amalico Batana Oil Hair Serum', size:'100MLx48', pack:null, price:452.00, real:true, desc:'Amalico Batana Oil Hair Serum — wholesale case of 48 (100MLx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc114', dept:'Cosmetics', cat:'Hair Care', name:'Amalico Batana Oil', size:'250MLx48', pack:null, price:452.00, real:true, desc:'Amalico Batana Oil — wholesale case of 48 (250MLx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc115', dept:'Cosmetics', cat:'Hair Care', name:'Amalico Batana Oil Shampoo', size:'500MLx48', pack:null, price:402.00, real:true, desc:'Amalico Batana Oil Shampoo — wholesale case of 48 (500MLx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc116', dept:'Cosmetics', cat:'Hair Care', name:'Amalico Batana Conditioner', size:'500MLx48', pack:null, price:402.00, real:true, desc:'Amalico Batana Conditioner — wholesale case of 48 (500MLx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  // Kojic
  { id:'jc117', dept:'Cosmetics', cat:'Skin Care', name:'Kojic Sensitive Cream', size:'96 pcs', pack:null, price:430.00, real:true, desc:'Kojic Sensitive Cream — wholesale case of 96 (96 pcs). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc118', dept:'Cosmetics', cat:'Skin Care', name:'Kojic Face Cream', size:'288 pcs', pack:null, price:802.00, real:true, desc:'Kojic Face Cream — wholesale case of 288 (288 pcs). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc119', dept:'Cosmetics', cat:'Cosmetics', name:'Kojic Soap', size:'192 pcs', pack:null, price:335.00, real:true, desc:'Kojic Soap — wholesale case of 192 (192 pcs). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc120', dept:'Cosmetics', cat:'Skin Care', name:'Kojic Serum', size:'192 pcs', pack:null, price:524.00, real:true, desc:'Kojic Serum — wholesale case of 192 (192 pcs). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc121', dept:'Cosmetics', cat:'Skin Care', name:'Kojic Toner', size:'96 pcs', pack:null, price:325.00, real:true, desc:'Kojic Toner — wholesale case of 96 (96 pcs). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc122', dept:'Cosmetics', cat:'Skin Care', name:'Kojic Sun Block', size:'144 pcs', pack:null, price:419.00, real:true, desc:'Kojic Sun Block — wholesale case of 144 (144 pcs). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc123', dept:'Cosmetics', cat:'Skin Care', name:'Kojic Face Tube', size:'144 pcs', pack:null, price:413.00, real:true, desc:'Kojic Face Tube — wholesale case of 144 (144 pcs). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc124', dept:'Cosmetics', cat:'Skin Care', name:'Kojic Face Wash', size:'144 pcs', pack:null, price:392.00, real:true, desc:'Kojic Face Wash — wholesale case of 144 (144 pcs). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc125', dept:'Cosmetics', cat:'Skin Care', name:'Kojic Scrub', size:'48 pcs', pack:null, price:168.00, real:true, desc:'Kojic Scrub — wholesale case of 48 (48 pcs). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc126', dept:'Cosmetics', cat:'Skin Care', name:'Kojic H/B Cream', size:'72 pcs', pack:null, price:227.00, real:true, desc:'Kojic H/B Cream — wholesale case of 72 (72 pcs). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc127', dept:'Cosmetics', cat:'Skin Care', name:'Kojic Lotion', size:'48 pcs', pack:null, price:251.00, real:true, desc:'Kojic Lotion — wholesale case of 48 (48 pcs). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc128', dept:'Cosmetics', cat:'Cosmetics', name:'Kojic Shower Gel', size:'48 pcs', pack:null, price:251.00, real:true, desc:'Kojic Shower Gel — wholesale case of 48 (48 pcs). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc129', dept:'Cosmetics', cat:'Skin Care', name:'Kojic Body Oil Pink', size:'72 pcs', pack:null, price:246.00, real:true, desc:'Kojic Body Oil Pink — wholesale case of 72 (72 pcs). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc130', dept:'Cosmetics', cat:'Skin Care', name:'Kojic Body Oil Cocoa', size:'72 pcs', pack:null, price:246.00, real:true, desc:'Kojic Body Oil Cocoa — wholesale case of 72 (72 pcs). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc131', dept:'Cosmetics', cat:'Skin Care', name:'Kojic Body Oil White', size:'72 pcs', pack:null, price:246.00, real:true, desc:'Kojic Body Oil White — wholesale case of 72 (72 pcs). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  // Parley
  { id:'jc132', dept:'Cosmetics', cat:'Skin Care', name:'Parley Goldie', size:'144 pcs', pack:null, price:528.00, real:true, desc:'Parley Goldie — wholesale case of 144 (144 pcs). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc133', dept:'Cosmetics', cat:'Skin Care', name:'Parley Beauty Crème', size:'144 pcs', pack:null, price:528.00, real:true, img:'parley-beauty-creme-144-pcs', desc:'Parley Beauty Crème — wholesale case of 144 (144 pcs). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  // H20 Jours
  { id:'jc134', dept:'Cosmetics', cat:'Skin Care', name:'Lait H20 Jours Papaya', size:'500MLx24', pack:null, price:88.00, real:true, desc:'Lait H20 Jours Papaya — wholesale case of 24 (500MLx24). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc135', dept:'Cosmetics', cat:'Skin Care', name:'Cream H20 Jours Papaya', size:'300Gx48', pack:null, price:126.00, real:true, desc:'Cream H20 Jours Papaya — wholesale case of 48 (300Gx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  // L'Abidjanaise
  { id:'jc136', dept:'Cosmetics', cat:'Cosmetics', name:'Labidjanaise Soap Carrot', size:'200Gx72', pack:null, price:114.00, real:true, desc:'Labidjanaise Soap Carrot — wholesale case of 72 (200Gx72). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc137', dept:'Cosmetics', cat:'Skin Care', name:'Labidjanaise Lotion Carrot', size:'500MLx24', pack:null, price:88.00, real:true, desc:'Labidjanaise Lotion Carrot — wholesale case of 24 (500MLx24). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc138', dept:'Cosmetics', cat:'Cosmetics', name:'Labidjanaise Soap Carrot Nature', size:'200Gx72', pack:null, price:114.00, real:true, desc:'Labidjanaise Soap Carrot Nature — wholesale case of 72 (200Gx72). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc139', dept:'Cosmetics', cat:'Cosmetics', name:'Labidjanaise Soap Curcuma', size:'200Gx72', pack:null, price:114.00, real:true, desc:'Labidjanaise Soap Curcuma — wholesale case of 72 (200Gx72). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc140', dept:'Cosmetics', cat:'Skin Care', name:'Labidjanaise Serum Curcuma', size:'100MLx48', pack:null, price:101.00, real:true, desc:'Labidjanaise Serum Curcuma — wholesale case of 48 (100MLx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc141', dept:'Cosmetics', cat:'Skin Care', name:'Labidjanaise Crème de Visage Curcuma', size:'40MLx72', pack:null, price:101.00, real:true, desc:'Labidjanaise Crème de Visage Curcuma — wholesale case of 72 (40MLx72). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc142', dept:'Cosmetics', cat:'Cosmetics', name:'Labidjanaise Gel Douche Curcuma', size:'500MLx24', pack:null, price:76.00, real:true, desc:'Labidjanaise Gel Douche Curcuma — wholesale case of 24 (500MLx24). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc143', dept:'Cosmetics', cat:'Cosmetics', name:'Labidjanaise Gel Douche Curcuma', size:'1Lx12', pack:null, price:76.00, real:true, desc:'Labidjanaise Gel Douche Curcuma — wholesale case of 12 (1Lx12). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc144', dept:'Cosmetics', cat:'Skin Care', name:'Labidjanaise Lotion Curcuma', size:'250MLx36', pack:null, price:105.00, real:true, desc:'Labidjanaise Lotion Curcuma — wholesale case of 36 (250MLx36). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc145', dept:'Cosmetics', cat:'Skin Care', name:'Labidjanaise Lotion Curcuma', size:'350MLx24', pack:null, price:76.00, real:true, desc:'Labidjanaise Lotion Curcuma — wholesale case of 24 (350MLx24). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc146', dept:'Cosmetics', cat:'Skin Care', name:'Labidjanaise Lotion Nature', size:'500MLx24', pack:null, price:88.00, real:true, desc:'Labidjanaise Lotion Nature — wholesale case of 24 (500MLx24). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc147', dept:'Cosmetics', cat:'Skin Care', name:'Labidjanaise Cream Nature', size:'300Gx48', pack:null, price:150.00, real:true, desc:'Labidjanaise Cream Nature — wholesale case of 48 (300Gx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc148', dept:'Cosmetics', cat:'Skin Care', name:'Labidjanaise Cream Carotte', size:'300Gx48', pack:null, price:150.00, real:true, desc:'Labidjanaise Cream Carotte — wholesale case of 48 (300Gx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  // Belle Vie
  { id:'jc149', dept:'Cosmetics', cat:'Skin Care', name:'Lait Belle Vie Curcuma', size:'475MLx24', pack:null, price:101.00, real:true, desc:'Lait Belle Vie Curcuma — wholesale case of 24 (475MLx24). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc150', dept:'Cosmetics', cat:'Cosmetics', name:'Gel Douche Belle Vie Curcuma', size:'700MLx24', pack:null, price:101.00, real:true, desc:'Gel Douche Belle Vie Curcuma — wholesale case of 24 (700MLx24). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc151', dept:'Cosmetics', cat:'Cosmetics', name:'Gel Douche Gommage Belle Vie Tomate', size:'700MLx24', pack:null, price:101.00, real:true, desc:'Gel Douche Gommage Belle Vie Tomate — wholesale case of 24 (700MLx24). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc152', dept:'Cosmetics', cat:'Cosmetics', name:'Gel Douche Gommage Belle Vie Curcuma', size:'700MLx24', pack:null, price:101.00, real:true, desc:'Gel Douche Gommage Belle Vie Curcuma — wholesale case of 24 (700MLx24). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc153', dept:'Cosmetics', cat:'Cosmetics', name:'Savon Belle Vie Curcuma', size:'225Gx96', pack:null, price:202.00, real:true, img:'savon-belle-vie-curcuma-225gx96', desc:'Savon Belle Vie Curcuma — wholesale case of 96 (225Gx96). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc154', dept:'Cosmetics', cat:'Cosmetics', name:'Savon Belle Vie Gommant Argil & Miel', size:'670G', pack:null, price:76.00, real:true, desc:'Savon Belle Vie Gommant Argil & Miel — wholesale case (670G). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc155', dept:'Cosmetics', cat:'Cosmetics', name:'Savon Belle Vie Gommant Avocat', size:'670G', pack:null, price:76.00, real:true, desc:'Savon Belle Vie Gommant Avocat — wholesale case (670G). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc156', dept:'Cosmetics', cat:'Cosmetics', name:'Savon Belle Vie Gommant Carotte', size:'670G', pack:null, price:76.00, real:true, desc:'Savon Belle Vie Gommant Carotte — wholesale case (670G). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc157', dept:'Cosmetics', cat:'Cosmetics', name:'Savon Belle Vie Gommant Collagene', size:'670G', pack:null, price:76.00, real:true, desc:'Savon Belle Vie Gommant Collagene — wholesale case (670G). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc158', dept:'Cosmetics', cat:'Cosmetics', name:'Savon Belle Vie Gommant Curcuma', size:'670G', pack:null, price:76.00, real:true, img:'savon-belle-vie-gommant-curcuma-670g', desc:'Savon Belle Vie Gommant Curcuma — wholesale case (670G). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc159', dept:'Cosmetics', cat:'Cosmetics', name:'Savon Belle Vie Gommant Glutathione', size:'670G', pack:null, price:76.00, real:true, desc:'Savon Belle Vie Gommant Glutathione — wholesale case (670G). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc160', dept:'Cosmetics', cat:'Cosmetics', name:'Savon Belle Vie Gommant Lemon', size:'670G', pack:null, price:76.00, real:true, desc:'Savon Belle Vie Gommant Lemon — wholesale case (670G). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc161', dept:'Cosmetics', cat:'Cosmetics', name:'Savon Belle Vie Gommant Papaye', size:'670G', pack:null, price:76.00, real:true, desc:'Savon Belle Vie Gommant Papaye — wholesale case (670G). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc162', dept:'Cosmetics', cat:'Cosmetics', name:'Savon Belle Vie Gommant Tomate', size:'670G', pack:null, price:76.00, real:true, desc:'Savon Belle Vie Gommant Tomate — wholesale case (670G). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc163', dept:'Cosmetics', cat:'Skin Care', name:'Concentré Belle Vie Curcuma', size:'125ML', pack:null, price:160.00, real:true, desc:'Concentré Belle Vie Curcuma — wholesale case (125ML). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc164', dept:'Cosmetics', cat:'Skin Care', name:'Serum Belle Vie Curcuma', size:'125MLx60', pack:null, price:189.00, real:true, desc:'Serum Belle Vie Curcuma — wholesale case of 60 (125MLx60). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc165', dept:'Cosmetics', cat:'Skin Care', name:'Lotion Belle Vie Curcuma', size:'125MLx60', pack:null, price:189.00, real:true, desc:'Lotion Belle Vie Curcuma — wholesale case of 60 (125MLx60). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc166', dept:'Cosmetics', cat:'Skin Care', name:'Tube Belle Vie Curcuma', size:'50G', pack:null, price:189.00, real:true, desc:'Tube Belle Vie Curcuma — wholesale case (50G). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc167', dept:'Cosmetics', cat:'Skin Care', name:'Crème Gommante Belle Vie Avocat', size:'300G', pack:null, price:118.00, real:true, desc:'Crème Gommante Belle Vie Avocat — wholesale case (300G). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc168', dept:'Cosmetics', cat:'Skin Care', name:'Crème Belle Vie Curcuma', size:'150G', pack:null, price:88.00, real:true, desc:'Crème Belle Vie Curcuma — wholesale case (150G). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc169', dept:'Cosmetics', cat:'Skin Care', name:'Crème Belle Vie Curcuma', size:'40Gx48', pack:null, price:126.00, real:true, desc:'Crème Belle Vie Curcuma — wholesale case of 48 (40Gx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc170', dept:'Cosmetics', cat:'Skin Care', name:'Crème Miracle Belle Vie Curcuma', size:'100G', pack:null, price:200.00, real:true, desc:'Crème Miracle Belle Vie Curcuma — wholesale case (100G). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  // Egyptian Beauty
  { id:'jc171', dept:'Cosmetics', cat:'Skin Care', name:'Cream Egyptian Beauty', size:'300MLx24', pack:null, price:101.00, real:true, desc:'Cream Egyptian Beauty — wholesale case of 24 (300MLx24). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc172', dept:'Cosmetics', cat:'Cosmetics', name:'Savon Egyptian Beauty', size:'180Gx48', pack:null, price:101.00, real:true, desc:'Savon Egyptian Beauty — wholesale case of 48 (180Gx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc173', dept:'Cosmetics', cat:'Cosmetics', name:'Gel Douche Exfoliant Egyptian Beauty', size:'1Lx12', pack:null, price:76.00, real:true, desc:'Gel Douche Exfoliant Egyptian Beauty — wholesale case of 12 (1Lx12). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc174', dept:'Cosmetics', cat:'Cosmetics', name:'Gel Douche Clarifiant Egyptian Beauty', size:'1Lx12', pack:null, price:76.00, real:true, desc:'Gel Douche Clarifiant Egyptian Beauty — wholesale case of 12 (1Lx12). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc175', dept:'Cosmetics', cat:'Skin Care', name:'Cream Egyptian Beauty', size:'125MLx48', pack:null, price:101.00, real:true, desc:'Cream Egyptian Beauty — wholesale case of 48 (125MLx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc176', dept:'Cosmetics', cat:'Cosmetics', name:'Gel Douche Exfoliant Egyptian Beauty', size:'500MLx12', pack:null, price:63.00, real:true, desc:'Gel Douche Exfoliant Egyptian Beauty — wholesale case of 12 (500MLx12). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc177', dept:'Cosmetics', cat:'Cosmetics', name:'Gel Douche Clarifiant Egyptian Beauty', size:'500MLx12', pack:null, price:63.00, real:true, desc:'Gel Douche Clarifiant Egyptian Beauty — wholesale case of 12 (500MLx12). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc178', dept:'Cosmetics', cat:'Skin Care', name:'Serum Egyptian Beauty', size:'30MLx36', pack:null, price:67.00, real:true, desc:'Serum Egyptian Beauty — wholesale case of 36 (30MLx36). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc179', dept:'Cosmetics', cat:'Skin Care', name:'Huile Egyptian Beauty', size:'90MLx48', pack:null, price:101.00, real:true, desc:'Huile Egyptian Beauty — wholesale case of 48 (90MLx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc180', dept:'Cosmetics', cat:'Skin Care', name:'DSR Egyptian Beauty', size:'30MLx72', pack:null, price:133.00, real:true, desc:'DSR Egyptian Beauty — wholesale case of 72 (30MLx72). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  // Morocco Skin
  { id:'jc181', dept:'Cosmetics', cat:'Skin Care', name:'Lait Morocco Skin', size:'400MLx24', pack:null, price:101.00, real:true, desc:'Lait Morocco Skin — wholesale case of 24 (400MLx24). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc182', dept:'Cosmetics', cat:'Skin Care', name:'Cream Morocco Skin', size:'300MLx48', pack:null, price:152.00, real:true, desc:'Cream Morocco Skin — wholesale case of 48 (300MLx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc183', dept:'Cosmetics', cat:'Cosmetics', name:'Savon Morocco Skin', size:'200Gx48', pack:null, price:101.00, real:true, desc:'Savon Morocco Skin — wholesale case of 48 (200Gx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc184', dept:'Cosmetics', cat:'Cosmetics', name:'Gel Douche Morocco Skin Exfoliant', size:'1Lx12', pack:null, price:76.00, real:true, desc:'Gel Douche Morocco Skin Exfoliant — wholesale case of 12 (1Lx12). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc185', dept:'Cosmetics', cat:'Cosmetics', name:'Gel Douche Morocco Skin Clarifiant', size:'1Lx12', pack:null, price:76.00, real:true, desc:'Gel Douche Morocco Skin Clarifiant — wholesale case of 12 (1Lx12). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc186', dept:'Cosmetics', cat:'Skin Care', name:'Serum Morocco Skin', size:'30MLx48', pack:null, price:95.00, real:true, desc:'Serum Morocco Skin — wholesale case of 48 (30MLx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc187', dept:'Cosmetics', cat:'Skin Care', name:'Huile Morocco Skin', size:'90MLx48', pack:null, price:101.00, real:true, desc:'Huile Morocco Skin — wholesale case of 48 (90MLx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc188', dept:'Cosmetics', cat:'Skin Care', name:'DSR Morocco Skin', size:'30MLx48', pack:null, price:114.00, real:true, desc:'DSR Morocco Skin — wholesale case of 48 (30MLx48). Sold by the case only. Price shown is the JOLOF TRADING wholesale price per case.' },
];
export const BASE_COMMODITIES = [
  { name:'Maize (Corn)', line:'Yellow and white maize for food, feed and milling.', img:U('photo-1651667343153-6dc318e27e41',600,450), alt:'Pile of harvested maize cobs and loose kernels' },
  { name:'Millet and Sorghum', line:'Drought-hardy staple grains for food and brewing.', img:'https://images.pexels.com/photos/18275951/pexels-photo-18275951.jpeg?auto=compress&cs=tinysrgb&w=600&h=450&fit=crop', alt:'Close-up of mixed millet grains' },
  { name:'Rice, Fonio and Teff', line:'Rice and ancient grains for food distribution.', img:U('photo-1586201375761-83865001e31c',600,450), alt:'Close-up of long grain white rice' },
  { name:'Wheat and Barley', line:'Grain for milling, malting and animal feed.', img:U('photo-1574323347407-f5e1ad6d020b',600,450), alt:'Close-up of whole wheat grains' },
  { name:'Peanuts (Groundnuts)', line:'Groundnuts for food processing and oil.', img:U('photo-1549978113-29eb25c8177f',600,450), alt:'Pile of in-shell peanuts' },
  { name:'Sesame Seeds', line:'Sesame for food manufacturing and oil pressing.', img:'https://images.pexels.com/photos/36187110/pexels-photo-36187110.jpeg?auto=compress&cs=tinysrgb&w=600&h=450&fit=crop', alt:'Close-up of golden sesame seeds' },
  { name:'Soybeans', line:'Soybeans for food processing, oil and feed.', img:U('photo-1728931340168-3869028e99e7',600,450), alt:'Close-up of dried soybeans' },
  { name:'Sunflower Seeds', line:'Sunflower seeds for oil pressing and snacking.', img:U('photo-1635843111961-06c71c3ed8cf',600,450), alt:'Pile of striped sunflower seeds' },
  { name:'Cottonseed', line:'Cottonseed for oil extraction and livestock feed.', img:'https://images.pexels.com/photos/14287148/pexels-photo-14287148.jpeg?auto=compress&cs=tinysrgb&w=600&h=450&fit=crop', alt:'Open cotton bolls holding fibre and cottonseed' },
  { name:'Shea Nuts and Shea Kernels', line:'Shea nuts and kernels for shea butter production.', img:"/products/shea-nuts.webp", alt:'Pile of dried shea nuts in northern Ghana' }
];
export const FEATURED = ['s1','g1','c5','d1','k1','p2','s6','c3','d3','g4','p5','c6'];
export const BEST = ['s2','d2','c1','p1','g2','s3','p3','d4'];
export const NEW = ['k2','s4','c2','g3','p4','d5','p6','s5'];
export const RECO = ['p7','c4','k1','g1','d2','s6'];
export const SOON = {};
export const CATS = [
  { dept:'Food', cat:'Spices & Seasonings', label:'Spices & Seasonings', img:'jumbo-jar' },
  { dept:'Food', cat:'Millet & Grains', label:'Millet & Grains', img:'saafia-arraw' },
  { dept:'Food', cat:'Tea & Coffee', label:'Tea & Coffee', img:'cafe-touba' },
  { dept:'Food', cat:'Drinks', label:'Drinks', img:'sagiko' },
  { dept:'Food', cat:'Pantry Essentials', label:'Pantry Essentials', img:'dieg-bou-diar' },
  { dept:'Food', cat:'Meat & Fish', label:'Meat & Fish', photo:'photo-1615141982883-c7ad0e69fd62' },
  { dept:'Food', cat:'Frozen Foods', label:'Frozen Foods', img:'foods/okra-cut' },
  { dept:'Cosmetics', cat:'Skin Care', label:'Skin Care', img:'shea-butter', cover:true },
  { dept:'Cosmetics', cat:'Hair Care', label:'Hair Care', img:'chebe-oil' },
  { dept:'Cosmetics', cat:'Cosmetics', label:'Cosmetics', img:'zote-soap' },
  { dept:'Trading', cat:'', label:'Commodity Trading', photo:'photo-1651667343153-6dc318e27e41' }
];


// Default "Price on request" description (same rule as the home page)
BASE_PRODUCTS.forEach((p) => {
  if (p.price === null && !p.desc) p.desc = `From the JOLOF Cosmetics Wholesale catalogue.${p.pack ? ` Wholesale pack: ${p.pack}.` : ''} Contact our team for wholesale pricing and availability.`;
});

/** Starter departments (seed only — the admin manages departments from Admin → Departments). */
export const BASE_DEPARTMENTS = [
  { id: 'dep-trading', name: 'Trading', slug: 'trading', kind: 'trading', sort: 0, tagline: 'Maize, millet, rice, groundnuts, sesame, shea and more — quoted on request.', description: 'Global commodity trading from Africa to the world.', image: 'https://images.unsplash.com/photo-1651667343153-6dc318e27e41?auto=format&fit=crop&w=900&q=80' },
  { id: 'dep-food', name: 'Food', slug: 'food', kind: 'products', sort: 1, tagline: 'Seasonings, millet & grains, tea & coffee, drinks and pantry staples.', description: '', image: 'https://images.unsplash.com/photo-1736182146384-72e77abe44ec?auto=format&fit=crop&w=900&q=80' },
  { id: 'dep-cosmetics', name: 'Cosmetics', slug: 'cosmetics', kind: 'products', sort: 2, tagline: 'Skin care, hair care, soaps and fragrance from the JOLOF Cosmetics catalogue.', description: '', image: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=900&q=80' },
];
export const DEPARTMENTS = BASE_DEPARTMENTS.map((d) => d.name);

export const BASE_CATEGORIES = [
  { id: 'cat-spices', dept: 'Food', name: 'Spices & Seasonings', status: 'active' },
  { id: 'cat-millet', dept: 'Food', name: 'Millet & Grains', status: 'active' },
  { id: 'cat-tea', dept: 'Food', name: 'Tea & Coffee', status: 'active' },
  { id: 'cat-drinks', dept: 'Food', name: 'Drinks', status: 'active' },
  { id: 'cat-pantry', dept: 'Food', name: 'Pantry Essentials', status: 'active' },
  { id: 'cat-meat', dept: 'Food', name: 'Meat & Fish', status: 'active' },
  { id: 'cat-frozen', dept: 'Food', name: 'Frozen Foods', status: 'active' },
  { id: 'cat-skin', dept: 'Cosmetics', name: 'Skin Care', status: 'active' },
  { id: 'cat-hair', dept: 'Cosmetics', name: 'Hair Care', status: 'active' },
  { id: 'cat-cos', dept: 'Cosmetics', name: 'Cosmetics', status: 'active' },
  { id: 'cat-grains', dept: 'Trading', name: 'Grains & Cereals', status: 'active' },
  { id: 'cat-oilseeds', dept: 'Trading', name: 'Oilseeds & Groundnuts', status: 'active' },
  { id: 'cat-shea', dept: 'Trading', name: 'Shea Nuts & Kernels', status: 'active' },
];

// Commodity group mapping (used by the mega menu counts and the admin Trading screen)
export const COMMODITY_GROUP = {
  'Maize (Corn)': 'Grains & Cereals', 'Millet and Sorghum': 'Grains & Cereals', 'Rice, Fonio and Teff': 'Grains & Cereals', 'Wheat and Barley': 'Grains & Cereals',
  'Peanuts (Groundnuts)': 'Oilseeds & Groundnuts', 'Sesame Seeds': 'Oilseeds & Groundnuts', 'Soybeans': 'Oilseeds & Groundnuts', 'Sunflower Seeds': 'Oilseeds & Groundnuts', 'Cottonseed': 'Oilseeds & Groundnuts',
  'Shea Nuts and Shea Kernels': 'Shea Nuts & Kernels',
};

// Deterministic demo inventory so every reload looks the same
const seedNum = (str, min, max) => { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0; return min + (h % (max - min + 1)); };

export const SEED_PRODUCTS = BASE_PRODUCTS.map((p, i) => {
  const stock = p.id === 'p3' || p.id === 'jc9' ? 4 : p.id === 'd3' || p.id === 'jc16' ? 0 : seedNum(p.id, 18, 420);
  return {
    ...p,
    sku: `JLF-${p.dept.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
    stock,
    lowStock: p.price === null || p.price > 50 ? 5 : 24,
    moq: p.pack ? 1 : p.price && p.price > 50 ? 1 : 6,
    status: 'active', // active | hidden
    featured: FEATURED.includes(p.id),
    bestSeller: BEST.includes(p.id),
    newArrival: NEW.includes(p.id),
    recommended: RECO.includes(p.id),
  };
});

export const SEED_COMMODITIES = BASE_COMMODITIES.map((c, i) => ({
  id: `cm${i + 1}`,
  ...c,
  group: COMMODITY_GROUP[c.name] || 'Grains & Cereals',
  origin: ['Senegal', 'Mali', 'Burkina Faso', 'Ghana', 'Nigeria'][i % 5],
  unit: 'MT',
  minQty: [25, 20, 25, 50, 20, 10, 25, 20, 25, 10][i],
  indicative: [285, 340, 520, 310, 1150, 1480, 495, 560, 260, 410][i], // USD per MT, indicative only
  status: 'active',
}));
