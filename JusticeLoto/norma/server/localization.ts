type Gender = 'm' | 'f' | 'n' | 'p'
type Forms = [masculine: string, feminine: string, neuter: string, plural: string]

const forms: Record<string, Forms> = {
  raw: ['сырой', 'сырая', 'сырое', 'сырые'],
  fresh: ['свежий', 'свежая', 'свежее', 'свежие'],
  cooked: ['приготовленный', 'приготовленная', 'приготовленное', 'приготовленные'],
  fried: ['жареный', 'жареная', 'жареное', 'жареные'],
  baked: ['запечённый', 'запечённая', 'запечённое', 'запечённые'],
  roasted: ['запечённый', 'запечённая', 'запечённое', 'запечённые'],
  boiled: ['варёный', 'варёная', 'варёное', 'варёные'],
  braised: ['тушёный', 'тушёная', 'тушёное', 'тушёные'],
  stewed: ['тушёный', 'тушёная', 'тушёное', 'тушёные'],
  smoked: ['копчёный', 'копчёная', 'копчёное', 'копчёные'],
  dried: ['сушёный', 'сушёная', 'сушёное', 'сушёные'],
  dehydrated: ['сушёный', 'сушёная', 'сушёное', 'сушёные'],
  frozen: ['замороженный', 'замороженная', 'замороженное', 'замороженные'],
  canned: ['консервированный', 'консервированная', 'консервированное', 'консервированные'],
  pickled: ['маринованный', 'маринованная', 'маринованное', 'маринованные'],
  salted: ['солёный', 'солёная', 'солёное', 'солёные'],
  unsalted: ['несолёный', 'несолёная', 'несолёное', 'несолёные'],
  toasted: ['поджаренный', 'поджаренная', 'поджаренное', 'поджаренные'],
  whole: ['цельный', 'цельная', 'цельное', 'цельные'],
  ground: ['молотый', 'молотая', 'молотое', 'молотые'],
  shredded: ['тёртый', 'тёртая', 'тёртое', 'тёртые'],
  grated: ['тёртый', 'тёртая', 'тёртое', 'тёртые'],
  sliced: ['нарезанный', 'нарезанная', 'нарезанное', 'нарезанные'],
  chopped: ['рубленый', 'рубленая', 'рубленое', 'рубленые'],
  diced: ['нарезанный кубиками', 'нарезанная кубиками', 'нарезанное кубиками', 'нарезанные кубиками'],
  dry: ['сухой', 'сухая', 'сухое', 'сухие'],
  instant: ['быстрого приготовления', 'быстрого приготовления', 'быстрого приготовления', 'быстрого приготовления'],
  enriched: ['обогащённый', 'обогащённая', 'обогащённое', 'обогащённые'],
  unenriched: ['необогащённый', 'необогащённая', 'необогащённое', 'необогащённые'],
  pasteurized: ['пастеризованный', 'пастеризованная', 'пастеризованное', 'пастеризованные'],
  lowfat: ['нежирный', 'нежирная', 'нежирное', 'нежирные'],
  'non-fat': ['обезжиренный', 'обезжиренная', 'обезжиренное', 'обезжиренные'],
  nonfat: ['обезжиренный', 'обезжиренная', 'обезжиренное', 'обезжиренные'],
  'part-skim': ['частично обезжиренный', 'частично обезжиренная', 'частично обезжиренное', 'частично обезжиренные'],
  'low-moisture': ['с пониженной влажностью', 'с пониженной влажностью', 'с пониженной влажностью', 'с пониженной влажностью'],
}

