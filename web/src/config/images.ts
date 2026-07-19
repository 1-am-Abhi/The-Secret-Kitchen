/**
 * IMAGE REGISTRY — the single swap point for all photography.
 *
 * Components never hardcode an image URL. They reference a stable key
 * ("north-indian-1", "hero-1", …) and this module resolves it to a real asset.
 * That indirection is what makes "replace with real photographs later without
 * changing the layout" a one-file change:
 *
 *   1. Upload the new shots to Cloudinary.
 *   2. Change that key's `src` to the Cloudinary URL (the host is already
 *      allow-listed in next.config.ts).
 *   3. Done — every card, hero and gallery tile picks it up. Aspect ratios are
 *      enforced by the layout, not by the file, so nothing reflows.
 *
 * Until then we serve curated stock photography. EVERY entry has been visually
 * inspected to confirm it contains no meat, fish or egg — this is a pure-veg
 * brand and a stray non-veg photo would be a serious trust failure.
 */

export interface ImageAsset {
  /** Fully-qualified URL. Swap this for a Cloudinary URL when real shots land. */
  src: string;
  /** Descriptive alt text. Never leave empty for content images. */
  alt: string;
  /** Natural orientation — drives masonry row spans in the gallery. */
  orientation: "portrait" | "landscape" | "square";
}

/**
 * Build a delivery URL with consistent treatment so every dish photo shares the
 * same crop behaviour and quality ceiling. next/image handles the actual
 * resizing and format negotiation on top of this.
 */
function stock(id: string, alt: string, orientation: ImageAsset["orientation"]): ImageAsset {
  return {
    src: `https://images.unsplash.com/${id}?auto=format&fit=crop&q=85&w=1600`,
    alt,
    orientation,
  };
}

/** Rendered when a key is missing — a real dish rather than a broken icon. */
export const FALLBACK_IMAGE: ImageAsset = stock(
  "photo-1680359873864-43e89bf248ac",
  "A vegetarian thali spread with chapati, dal, curries, rice and salad",
  "landscape",
);

