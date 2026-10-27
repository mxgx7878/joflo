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
  { id:'jc30', dept:'Cosmetics', cat:'Skin Care', name:'Carotone Cream', size:'135MLx96', pack:null, price:176.40, real:true, img:'carotone-cream135', desc:'Carotone Cream — wholesale case of 96 (135MLx96). Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc18', dept:'Cosmetics', cat:'Cosmetics', name:'Carotone Savon Éclair', size:'190GRSx48', pack:null, price:100.80, real:true, img:'carotone-soap', desc:'Carotone Savon Éclair — wholesale case of 48 (190GRSx48). Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc31', dept:'Cosmetics', cat:'Skin Care', name:'Carotone Tube Crème', size:'50GRSx100', pack:null, price:226.80, real:true, img:'carotone-tube', desc:'Carotone Tube Crème — wholesale case of 100 (50GRSx100). Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc32', dept:'Cosmetics', cat:'Skin Care', name:'Carotone B.S.C Cream', size:'30GRx108', pack:null, price:175.35, real:true, img:'carotone-bsc-cream', desc:'Carotone B.S.C Cream — wholesale case of 108 (30GRx108). Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc33', dept:'Cosmetics', cat:'Cosmetics', name:'Carotone Gel Douche', size:'700MLx24', pack:null, price:132.30, real:true, img:'carotone-geldouche', desc:'Carotone Gel Douche — wholesale case of 24 (700MLx24). Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc34', dept:'Cosmetics', cat:'Skin Care', name:'Carotone Huile', size:'65MLx216', pack:null, price:407.40, real:true, img:'carotone-huile', desc:'Carotone Huile — wholesale case of 216 (65MLx216). Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc35', dept:'Cosmetics', cat:'Skin Care', name:'Carotone B.S.C Trio Kit', size:'30MLx24', pack:null, price:141.75, real:true, img:'carotone-trio', desc:'Carotone B.S.C Trio Kit — wholesale case of 24 (30MLx24). Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc36', dept:'Cosmetics', cat:'Skin Care', name:'Carotone B.S.C Lotion', size:'50MLx96', pack:null, price:196.35, real:true, img:'carotone-bsc-lotion', desc:'Carotone B.S.C Lotion — wholesale case of 96 (50MLx96). Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc37', dept:'Cosmetics', cat:'Skin Care', name:'Carotone B.S.C Serum', size:'30MLx96', pack:null, price:180.60, real:true, img:'carotone-bsc-serum', desc:'Carotone B.S.C Serum — wholesale case of 96 (30MLx96). Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc38', dept:'Cosmetics', cat:'Skin Care', name:'Bio Claire Original Cream', size:'300MLx24', pack:null, price:100.80, real:true, img:'bioclaire-cream', desc:'Bio Claire Original Cream — wholesale case of 24 (300MLx24). Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc39', dept:'Cosmetics', cat:'Skin Care', name:'Bio Claire Lotion', size:'500MLx24', pack:null, price:113.40, real:true, img:'bioclaire-lotion', desc:'Bio Claire Lotion — wholesale case of 24 (500MLx24). Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc23', dept:'Cosmetics', cat:'Cosmetics', name:'Bio Claire Savon', size:'190GRSx48', pack:null, price:100.80, real:true, img:'bioclaire-soap', desc:'Bio Claire Savon — wholesale case of 48 (190GRSx48). Price shown is the JOLOF TRADING wholesale price per case.' },
  { id:'jc1', dept:'Cosmetics', cat:'Skin Care', name:'Lait Clear Therapy CT+ Carotte', size:'500 ML', pack:'12 Units', price:null, img:'ct-carotte-lait' },
  { id:'jc2', dept:'Cosmetics', cat:'Skin Care', name:'Cream Paw Paw', size:'300 ML', pack:'48 Units', price:null, img:'pawpaw-cream' },
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
  { id:'jc17', dept:'Cosmetics', cat:'Cosmetics', name:'Gel Douche Paw Paw', size:'500 ML', pack:'24 Units', price:null, img:'pawpaw-geldouche' },
  { id:'jc19', dept:'Cosmetics', cat:'Cosmetics', name:'Vaseline Pink Lotion', size:'725 ML', pack:'12 Units', price:null, img:'vaseline-pink' },
  { id:'jc20', dept:'Cosmetics', cat:'Cosmetics', name:'VO5', size:'370ML', pack:null, price:null, img:'vo5' },
  { id:'jc21', dept:'Cosmetics', cat:'Cosmetics', name:'Scurl', size:'425 g', pack:'12 pcs', price:null, img:'scurl' },
  { id:'jc22', dept:'Cosmetics', cat:'Cosmetics', name:'White Gold Soap Turmeric USA', size:'135g', pack:'192 pcs', price:null, img:'whitegold-soap' },
  { id:'jc24', dept:'Cosmetics', cat:'Cosmetics', name:'Kojie San Soap', size:'250g', pack:'72pcs', price:null, img:'kojiesan-soap' },
  { id:'jc25', dept:'Cosmetics', cat:'Cosmetics', name:'Soap H2O Papaya', size:'200 g', pack:'72 units', price:null, img:'h2o-papaya-soap' },
  { id:'jc26', dept:'Cosmetics', cat:'Cosmetics', name:'Colgate Cavity', size:'8 Oz', pack:'32 Units', price:null, img:'colgate-cavity' },
  { id:'jc27', dept:'Cosmetics', cat:'Cosmetics', name:'Zote Soap', size:'400 gr', pack:'25 Units', price:null, img:'zote-soap' },
  { id:'jc28', dept:'Cosmetics', cat:'Cosmetics', name:'Spray Dove', size:null, pack:'12 units', price:null, img:'spray-dove' },
  { id:'k1', dept:'Cosmetics', cat:'Skin Care', name:'Raw Shea Butter', size:'Bulk carton', price:89.00, img:'shea-butter', tag:'Bulk', desc:'Unrefined shea butter supplied in bulk cartons for cosmetic makers, salons and resellers. Request bulk pricing for larger volumes.' },
  { id:'k2', dept:'Cosmetics', cat:'Cosmetics', name:'La Paix Congnon-Mousso Yako', size:'Bottle', price:4.99, img:'la-paix', tag:'New', desc:'La Paix Congnon-Mousso Yako personal care product.' }
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
export const SOON = { 'Meat & Fish':1 };
export const CATS = [
  { dept:'Food', cat:'Spices & Seasonings', label:'Spices & Seasonings', img:'jumbo-jar' },
  { dept:'Food', cat:'Millet & Grains', label:'Millet & Grains', img:'saafia-arraw' },
  { dept:'Food', cat:'Tea & Coffee', label:'Tea & Coffee', img:'cafe-touba' },
  { dept:'Food', cat:'Drinks', label:'Drinks', img:'sagiko' },
  { dept:'Food', cat:'Pantry Essentials', label:'Pantry Essentials', img:'dieg-bou-diar' },
  { dept:'Food', cat:'Meat & Fish', label:'Meat & Fish', photo:'photo-1615141982883-c7ad0e69fd62' },
  { dept:'Cosmetics', cat:'Skin Care', label:'Skin Care', img:'shea-butter', cover:true },
  { dept:'Cosmetics', cat:'Hair Care', label:'Hair Care', img:'chebe-oil' },
  { dept:'Cosmetics', cat:'Cosmetics', label:'Cosmetics', img:'zote-soap' },
  { dept:'Trading', cat:'', label:'Commodity Trading', photo:'photo-1651667343153-6dc318e27e41' }
];


// Default "Price on request" description (same rule as the home page)
BASE_PRODUCTS.forEach((p) => {
  if (p.price === null && !p.desc) p.desc = `From the JOLOF Cosmetics Wholesale catalogue.${p.pack ? ` Wholesale pack: ${p.pack}.` : ''} Contact our team for wholesale pricing and availability.`;
});

export const DEPARTMENTS = ['Food', 'Cosmetics', 'Trading'];

export const BASE_CATEGORIES = [
  { id: 'cat-spices', dept: 'Food', name: 'Spices & Seasonings', status: 'active' },
  { id: 'cat-millet', dept: 'Food', name: 'Millet & Grains', status: 'active' },
  { id: 'cat-tea', dept: 'Food', name: 'Tea & Coffee', status: 'active' },
  { id: 'cat-drinks', dept: 'Food', name: 'Drinks', status: 'active' },
  { id: 'cat-pantry', dept: 'Food', name: 'Pantry Essentials', status: 'active' },
  { id: 'cat-meat', dept: 'Food', name: 'Meat & Fish', status: 'coming_soon' },
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