const phrases: Record<string, string> = {
  'separable lean and fat': 'мясо с жиром',
  'separable lean only': 'постное мясо',
  'separable fat': 'отделимый жир',
  'lean and fat': 'мясо с жиром',
  'lean only': 'постное мясо',
  'bone-in': 'на кости',
  'boneless': 'без костей',
  'skinless': 'без кожи',
  'with skin': 'с кожей',
  'without skin': 'без кожи',
  'with bone': 'с костью',
  'without bone': 'без кости',
  'pan-fried': 'жареный на сковороде',
  'pan-broiled': 'жареный на сковороде',
  'oven-roasted': 'запечённый в духовке',
  'steam cooked': 'приготовленный на пару',
  'steamed': 'приготовленный на пару',
  'grilled': 'на гриле',
  'broiled': 'на гриле',
  'microwaved': 'в микроволновой печи',
  'ready-to-eat': 'готовый к употреблению',
  'ready to eat': 'готовый к употреблению',
  'ready-to-drink': 'готовый к употреблению',
  'shelf stable': 'длительного хранения',
  'unsweetened': 'без сахара',
  'sweetened': 'с сахаром',
  'no added sugar': 'без добавленного сахара',
  'sugar free': 'без сахара',
  'low sodium': 'с низким содержанием натрия',
  'reduced sodium': 'с пониженным содержанием натрия',
  'reduced fat': 'с пониженной жирностью',
  'low fat': 'с пониженной жирностью',
  'fat free': 'обезжиренный',
  'non fat': 'обезжиренный',
  'extra light': 'лёгкий',
  'extra virgin': 'первого холодного отжима',
  'vitamin d': 'витамин D',
  'vitamin c': 'витамин C',
  'vitamin b': 'витамин B',
  'with added': 'с добавлением',
  'without added': 'без добавления',
  'cottage cheese': 'творог',
  'string cheese': 'сыр палочками',
  'process cheese': 'плавленый сыр',
  'processed cheese': 'плавленый сыр',
  'freeze dried': 'сублимационной сушки',
  'freeze-dried': 'сублимационной сушки',
  'low moisture': 'с пониженной влажностью',
  'new zealand': 'Новая Зеландия',
  'amino acids': 'аминокислоты',
  'fatty acids': 'жирные кислоты',
  'by-products': 'субпродукты',
  'cream cheese': 'сливочный сыр',
  'sour cream': 'сметана',
  'condensed milk': 'сгущённое молоко',
  'powdered milk': 'сухое молоко',
  'milk powder': 'сухое молоко',
  'soy milk': 'соевое молоко',
  'almond milk': 'миндальное молоко',
  'oat milk': 'овсяное молоко',
  'coconut milk': 'кокосовое молоко',
  'greek yogurt': 'греческий йогурт',
  'peanut butter': 'арахисовая паста',
  'almond butter': 'миндальная паста',
  'sesame seed butter': 'кунжутная паста',
  'sunflower seed butter': 'паста из семян подсолнечника',
  'olive oil': 'оливковое масло',
  'sunflower oil': 'подсолнечное масло',
  'vegetable oil': 'растительное масло',
  'coconut oil': 'кокосовое масло',
  'corn oil': 'кукурузное масло',
  'peanut oil': 'арахисовое масло',
  'safflower oil': 'сафлоровое масло',
  'soybean oil': 'соевое масло',
  'canola oil': 'рапсовое масло',
  'wheat flour': 'пшеничная мука',
  'all-purpose flour': 'универсальная мука',
  'whole wheat': 'цельнозерновой',
  'brown rice': 'коричневый рис',
  'white rice': 'белый рис',
  'wild rice': 'дикий рис',
  'rice bran': 'рисовые отруби',
  'rice noodles': 'рисовая лапша',
  'long-grain': 'длиннозерновой',
  'medium-grain': 'среднезерновой',
  'short-grain': 'круглозерновой',
  'large curd': 'крупнозернистый',
  'small curd': 'мелкозернистый',
  'meat only': 'мясо',
  'meat and skin': 'мясо с кожей',
  'sweet potato': 'батат',
  'potato chips': 'картофельные чипсы',
  'french fries': 'картофель фри',
  'mashed potatoes': 'картофельное пюре',
  'green beans': 'стручковая фасоль',
  'baked beans': 'запечённая фасоль',
  'refried beans': 'жареная фасоль',
  'kidney beans': 'красная фасоль',
  'pinto beans': 'фасоль пинто',
  'black beans': 'чёрная фасоль',
  'navy beans': 'белая фасоль',
  'soy beans': 'соевые бобы',
  'chickpeas': 'нут',
  'garden peas': 'зелёный горошек',
  'green peas': 'зелёный горошек',
  'iceberg lettuce': 'салат айсберг',
  'romaine lettuce': 'салат ромен',
  'bell pepper': 'болгарский перец',
  'hot pepper': 'острый перец',
  'chili pepper': 'перец чили',
  'black pepper': 'чёрный перец',
  'sweet pepper': 'сладкий перец',
  'cherry tomatoes': 'помидоры черри',
  'sun-dried tomatoes': 'вяленые помидоры',
  'shiitake mushrooms': 'грибы шиитаке',
  'oyster mushrooms': 'вёшенки',
  'white mushrooms': 'шампиньоны',
  'apple juice': 'яблочный сок',
  'orange juice': 'апельсиновый сок',
  'grape juice': 'виноградный сок',
  'tomato juice': 'томатный сок',
  'dried apricots': 'курага',
  'dried plums': 'чернослив',
  'prunes': 'чернослив',
  'raisins': 'изюм',
  'ground beef': 'говяжий фарш',
  'ground pork': 'свиной фарш',
  'ground chicken': 'куриный фарш',
  'ground turkey': 'фарш из индейки',
  'chicken breast': 'куриная грудка',
  'chicken thigh': 'куриное бедро',
  'chicken drumstick': 'куриная голень',
  'chicken wing': 'куриное крыло',
  'turkey breast': 'грудка индейки',
  'pork loin': 'свиная корейка',
  'pork shoulder': 'свиная лопатка',
  'pork ribs': 'свиные рёбрышки',
  'pork chop': 'свиная отбивная',
  'beef tenderloin': 'говяжья вырезка',
  'beef brisket': 'говяжья грудинка',
  'beef chuck': 'говяжья лопатка',
  'beef round': 'говяжий оковалок',
  'beef rib': 'говяжьи рёбра',
  'beef steak': 'говяжий стейк',
  'ice cream': 'мороженое',
  'whipped cream': 'взбитые сливки',
  'half and half': 'сливки 10–12%',
  'salad dressing': 'заправка для салата',
  'ranch dressing': 'соус ранч',
  'italian dressing': 'итальянская заправка',
  'soy sauce': 'соевый соус',
  'tomato sauce': 'томатный соус',
  'hot sauce': 'острый соус',
  'barbecue sauce': 'соус барбекю',
  'baby food': 'детское питание',
  'infant formula': 'детская смесь',
  'fast food': 'фастфуд',
  'breakfast cereal': 'сухой завтрак',
  'breakfast cereals': 'сухие завтраки',
  'whole grain': 'цельное зерно',
  'flaxseed meal': 'льняная мука',
  'baking powder': 'разрыхлитель',
  'baking soda': 'пищевая сода',
  'powdered sugar': 'сахарная пудра',
  'brown sugar': 'коричневый сахар',
  'maple syrup': 'кленовый сироп',
  'chocolate chips': 'шоколадная крошка',
  'dark chocolate': 'тёмный шоколад',
  'milk chocolate': 'молочный шоколад',
  'white chocolate': 'белый шоколад',
  'energy drink': 'энергетический напиток',
  'sports drink': 'спортивный напиток',
  'soft drink': 'безалкогольный напиток',
  'black tea': 'чёрный чай',
  'green tea': 'зелёный чай',
  'alaska pollock': 'минтай',
  'atlantic salmon': 'атлантический лосось',
  'sockeye salmon': 'нерка',
  'pink salmon': 'горбуша',
  'chum salmon': 'кета',
  'coho salmon': 'кижуч',
  'rainbow trout': 'радужная форель',
  'sea bass': 'морской окунь',
  'cod liver': 'печень трески',
  'beef and pork': 'из говядины и свинины',
  'macaroni and cheese': 'макароны с сыром',
  'macaroni & cheese': 'макароны с сыром',
}