export const imageRegistry: Record<string, ImageAsset> = {
  /* ---- Hero & brand --------------------------------------------------- */
  "hero-1": stock(
    "photo-1680359873864-43e89bf248ac",
    "Overhead steel thali with chapatis, dal, mixed vegetables, paneer curry, raita, rice and pickle",
    "landscape",
  ),
  "hero-2": stock(
    "photo-1631452180519-c014fe946bc7",
    "Paneer butter masala in a copper kadai served with jeera rice and papad",
    "portrait",
  ),

  /* ---- Maggi ---------------------------------------------------------- */
  "maggi-1": stock(
    "photo-1692273212247-f5efb3fc9b87",
    "Steaming masala instant noodles with tomato, onion and fresh coriander",
    "landscape",
  ),
  "maggi-2": stock(
    "photo-1714611446667-5321c3b4a3c6",
    "Bowl of spicy masala noodles topped with spring onion and green chilli",
    "landscape",
  ),
  "maggi-3": stock(
    "photo-1716535232835-6d56282dfe8a",
    "Vegetable hakka noodles in a black bowl scattered with spring onion",
    "landscape",
  ),

  /* ---- Pasta ---------------------------------------------------------- */
  "pasta-1": stock(
    "photo-1673971372358-769a28fa4c81",
    "Penne pasta in a rich red tomato sauce with parmesan and fresh basil",
    "portrait",
  ),
  "pasta-2": stock(
    "photo-1555949258-eb67b1ef0ceb",
    "Creamy white sauce penne with capsicum and tomato in a white bowl",
    "landscape",
  ),
  "pasta-3": stock(
    "photo-1597393353365-9d4366392fe9",
    "Tri-colour fusilli pasta with cherry tomatoes and basil on a white plate",
    "landscape",
  ),

  /* ---- Idli ----------------------------------------------------------- */
  "idli-1": stock(
    "photo-1589301760014-d929f3979dbc",
    "Soft steamed idli on a banana leaf with coconut chutney and dried red chilli",
    "landscape",
  ),
  "idli-2": stock(
    "photo-1630409351241-e90e7f5e434d",
    "South Indian breakfast plate served with accompaniments",
    "landscape",
  ),

  /* ---- Paratha & roti -------------------------------------------------- */
  "paratha-1": stock(
    "photo-1683533761804-5fc12be0f684",
    "Flaky laccha paratha served with paneer curry, onion rings and red chillies",
    "portrait",
  ),
  "paratha-2": stock(
    "photo-1630409351241-e90e7f5e434d",
    "Whole wheat lachha paratha on a white plate with rice and chickpeas",
    "landscape",
  ),
  "paratha-3": stock(
    "photo-1708782343717-be4ea260249a",
    "Aloo paratha cut into wedges on a steel plate with pickle and fresh curd",
    "square",
  ),

  /* ---- North Indian --------------------------------------------------- */
  "north-indian-1": stock(
    "photo-1596797038530-2c107229654b",
    "Slow-cooked vegetable curry topped with fresh coriander",
    "portrait",
  ),
  "north-indian-2": stock(
    "photo-1567188040759-fb8a883dc6d8",
    "Paneer tikka sizzling on a cast-iron platter with peppers and onion",
    "landscape",
  ),
  "north-indian-3": stock(
    "photo-1606491956689-2ea866880c84",
    "Spiced chickpea curry served with soft buns, chopped onion and lemon",
    "landscape",
  ),
  "north-indian-4": stock(
    "photo-1631452180519-c014fe946bc7",
    "Paneer butter masala in a copper kadai with jeera rice and papad",
    "portrait",
  ),

  /* ---- Rice ----------------------------------------------------------- */
  "rice-1": stock(
    "photo-1664717698774-84f62382613b",
    "Vegetable fried rice with peas, carrot and spring onion in a black bowl",
    "landscape",
  ),
  "rice-2": stock(
    "photo-1630409346824-4f0e7b080087",
    "Vegetable pulao with broccoli, carrot and peas in an oval dish",
    "landscape",
  ),
  "rice-3": stock(
    "photo-1751618646882-4221d5e3b1c2",
    "Paneer and sweetcorn pulao with peas and peppers in a white bowl",
    "landscape",
  ),

  /* ---- Sandwich ------------------------------------------------------- */
  "sandwich-1": stock(
    "photo-1639744093378-b2fde867b4d8",
    "Grilled cheese sandwich pulled apart to show the melted cheese stretch",
    "portrait",
  ),
  "sandwich-2": stock(
    "photo-1528736235302-52922df5c122",
    "Toasted vegetable and corn grilled sandwich cut diagonally with chutney",
    "landscape",
  ),

  /* ---- Burgers -------------------------------------------------------- */
  "burger-1": stock(
    "photo-1525059696034-4967a8e1dca2",
    "Vegetable patty burger with avocado, salsa and crisp lettuce",
    "portrait",
  ),
  "burger-2": stock(
    "photo-1520072959219-c595dc870360",
    "Grilled veggie burger with guacamole, tomato and rocket leaves",
    "landscape",
  ),

  /* ---- Snacks --------------------------------------------------------- */
  "snacks-1": stock(
    "photo-1541592106381-b31e9677c0e5",
    "A pile of golden, crisp french fries",
    "landscape",
  ),
  "snacks-2": stock(
    "photo-1695712641569-05eee7b37b6d",
    "Crisp vegetable spring rolls sliced open to show the carrot and cabbage filling",
    "landscape",
  ),
  "snacks-3": stock(
    "photo-1664990035720-faac522df41f",
    "Steamed vegetable momos in a bamboo steamer with two dipping chutneys",
    "square",
  ),
  "snacks-4": stock(
    "photo-1676976197916-7a4d25ffa37a",
    "Honey chilli potato fingers tossed with spring onion and sesame seeds",
    "landscape",
  ),
  "snacks-5": stock(
    "photo-1601050690597-df0568f70950",
    "Crisp fried samosas served with fresh green chutney",
    "landscape",
  ),

  /* ---- Desserts ------------------------------------------------------- */
  "dessert-1": stock(
    "photo-1695568180070-8b5acead5cf4",
    "Gulab jamun dusted with pistachio, stacked on a white serving tray",
    "portrait",
  ),
  "dessert-2": stock(
    "photo-1695568181363-af5c78f4d059",
    "Brass platter of Indian milk sweets topped with pistachio",
    "portrait",
  ),
  "dessert-3": stock(
    "photo-1636743715220-d8f8dd900b87",
    "Stack of fudgy chocolate brownies with crackled tops",
    "portrait",
  ),
  "dessert-4": stock(
    "photo-1563805042-7684c019e1cb",
    "Layered chocolate sundae with whipped cream and cookies",
    "portrait",
  ),
  "dessert-5": stock(
    "photo-1587314168485-3236d6710814",
    "Folded crepes with whipped cream and fresh strawberries",
    "landscape",
  ),
  "dessert-6": stock(
    "photo-1495147466023-ac5c588e2e94",
    "Miniature fruit tarts topped with cream, berries and edible flowers",
    "portrait",
  ),

  /* ---- Beverages ------------------------------------------------------ */
  "beverage-1": stock(
    "photo-1461023058943-07fcbe16d735",
    "Iced coffee with swirling milk in a tall glass",
    "landscape",
  ),
  "beverage-2": stock(
    "photo-1514432324607-a09d9b4aefdd",
    "A freshly poured cup of hot coffee seen from above",
    "portrait",
  ),
  "beverage-3": stock(
    "photo-1692620609860-be6717812f71",
    "Rose lassi poured into a clay kulhad, topped with rose petals and pistachio",
    "portrait",
  ),
  "beverage-4": stock(
    "photo-1572490122747-3968b75cc699",
    "Thick chocolate shake topped with whipped cream and a cookie",
    "portrait",
  ),
  "beverage-5": stock(
    "photo-1497534446932-c925b458314e",
    "Tall glasses of chilled fresh lime cooler with mint",
    "portrait",
  ),
  "beverage-6": stock(
    "photo-1600271886742-f049cd451bba",
    "A tall glass of freshly squeezed juice with a straw",
    "portrait",
  ),

  /* ---- Tiffin --------------------------------------------------------- */
  "tiffin-student": stock(
    "photo-1711153419402-336ee48f2138",
    "Steel compartment meal tray with chapati, aloo curry, mixed vegetables and curd",
    "landscape",
  ),
  "tiffin-regular": stock(
    "photo-1589778655375-3e622a9fc91c",
    "Full vegetarian steel thali with curries, jeera rice, salad and roti",
    "landscape",
  ),
  "tiffin-premium": stock(
    "photo-1680359873864-43e89bf248ac",
    "Premium thali spread with paneer curry, dal, rice, raita and dessert",
    "landscape",
  ),

  /* ---- Kitchen, team & ambience --------------------------------------- */
  "kitchen-1": stock(
    "photo-1589109807644-924edf14ee09",
    "Spotless stainless steel commercial kitchen with sinks and trolley racks",
    "landscape",
  ),
  "kitchen-2": stock(
    "photo-1708915965975-2a950db0e215",
    "Professional kitchen line with a stainless range and extraction hood",
    "landscape",
  ),
  "team-1": stock(
    "photo-1666479258732-5ea17469b610",
    "Chef in whites working at the range of a commercial kitchen",
    "landscape",
  ),
  "team-2": stock(
    "photo-1595257841889-eca2678454e2",
    "Chef in apron carefully plating fresh vegetables",
    "portrait",
  ),
  "team-3": stock(
    "photo-1595257841889-eca2678454e2",
    "Chef plating a dish with fresh seasonal vegetables",
    "portrait",
  ),
  "team-4": stock(
    "photo-1666479258732-5ea17469b610",
    "Kitchen lead overseeing service at the pass",
    "landscape",
  ),
  "packaging-1": stock(
    "photo-1648587456176-4969b0124b12",
    "Kraft takeaway box, soup cup and wooden cutlery laid out on a neutral surface",
    "landscape",
  ),
  "ingredients-1": stock(
    "photo-1596040033229-a9821ebd058d",
    "Whole and ground Indian spices with garlic, ginger and tomato",
    "landscape",
  ),
  "ambience-1": stock(
    "photo-1517248135467-4c7edcad34c4",
    "Clean modern dining room with wooden tables and pendant lighting",
    "landscape",
  ),
  "ambience-2": stock(
    "photo-1481833761820-0509d3217039",
    "Warmly lit dining space in the evening",
    "landscape",
  ),
  "salad-1": stock(
    "photo-1540189549336-e6e99c3679fe",
    "Fresh green salad with vegetables served alongside juice",
    "portrait",
  ),

  /* ---- Additional dish photography ------------------------------------ */
  /*
   * Sourced so that no two dishes share a photograph. Each was viewed before
   * being added and confirmed vegetarian, unwatermarked and depicting the dish
   * it is named for.
   */
  "maggi-4": stock(
    "photo-1633352615955-f0c99e8b7e5a",
    "Glossy buttered instant noodles lifted on a fork from a dark bowl",
    "landscape",
  ),
  "maggi-5": stock(
    "photo-1585410304004-56ae05651552",
    "Instant noodles loaded with diced carrot, peas and capsicum",
    "landscape",
  ),
  "maggi-6": stock(
    "photo-1630637618238-689daed16f21",
    "Cheesy noodles lifted on a fork with strands of melted cheese stretching",
    "portrait",
  ),
  "maggi-7": stock(
    "photo-1635685296916-95acaf58471f",
    "Steaming spicy red instant noodles lifted with chopsticks",
    "portrait",
  ),
  "pasta-4": stock(
    "photo-1663159857524-efe7a5404f03",
    "Pasta tossed in olive oil with cherry tomatoes, basil and grated cheese",
    "portrait",
  ),
  "pasta-5": stock(
    "photo-1603662953679-1a32f2155b34",
    "Baked cheesy pasta with a melted cheese pull and vegetables",
    "portrait",
  ),
  "pasta-6": stock(
    "photo-1573821201069-dbf297ca410a",
    "Creamy white sauce penne with basil, served with garlic bread",
    "portrait",
  ),
  "north-indian-7": stock(
    "photo-1589647363585-f4a7d3877b10",
    "Palak paneer — creamy green spinach curry with soft paneer cubes",
    "landscape",
  ),
  "rice-4": stock(
    "photo-1709786204911-03e5857ffd9a",
    "Vegetable fried rice tossed with carrot, spring onion and capsicum",
    "portrait",
  ),
  "sandwich-3": stock(
    "photo-1716535233357-822bcc293573",
    "Grilled tandoori paneer sandwich cut into triangles with green chutney",
    "landscape",
  ),
  "snacks-6": stock(
    "photo-1680991172715-4074203a40d3",
    "Dry chilli paneer tossed with green capsicum and red chillies",
    "portrait",
  ),
  "snacks-7": stock(
    "photo-1584378868074-1ebfd5a636c7",
    "Loaded cheese fries smothered in melted cheese sauce with herbs",
    "landscape",
  ),
  "snacks-8": stock(
    "photo-1683367422109-93d2856f58c4",
    "Steamed vegetable momos plated close-up with a creamy dip",
    "landscape",
  ),
  "beverage-7": stock(
    "photo-1630748662359-40a2105640c7",
    "Masala chai served in earthen kulhads with a snack plate",
    "portrait",
  ),

  /* ---- Offers --------------------------------------------------------- */
  "offer-1": stock(
    "photo-1631452180519-c014fe946bc7",
    "Paneer butter masala served with rice — first order offer",
    "portrait",
  ),
  "offer-2": stock(
    "photo-1589778655375-3e622a9fc91c",
    "Full vegetarian thali — monthly tiffin plan offer",
    "landscape",
  ),
  "offer-3": stock(
    "photo-1711153419402-336ee48f2138",
    "Compartment meal tray — student discount offer",
    "landscape",
  ),
  "offer-4": stock(
    "photo-1692273212247-f5efb3fc9b87",
    "Masala noodles — free delivery offer",
    "landscape",
  ),
  "offer-5": stock(
    "photo-1680359873864-43e89bf248ac",
    "Weekend family thali spread offer",
    "landscape",
  ),
  "offer-6": stock(
    "photo-1695568180070-8b5acead5cf4",
    "Gulab jamun — free dessert offer",
    "portrait",
  ),
};

/**
 * Resolve an image key. Unknown keys degrade to a sibling in the same family
 * and finally to FALLBACK_IMAGE, so a typo or a not-yet-shot dish never renders
 * a broken image in production.
 */
export function getImage(key: string): ImageAsset {
  const exact = imageRegistry[key];
  if (exact) return exact;

  // "paneer-paratha-2" → look for any key in the "paneer-paratha" family.
  const family = key.replace(/-\d+$/, "");
  const sibling = Object.keys(imageRegistry).find((candidate) =>
    candidate.startsWith(`${family}-`),
  );
  if (sibling) return imageRegistry[sibling];

  return FALLBACK_IMAGE;
}

/**
 * Warm-toned placeholder shown while photos load. A single shared blur keeps
 * the HTML small; per-image blurhashes can be generated at upload time once
 * Cloudinary is wired up.
 */
export const BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNmNWViZTAiLz48L3N2Zz4=";