const words: Record<string, string> = {
  pork: 'свинина', pig: 'свинина', ham: 'ветчина', bacon: 'бекон', lard: 'смалец',
  beef: 'говядина', veal: 'телятина', lamb: 'баранина', mutton: 'баранина', goat: 'козлятина',
  venison: 'оленина', bison: 'бизон', buffalo: 'буйволята', rabbit: 'крольчатина', meat: 'мясо', meats: 'мясные продукты',
  chicken: 'курица', broilers: 'бройлерная', broiler: 'бройлерная', fryers: 'бройлерная', turkey: 'индейка', duck: 'утка', goose: 'гусятина', quail: 'перепёлка', poultry: 'птица',
  egg: 'яйцо', eggs: 'яйца', yolk: 'желток', yolks: 'желтки', white: 'белый', whites: 'белки',
  fish: 'рыба', salmon: 'лосось', tuna: 'тунец', cod: 'треска', haddock: 'пикша', pollock: 'минтай', halibut: 'палтус', trout: 'форель', herring: 'сельдь', sardine: 'сардина', sardines: 'сардины', mackerel: 'скумбрия', anchovy: 'анчоус', anchovies: 'анчоусы', tilapia: 'тилапия', catfish: 'сом', bass: 'окунь', perch: 'окунь', flounder: 'камбала', sole: 'камбала', carp: 'карп', pike: 'щука', sturgeon: 'осётр', eel: 'угорь', swordfish: 'рыба-меч', mahi: 'махи-махи', finfish: 'рыба',
  shrimp: 'креветки', shrimps: 'креветки', prawn: 'креветка', prawns: 'креветки', crab: 'краб', lobster: 'омар', crayfish: 'раки', oyster: 'устрица', oysters: 'устрицы', mussel: 'мидия', mussels: 'мидии', scallop: 'гребешок', scallops: 'гребешки', squid: 'кальмар', octopus: 'осьминог', shellfish: 'морепродукты', clam: 'моллюск', clams: 'моллюски',
  milk: 'молоко', dairy: 'молочные продукты', cheese: 'сыр', cheddar: 'чеддер', mozzarella: 'моцарелла', parmesan: 'пармезан', swiss: 'швейцарский', provolone: 'проволоне', gouda: 'гауда', feta: 'фета', ricotta: 'рикотта', brie: 'бри', camembert: 'камамбер', gorgonzola: 'горгонзола', queso: 'сыр', yogurt: 'йогурт', yoghurt: 'йогурт', kefir: 'кефир', butter: 'сливочное масло', cream: 'сливки', buttermilk: 'пахта', whey: 'сыворотка', casein: 'казеин', milkfat: 'молочный жир',
  rice: 'рис', buckwheat: 'гречка', oats: 'овёс', oat: 'овсяный', oatmeal: 'овсянка', barley: 'ячмень', rye: 'рожь', wheat: 'пшеница', bulgur: 'булгур', couscous: 'кускус', quinoa: 'киноа', millet: 'пшено', amaranth: 'амарант', spelt: 'полба', semolina: 'манная крупа', grits: 'кукурузная крупа', cornmeal: 'кукурузная мука', bran: 'отруби', germ: 'зародыши', flour: 'мука', starch: 'крахмал', grain: 'зерно', grains: 'зерновые', cereal: 'хлопья', cereals: 'хлопья', granola: 'гранола', muesli: 'мюсли',
  bread: 'хлеб', bagel: 'бейгл', bun: 'булочка', buns: 'булочки', roll: 'булочка', rolls: 'булочки', croissant: 'круассан', toast: 'тост', croutons: 'гренки', breadcrumbs: 'панировочные сухари', crackers: 'крекеры', cracker: 'крекер', biscuit: 'печенье', biscuits: 'печенье', cookies: 'печенье', cookie: 'печенье', cake: 'торт', cupcake: 'кекс', muffin: 'маффин', muffins: 'маффины', pancake: 'блин', pancakes: 'блины', waffle: 'вафля', waffles: 'вафли', doughnut: 'пончик', donut: 'пончик', pie: 'пирог', pastry: 'выпечка', crust: 'корж',
  pasta: 'паста', spaghetti: 'спагетти', macaroni: 'макароны', noodles: 'лапша', noodle: 'лапша', lasagna: 'лазанья', ravioli: 'равиоли', tortellini: 'тортеллини', pizza: 'пицца',
  potato: 'картофель', potatoes: 'картофель', tomato: 'помидор', tomatoes: 'помидоры', cucumber: 'огурец', cucumbers: 'огурцы', carrot: 'морковь', carrots: 'морковь', broccoli: 'брокколи', cauliflower: 'цветная капуста', cabbage: 'капуста', kale: 'капуста кале', spinach: 'шпинат', lettuce: 'салат', arugula: 'рукола', chard: 'мангольд', celery: 'сельдерей', asparagus: 'спаржа', zucchini: 'цукини', squash: 'кабачок', pumpkin: 'тыква', eggplant: 'баклажан', beet: 'свёкла', beets: 'свёкла', radish: 'редис', turnip: 'репа', rutabaga: 'брюква', parsnip: 'пастернак', onion: 'лук', onions: 'лук', garlic: 'чеснок', shallot: 'лук-шалот', leek: 'лук-порей', chives: 'зелёный лук', pepper: 'перец', peppers: 'перцы', mushroom: 'гриб', mushrooms: 'грибы', shiitake: 'шиитаке', portabella: 'портобелло', vegetable: 'овощ', vegetables: 'овощи', legume: 'бобовые', legumes: 'бобовые', artichoke: 'артишок', okra: 'окра', corn: 'кукуруза', hominy: 'кукуруза', sauerkraut: 'квашеная капуста', pickles: 'маринованные огурцы', pickle: 'маринованный огурец', olives: 'оливки', olive: 'оливка', avocado: 'авокадо', salsa: 'сальса',
  beans: 'фасоль', bean: 'фасоль', lentils: 'чечевица', lentil: 'чечевица', peas: 'горох', pea: 'горох', chickpea: 'нут', soybean: 'соя', soybeans: 'соевые бобы', soy: 'соевый', tofu: 'тофу', tempeh: 'темпе', edamame: 'эдамаме', hummus: 'хумус', falafel: 'фалафель', pinto: 'пинто', lima: 'лима',
  apple: 'яблоко', apples: 'яблоки', applesauce: 'яблочное пюре', pear: 'груша', pears: 'груши', banana: 'банан', bananas: 'бананы', orange: 'апельсин', oranges: 'апельсины', tangerine: 'мандарин', tangerines: 'мандарины', mandarin: 'мандарин', clementine: 'клементин', grapefruit: 'грейпфрут', lemon: 'лимон', lemons: 'лимоны', lime: 'лайм', strawberry: 'клубника', strawberries: 'клубника', raspberry: 'малина', raspberries: 'малина', blueberry: 'голубика', blueberries: 'голубика', blackberry: 'ежевика', blackberries: 'ежевика', cranberry: 'клюква', cranberries: 'клюква', gooseberry: 'крыжовник', currant: 'смородина', currants: 'смородина', grape: 'виноград', grapes: 'виноград', watermelon: 'арбуз', melon: 'дыня', cantaloupe: 'канталупа', honeydew: 'дыня', pineapple: 'ананас', mango: 'манго', papaya: 'папайя', kiwi: 'киви', peach: 'персик', peaches: 'персики', nectarine: 'нектарин', nectarines: 'нектарины', apricot: 'абрикос', apricots: 'абрикосы', plum: 'слива', plums: 'сливы', cherry: 'вишня', cherries: 'вишня', pomegranate: 'гранат', fig: 'инжир', figs: 'инжир', date: 'финик', dates: 'финики', coconut: 'кокос', guava: 'гуава', lychee: 'личи', persimmon: 'хурма', fruit: 'фрукт', fruits: 'фрукты', juice: 'сок', juices: 'соки', nectar: 'нектар', 'applesauce unsweetened': 'яблочное пюре без сахара',
  almond: 'миндаль', almonds: 'миндаль', peanut: 'арахис', peanuts: 'арахис', walnut: 'грецкий орех', walnuts: 'грецкие орехи', hazelnut: 'фундук', hazelnuts: 'фундук', pistachio: 'фисташки', pistachios: 'фисташки', cashew: 'кешью', cashews: 'кешью', pecan: 'пекан', pecans: 'пекан', macadamia: 'макадамия', chestnut: 'каштан', chestnuts: 'каштаны', nut: 'орех', nuts: 'орехи', seed: 'семена', seeds: 'семена', sesame: 'кунжут', tahini: 'тахини', sunflower: 'подсолнечник', pumpkinseed: 'тыквенные семечки', flaxseed: 'семена льна', flax: 'лён', chia: 'чиа', poppy: 'мак', hemp: 'конопля',
  oil: 'масло', oils: 'масла', fat: 'жир', fats: 'жиры', shortening: 'кулинарный жир', margarine: 'маргарин', mayonnaise: 'майонез', dressing: 'заправка', sauce: 'соус', sauces: 'соусы', ketchup: 'кетчуп', mustard: 'горчица', vinegar: 'уксус', gravy: 'подливка', gravies: 'подливки', marinade: 'маринад', pesto: 'песто', relish: 'релиш', horseradish: 'хрен', wasabi: 'васаби',
  soup: 'суп', soups: 'супы', broth: 'бульон', stock: 'бульон', chowder: 'густой суп', stew: 'рагу', chili: 'чили', curry: 'карри', salad: 'салат', salads: 'салаты', sandwich: 'сэндвич', sandwiches: 'сэндвичи', burger: 'бургер', hamburger: 'гамбургер', cheeseburger: 'чизбургер', burrito: 'буррито', taco: 'тако', tacos: 'тако', enchilada: 'энчилада', tamale: 'тамале', quesadilla: 'кесадилья', sushi: 'суши', sashimi: 'сасими', 'hummus plate': 'хумус с гарниром',
  sausage: 'колбаса', sausages: 'колбасы', salami: 'салями', pepperoni: 'пепперони', bologna: 'болонья', mortadella: 'мортаделла', frankfurter: 'сосиска', frankfurters: 'сосиски', hotdog: 'хот-дог', luncheon: 'мясной', lunchmeat: 'мясная нарезка', chorizo: 'чоризо', liverwurst: 'печёночная колбаса',
  sugar: 'сахар', sugars: 'сахара', honey: 'мёд', syrup: 'сироп', molasses: 'патока', jam: 'джем', jelly: 'желе', marmalade: 'мармелад', preserves: 'варенье', chocolate: 'шоколад', cocoa: 'какау', cacao: 'какау', candy: 'конфета', candies: 'конфеты', caramel: 'карамель', fudge: 'помадка', marshmallow: 'маршмеллоу', marshmallows: 'маршмеллоу', licorice: 'лакрица', gum: 'жвачка', gelatin: 'желатин', pudding: 'пудинг', custard: 'заварной крем', frosting: 'глазурь', icing: 'глазурь', sherbet: 'шербет', popsicle: 'фруктовый лёд', sweets: 'сладости',
  water: 'вода', beverage: 'напиток', beverages: 'напитки', drink: 'напиток', drinks: 'напитки', soda: 'газировка', cola: 'кола', lemonade: 'лимонад', coffee: 'кофе', espresso: 'эспрессо', cappuccino: 'капучино', latte: 'латте', tea: 'чай', kombucha: 'комбуча', beer: 'пиво', ale: 'эль', wine: 'вино', cider: 'сидр', vodka: 'водка', whiskey: 'виски', whisky: 'виски', rum: 'ром', gin: 'джин', tequila: 'текила', brandy: 'бренди', liqueur: 'ликёр', cocktail: 'коктейль', alcohol: 'алкоголь', alcoholic: 'алкогольный',
  salt: 'соль', sodium: 'натрий', spices: 'специи', spice: 'специя', herbs: 'травы', herb: 'трава', basil: 'базилик', oregano: 'орегано', thyme: 'тимьян', rosemary: 'розмарин', parsley: 'петрушка', cilantro: 'кинза', coriander: 'кориандр', dill: 'укроп', mint: 'мята', sage: 'шалфей', cinnamon: 'корица', nutmeg: 'мускатный орех', cloves: 'гвоздика', clove: 'гвоздика', ginger: 'имбирь', turmeric: 'куркума', cumin: 'зира', paprika: 'паприка', cardamom: 'кардамон', saffron: 'шафран', vanilla: 'ваниль', anise: 'анис', fennel: 'фенхель', bay: 'лавровый', 'curry powder': 'порошок карри',
  baby: 'детский', infant: 'детский', formula: 'смесь', toddler: 'для малышей', snack: 'снек', snacks: 'снеки', chips: 'чипсы', popcorn: 'попкорн', pretzel: 'крендель', pretzels: 'крендели', bar: 'батончик', bars: 'батончики', trail: 'дорожный', mix: 'смесь', mixed: 'смешанный', 'granola bar': 'батончик гранола',
  restaurant: 'ресторанный', commercial: 'промышленный', homemade: 'домашний', home: 'домашний', store: 'магазинный', brand: 'марка', generic: 'обычный', national: 'национальный', imported: 'импортный', domestic: 'отечественный', regular: 'обычный', original: 'оригинальный', classic: 'классический', traditional: 'традиционный', plain: 'без добавок', natural: 'натуральный', organic: 'органический', kosher: 'кошерный', vegetarian: 'вегетарианский', vegan: 'веганский', italian: 'итальянский', french: 'французский', chinese: 'китайский', japanese: 'японский', mexican: 'мексиканский', indian: 'индийский', greek: 'греческий', american: 'американский', 'swiss style': 'в швейцарском стиле', ranch: 'ранч', barbecue: 'барбекю', teriyaki: 'терияки', 'buffalo style': 'в стиле буффало',
  fresh: 'свежий', cooked: 'приготовленный', raw: 'сырой', frozen: 'замороженный', canned: 'консервированный', dried: 'сушёный', dehydrated: 'сушёный', baked: 'запечённый', roasted: 'запечённый', fried: 'жареный', boiled: 'варёный', braised: 'тушёный', stewed: 'тушёный', smoked: 'копчёный', cured: 'посоленный', salted: 'солёный', unsalted: 'несолёный', pickled: 'маринованный', toasted: 'поджаренный', heated: 'нагретый', reheated: 'разогретый', unprepared: 'неприготовленный', prepared: 'приготовленный', reconstituted: 'восстановленный', diluted: 'разбавленный', concentrated: 'концентрированный', concentrate: 'концентрат', powdered: 'порошковый', powder: 'порошок', dry: 'сухой', instant: 'быстрого приготовления', enriched: 'обогащённый', unenriched: 'необогащённый', fortified: 'обогащённый', pasteurized: 'пастеризованный', unpasteurized: 'непастеризованный', fermented: 'ферментированный',
  whole: 'цельный', ground: 'молотый', minced: 'рубленый', shredded: 'тёртый', grated: 'тёртый', sliced: 'нарезанный', slices: 'ломтики', slice: 'ломтик', chopped: 'рубленый', diced: 'кубиками', cubed: 'кубиками', chunks: 'кусками', chunk: 'кусок', pieces: 'кусочки', piece: 'кусок', strips: 'полосками', rings: 'кольцами', spears: 'дольками', wedges: 'дольками', halves: 'половинками', half: 'половина', quartered: 'четвертинками', mashed: 'пюре', pureed: 'пюре', puree: 'пюре', 'juice drained': 'сок слит', drained: 'без жидкости', solids: 'твёрдая часть', liquid: 'жидкость', liquids: 'жидкость', 'water packed': 'в воде', 'oil packed': 'в масле', packed: 'упакованный', package: 'упаковка', packaged: 'упакованный', container: 'упаковка', bottled: 'бутылочный', bottle: 'бутылка',
  loin: 'корейка', tenderloin: 'вырезка', sirloin: 'филейная часть', rib: 'рёбра', ribs: 'рёбрышки', chuck: 'лопатка', shoulder: 'лопатка', brisket: 'грудинка', round: 'оковалок', rump: 'огузок', shank: 'голяшка', flank: 'пашина', skirt: 'юбка', steak: 'стейк', roast: 'ростбиф', cutlet: 'котлета', cutlets: 'котлеты', patty: 'котлета', patties: 'котлеты', chop: 'отбивная', chops: 'отбивные', breast: 'грудка', thigh: 'бедро', thighs: 'бёдра', drumstick: 'голень', drumsticks: 'голени', wing: 'крыло', wings: 'крылья', leg: 'ножка', legs: 'ножки', neck: 'шея', back: 'спинка', tail: 'хвост', liver: 'печень', heart: 'сердце', kidney: 'почки', kidneys: 'почки', tongue: 'язык', tripe: 'рубец', brain: 'мозг', giblets: 'потроха', skin: 'кожа', bone: 'кость', bones: 'кости', lean: 'постный', trimmed: 'обрезанный', separable: 'отделимый', choice: 'категория Choice', select: 'категория Select', prime: 'категория Prime', grade: 'категория', grades: 'категории', center: 'центральная часть', centre: 'центральная часть', blade: 'лопаточная часть', eye: 'центральная часть', top: 'верхняя часть', bottom: 'нижняя часть', side: 'боковая часть', flat: 'плоская часть', point: 'толстый край', arm: 'передняя часть',
  light: 'светлый', dark: 'тёмный', red: 'красный', green: 'зелёный', yellow: 'жёлтый', 'orange colored': 'оранжевый', purple: 'фиолетовый', black: 'чёрный', blue: 'синий', golden: 'золотистый', 'white meat': 'белое мясо', 'dark meat': 'тёмное мясо', mature: 'зрелый', 'baby leaf': 'молодые листья', 'baby spinach': 'молодой шпинат', 'regular mature': 'обычный зрелый', small: 'маленький', medium: 'средний', large: 'крупный', extra: 'экстра', jumbo: 'очень крупный', mini: 'мини', miniature: 'миниатюрный', sharp: 'острый', mild: 'мягкий', sweet: 'сладкий', sour: 'кислый', bitter: 'горький', spicy: 'пряный', hot: 'острый', creamy: 'кремовый', smooth: 'однородный', chunky: 'с кусочками', crisp: 'хрустящий', crispy: 'хрустящий', crunchy: 'хрустящий', stuffed: 'фаршированный', filled: 'с начинкой', topped: 'с добавкой', coated: 'покрытый', flavored: 'ароматизированный', flavor: 'вкус', 'flavored with': 'со вкусом', added: 'добавленный', without: 'без', with: 'с', only: 'только', includes: 'включает', composite: 'составной', varieties: 'сорта', variety: 'сорт', type: 'тип', style: 'стиль', recipe: 'рецепт', seasoned: 'приправленный', unseasoned: 'неприправленный', enhanced: 'обработанный', 'non-enhanced': 'необработанный',
}

Object.assign(phrases, {
  'red bull': 'Red Bull',
  'low calorie': 'низкокалорийный',
  'reduced calorie': 'с пониженной калорийностью',
  'pasteurized process': 'плавленый пастеризованный',
  'eye of round': 'центральная часть оковалка',
  'navel end': 'пупочная часть',
  'crinkle cut': 'фигурная нарезка',
  'animal fat': 'животный жир',
  'bacon grease': 'топлёный жир бекона',
  'ready-to-serve': 'готовый к употреблению',
  'upperchoice': 'категория Upper Choice',
  'broilers or fryers': 'бройлерная',
  'dark meat': 'тёмное мясо',
  'white meat': 'белое мясо',
  'lean meat': 'постное мясо',
  'arm picnic': 'лопаточная часть',
  'fat-free': 'обезжиренный',
  'full fat': 'полножирный',
  'pre-sliced': 'нарезанный',
  '2nd foods': 'этап 2',
  '3rd foods': 'этап 3',
  'babyfood': 'детское питание',
  'hocks': 'голяшка',
  'feet': 'ножки',
  'backfat': 'спинной жир',
  'tenders': 'филе',
  'breaded': 'в панировке',
  'uncooked': 'сырой',
  'ripe': 'спелый',
  'mesquite': 'мескитовый',
  'link': 'сосиска',
})

Object.assign(words, {
  vitamin: 'витамин', vitamins: 'витамины', minerals: 'минералы', mineral: 'минерал',
  babyfood: 'детское питание', foods: 'продукты', food: 'продукт', niacin: 'ниацин',
  thiamin: 'тиамин', riboflavin: 'рибофлавин', pantothenic: 'пантотеновая',
  folate: 'фолаты', carotenoids: 'каротиноиды', tocopherols: 'токоферолы',
  protein: 'белок', cholesterol: 'холестерин', selenium: 'селен', calcium: 'кальций',
  phosphorus: 'фосфор', acids: 'кислоты', acid: 'кислота', fatty: 'жирные',
  amino: 'амино', fiber: 'клетчатка', strained: 'протёртый', game: 'дичь',
  species: 'вид', solution: 'раствор', retail: 'розничный', crumbles: 'крошка',
  crinkle: 'фигурный', block: 'брусок', wild: 'дикий', deli: 'гастрономический',
  porterhouse: 'портерхаус', pink: 'розовый', soft: 'мягкий', cuts: 'куски',
  cut: 'нарезка', navel: 'пупочная часть', sea: 'морской', string: 'палочками',
  process: 'плавленый', caffeine: 'кофеин', aspartame: 'аспартам', medley: 'ассорти',
  animal: 'животный', grease: 'жир', moisture: 'влажность', measures: 'образцы',
  northern: 'северный', southern: 'южный', australian: 'австралийский', alaska: 'Аляска',
  native: 'традиционный', commercially: 'промышленно', producer: 'производитель',
  refrigerated: 'охлаждённый', granulated: 'гранулированный', unheated: 'ненагретый',
  calorie: 'калорийность', total: 'общий', distribution: 'распределение', program: 'программа',
  pimentos: 'пименто', volume: 'объём', junior: 'для детей', pure: 'чистый',
  old: 'старый', short: 'короткий', end: 'край', fast: 'быстрый', low: 'низкий',
  pummelo: 'помело', pomelo: 'помело',
})

const categoryNames: Record<string, string> = {
  'Beef Products': 'Говядина', 'Pork Products': 'Свинина', 'Lamb, Veal, and Game Products': 'Баранина, телятина и дичь',
  'Poultry Products': 'Птица', 'Finfish and Shellfish Products': 'Рыба и морепродукты', 'Dairy and Egg Products': 'Молочные продукты и яйца',
  'Vegetables and Vegetable Products': 'Овощи', 'Fruits and Fruit Juices': 'Фрукты и соки', 'Legumes and Legume Products': 'Бобовые',
  'Nut and Seed Products': 'Орехи и семена', 'Cereal Grains and Pasta': 'Крупы и паста', 'Baked Products': 'Хлеб и выпечка',
  'Fats and Oils': 'Жиры и масла', 'Beverages': 'Напитки', 'Soups, Sauces, and Gravies': 'Супы и соусы',
  'Sausages and Luncheon Meats': 'Колбасы и мясная нарезка', 'Sweets': 'Сладости', 'Snacks': 'Снеки',
  'Restaurant Foods': 'Готовые блюда', 'Fast Foods': 'Фастфуд', 'Baby Foods': 'Детское питание',
  'Breakfast Cereals': 'Сухие завтраки', 'Spices and Herbs': 'Специи и травы', 'American Indian/Alaska Native Foods': 'Традиционные продукты',
}

function escapeRegExp(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
function capitalize(value: string) { return value ? value[0].toLocaleUpperCase('ru-RU') + value.slice(1) : value }

function genderOf(name: string): Gender {
  const value = name.toLowerCase()
  if (/^(beans|peas|vegetables|fruits|nuts|seeds|berries|mushrooms|tomatoes|potatoes|carrots|oysters|mussels|shrimp|prunes|raisins|olives|pickles|grapes|strawberries|raspberries|blueberries|blackberries|cranberries|cherries|dates|figs|crackers|cookies|bananas|apples|pears|peaches|nectarines|apricots|plums|oranges|tangerines|lemons|limes|almonds|walnuts|peanuts|cashews|pistachios|pecans|hazelnuts|beans|lentils|noodles)\b/.test(value)) return 'p'
  if (/^(milk|buttermilk|oil|butter|egg|eggs|water|honey|sugar|chocolate|cocoa|cheese|yogurt|kefir|tofu|soup|stew|bread|flour|dough|wine|beer|coffee|tea|juice|applesauce|hummus)\b/.test(value)) {
    if (/^(milk|oil|butter|egg|water|honey|chocolate|wine|beer|coffee|juice|applesauce)\b/.test(value)) return 'n'
  }
  if (/^(pork|beef|veal|lamb|mutton|chicken|turkey|duck|goose|fish|salmon|tuna|cod|haddock|pollock|halibut|trout|herring|mackerel|tilapia|flounder|sole|pasta|spaghetti|rice|buckwheat|barley|rye|wheat|quinoa|millet|semolina|flour|cream|sausage|salami|bologna|mortadella|flour|water|soy|tuna)\b/.test(value)) return 'f'
  return 'm'
}

function adjective(key: string, gender: Gender, translated: string) {
  const selected = forms[key]
  if (selected) return selected[{ m: 0, f: 1, n: 2, p: 3 }[gender]]
  const suffix = { m: '', f: 'ая', n: 'ое', p: 'ые' }[gender]
  if (translated.endsWith('ый')) return `${translated.slice(0, -2)}${suffix}`
  return translated
}

function tidy(value: string) {
  return capitalize(value
    .replace(/\b(nfy|nf|proximates|meaures)\b/gi, ' ')
    .replace(/\s+([,;)])/g, '$1')
    .replace(/([(])\s+/g, '$1')
    .replace(/\(\s*\)/g, ' ')
    .replace(/,\s*,/g, ', ')
    .replace(/(?:,\s*){2,}/g, ', ')
    .replace(/\s+[-–]\s+/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[-,\s]+|[-,\s]+$/g, '')
    .trim())
}

export function localizeProductName(input: string) {
  let source = input.toLowerCase().replace(/&/g, ' and ').replace(/\s+/g, ' ').trim()
    .replace(/^beef, ground\b/, 'ground beef')
    .replace(/^pork, ground\b/, 'ground pork')
    .replace(/^chicken, ground\b/, 'ground chicken')
    .replace(/^turkey, ground\b/, 'ground turkey')
  source = source
    .replace(/^(?:[a-z]?\d+(?:,\s*)+)+[a-z]?\d+\s*-\s*/i, '')
    .replace(/^measures,\s*/i, '')
    .replace(/\s*\((?:[a-z]{2}\s*\d*\s*,?\s*)+\)/gi, ' ')
    .replace(/,?\s*-?\s*\b(?:nfy?|cy)[a-z0-9-]+\b/gi, '')
    .replace(/\b\d{2}[a-z](?:-\d{2,4})+(?:-[a-z]+)?\b/gi, '')
    .replace(/,\s*(?:regions?\s+\d+(?:\s+(?:and|&)\s+\d+)?|pass\s+\d+|animal\s+\d+|comp\s*\d*|pure composite|other|n\/a|yes|proximates|minerals|carotenoids|amino acids|fatty acids|fiber|vitamins?)(?=,|$)/gi, '')
    .replace(/,\s*(?:[a-z]{2}\d*(?:\/[a-z]{2}\d*)+|[a-z]{2}\d+)(?=,|$)/gi, '')
  if (/\b(fried|roasted|baked|boiled|braised|stewed|grilled|broiled|steamed|smoked)\b/.test(source)) {
    source = source.replace(/,\s*cooked(?=,|$)/g, '')
  }
  const gender = genderOf(source)
  let text = source
  for (const [english, russian] of Object.entries(phrases).sort((a, b) => b[0].length - a[0].length)) {
    text = text.replace(new RegExp(`\\b${escapeRegExp(english)}\\b`, 'gi'), russian)
  }
  text = text.replace(/[a-z]+(?:-[a-z]+)*/g, (token) => {
    if (token === 'or') return 'или'
    if (token === 'and') return 'и'
    if (forms[token]) return adjective(token, gender, '')
    return words[token] ?? token
  })
  // The phrase dictionary intentionally uses neutral forms; fix common cooking phrases after the main noun is known.
  const cooking: Record<string, string> = {
    'жареный на сковороде': adjective('fried', gender, '') + ' на сковороде',
    'запечённый в духовке': adjective('baked', gender, '') + ' в духовке',
    'приготовленный на пару': adjective('cooked', gender, '') + ' на пару',
  }
  for (const [from, to] of Object.entries(cooking)) text = text.replaceAll(from, to)
  return tidy(text)
}

export function categoryInRussian(category?: string | null) {
  return categoryNames[category ?? ''] ?? category ?? 'Продукты'
}

export function normalizeSearchText(value: string) {
  return value.toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е')
    .replace(/пожарен|жаренн/g, 'жарен')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function searchTextForProduct(name: string, nameRu: string, category?: string | null, originalName?: string) {
  const source = `${name} ${nameRu} ${originalName ?? ''}`.toLowerCase()
  const aliases: string[] = []
  const add = (pattern: RegExp, values: string) => { if (pattern.test(source)) aliases.push(values) }
  add(/\bpork\b|свинин/, 'свиной свиная свиное свиные')
  add(/\bbeef\b|говядин/, 'говяжий говяжья говяжье говяжьи')
  add(/\bchicken\b|куриц/, 'куриный куриная куриное куриные')
  add(/\bturkey\b|индейк/, 'индюшиный индюшатина')
  add(/\bpotato|картоф/, 'картошка')
  add(/\bbuckwheat|греч/, 'греча')
  add(/\bblueberr|голубик/, 'черника')
  add(/\bpummelo\b|\bpomelo\b|помело/, 'помело памело')
  add(/\bcottage cheese\b|творог/, 'творожок')
  add(/\bsalmon\b|лосось/, 'сёмга')
  add(/\btomatoes?\b|томат/, 'помидор помидоры')
  return normalizeSearchText(`${nameRu} ${name} ${originalName ?? ''} ${categoryInRussian(category)} ${aliases.join(' ')}`)
}

export function productEmoji(name: string, category?: string | null) {
  const value = `${name} ${category ?? ''}`.toLowerCase()
  const match = (pattern: string) => new RegExp(pattern, 'i').test(value)
  if (match('soy milk|соевое молоко|almond milk|миндальное молоко|oat milk|овсяное молоко')) return '🥛'
  if (match('banana|банан')) return '🍌'
  if (match('apple|яблок')) return '🍎'
  if (match('orange|апельсин|tangerine|мандарин|clementine')) return '🍊'
  if (match('strawberr|клубник')) return '🍓'
  if (match('blueberr|голубик')) return '🫐'
  if (match('raspberr|малин')) return '🫐'
  if (match('grape|виноград|raisin|изюм')) return '🍇'
  if (match('watermelon|арбуз')) return '🍉'
  if (match('melon|cantaloupe|дыня|honeydew')) return '🍈'
  if (match('peach|персик|nectarine|нектарин|apricot|абрикос')) return '🍑'
  if (match('pear|груш')) return '🍐'
  if (match('cherr|вишн')) return '🍒'
  if (match('kiwi|киви')) return '🥝'
  if (match('pineapple|ананас')) return '🍍'
  if (match('mango|манго')) return '🥭'
  if (match('lemon|лимон|lime|лайм')) return '🍋'
  if (match('coconut|кокос')) return '🥥'
  if (match('avocado|авокадо')) return '🥑'
  if (match('tomato|помидор')) return '🍅'
  if (match('carrot|морков')) return '🥕'
  if (match('sweet potato|батат')) return '🍠'
  if (match('potato|картоф|french fries')) return '🥔'
  if (match('broccoli|брокколи|cauliflower|цветная капуста')) return '🥦'
  if (match('cucumber|огур|\\bpickles?\\b|маринованные огур')) return '🥒'
  if (match('corn|кукуруз')) return '🌽'
  if (match('peas|горох|горошек')) return '🫛'
  if (match('beans|фасол|lentil|чечевиц|chickpea|нут|soy|соя|legume|бобов')) return '🫘'
  if (match('lettuce|салат|spinach|шпинат|kale|капуста|arugula|рукола|cabbage')) return '🥬'
  if (match('mushroom|гриб|shiitake')) return '🍄'
  if (match('garlic|чеснок')) return '🧄'
  if (match('onion|лук|shallot|leek')) return '🧅'
  if (match('pepper|перец|chili|чили')) return '🌶️'
  if (match('olive|олив')) return '🫒'
  if (match('peanut|арахис')) return '🥜'
  if (match('almond|миндаль|walnut|орех|cashew|кешью|pistach|фисташ|nut |nuts|seed|семен|кунжут|sesame|flax|chia')) return '🌰'
  if (match('poultry|chicken|куриц|turkey|индейк|duck|утка|goose|гусят')) return '🍗'
  if (match('shrimp|кревет|prawn|lobster|омар|crab|краб')) return '🍤'
  if (match('fish|рыб|salmon|лосось|tuna|тунец|cod|треска|haddock|пикша|pollock|минтай|trout|форель|herring|сельдь|mackerel|скумбр|tilapia|halibut|палтус')) return '🐟'
  if (match('oyster|устриц|mussel|миди|scallop|гребеш|clam|моллюск|squid|кальмар|octopus|осьминог|shellfish|морепродукт')) return '🦪'
  if (match('bacon|бекон|ham|ветчин|pork|свинин|beef|говядин|veal|телятин|lamb|баранин|mutton|venison|оленин|steak|стейк|meat|мяс|bologna|pepperoni|салями|sausage|колбас')) return '🥩'
  if (match('cheese|сыр|cheddar|чеддер|mozzarella|моцарелла|parmesan|пармезан|творог|cottage')) return '🧀'
  if (match('yogurt|йогурт|kefir|кефир|sour cream|сметан')) return '🥣'
  if (match('milk|молок|cream|сливк|buttermilk|пахта|dairy')) return '🥛'
  if (match('egg|яйц|яич|yolk|желток')) return '🥚'
  if (match('peanut butter|арахисовая паста')) return '🥜'
  if (match('butter|сливочное масло|margarine|маргарин')) return '🧈'
  if (match('rice|рис|buckwheat|гречк|quinoa|киноа|millet|пшено|bulgur|булгур|couscous|кускус')) return '🍚'
  if (match('pasta|паста|spaghetti|спагетти|macaroni|макарон|noodle|лапша|lasagna|лазанья')) return '🍝'
  if (match('bread|хлеб|bagel|бейгл|bun|булоч|roll|croissant|круассан|toast|тост|baked products')) return '🍞'
  if (match('pizza|пицц')) return '🍕'
  if (match('burger|бургер')) return '🍔'
  if (match('taco|тако')) return '🌮'
  if (match('burrito|буррито|enchilada|quesadilla')) return '🌯'
  if (match('sandwich|сэндвич')) return '🥪'
  if (match('salad|салат')) return '🥗'
  if (match('soup|суп|broth|бульон|stew|рагу|chowder')) return '🍲'
  if (match('sushi|суши|sashimi|сасими')) return '🍣'
  if (match('ice cream|морожен')) return '🍦'
  if (match('chocolate|шоколад')) return '🍫'
  if (match('cookie|печенье|biscuit|cracker|крекер')) return '🍪'
  if (match('cake|торт|cupcake|кекс|pie |пирог|muffin|маффин|pastry|выпечк')) return '🍰'
  if (match('candy|конфет|caramel|карамель|marshmallow|маршмеллоу|sweets|сладост')) return '🍬'
  if (match('honey|мёд|мед')) return '🍯'
  if (match('popcorn|попкорн')) return '🍿'
  if (match('coffee|кофе|espresso|капучино|латте')) return '☕'
  if (match('tea|чай|kombucha|комбуча')) return '🍵'
  if (match('juice|сок|nectar|нектар')) return '🧃'
  if (match('beer|пиво|ale |эль')) return '🍺'
  if (match('wine|вино')) return '🍷'
  if (match('vodka|водка|whisk|виски|rum|ром|gin|джин|tequila|текила|liqueur|ликёр')) return '🥃'
  if (match('beverage|напиток|soda|газировка|cola|кола|lemonade|лимонад|drink')) return '🥤'
  if (match('baby|infant|детск|смесь')) return '🍼'
  if (match('oil|масло|fat|жир')) return '🫗'
  if (match('salt|соль|spice|спец|herb|трав|basil|базилик|cinnamon|кориц|ginger|имбир')) return '🧂'
  if (match('canned|консерв')) return '🥫'
  if (match('cereal|хлопья|granola|гранола|muesli|мюсли|oats|овёс|овсян|grain|зерно')) return '🥣'
  return '🍽️'
}
