-- ============================================================================
-- GREEN WILD ZOO — SEED DATA
-- Safe to re-run: uses fixed UUIDs / unique codes with ON CONFLICT guards.
-- Run AFTER migrations 0001-0004.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- CATEGORIES
-- ---------------------------------------------------------------------------
insert into animal_categories (id, name, khmer_name, slug, icon, sort_order) values
 ('10000000-0000-0000-0000-000000000001','Mammals','ថនិកសត្វ','mammals','🦁',1),
 ('10000000-0000-0000-0000-000000000002','Birds','បក្សី','birds','🦜',2),
 ('10000000-0000-0000-0000-000000000003','Reptiles','សត្វលូន','reptiles','🐍',3),
 ('10000000-0000-0000-0000-000000000004','Aquatic','សត្វទឹក','aquatic','🐠',4),
 ('10000000-0000-0000-0000-000000000005','Insects','សត្វល្អិត','insects','🦋',5),
 ('10000000-0000-0000-0000-000000000006','Amphibians','សត្វស្រកូក','amphibians','🐸',6)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- SPECIES
-- ---------------------------------------------------------------------------
insert into species (id, category_id, common_name, khmer_name, scientific_name, conservation_status, description, habitat_description) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','African Lion','សិង្ហអាហ្រ្វិក','Panthera leo','Vulnerable',
   'The lion is the only truly social wild cat. It lives in family groups called prides, made up of related females, their cubs and a small coalition of males. Adult males weigh about 150–250 kg and females 110–180 kg. Lions rest for up to 20 hours a day and do most of their hunting at dusk and at night, usually working together as a team. In the wild they live 10–14 years, and often more than 20 years in human care. Lion numbers have fallen sharply over the last century because of habitat loss and conflict with people, and the IUCN lists the species as Vulnerable.',
   'Savannas and grasslands of sub-Saharan Africa'),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','White Tiger','ខ្លាសខ','Panthera tigris tigris','Endangered',
   'A white tiger is a Bengal tiger, not a separate species. Its pale coat and blue eyes come from a rare recessive gene (SLC45A2) that reduces orange pigment, and both parents must carry the gene. No white tigers are known to live in the wild today; the last confirmed wild sighting in India was in 1958. Tigers are the largest cats in the world — females weigh about 100–160 kg and males 180–260 kg. Unlike most cats, tigers love water and are strong swimmers. Every tiger has a unique stripe pattern. Only about 3,700–5,600 tigers remain in the wild, and the species is listed as Endangered by the IUCN.',
   'Tropical and subtropical forests and grasslands of South and Southeast Asia'),
 ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','Asian Elephant','ដំរីអាស៊ី','Elephas maximus','Endangered',
   'The Asian elephant is the largest land animal in Asia, weighing about 3,000–5,000 kg and standing up to 3 m tall at the shoulder. It has smaller, rounded ears than the African elephant, and only some males grow tusks. An adult eats up to 150 kg of grass, leaves, bark and fruit a day and drinks around 100 litres of water. Elephants have the longest pregnancy of any mammal — about 22 months — and live around 60 years. Cambodia is home to a small wild population in the Cardamom Mountains and the Eastern Plains, including Mondulkiri. The species is Endangered, mainly because of habitat loss and conflict with people.',
   'Forests and grasslands of South and Southeast Asia, including Cambodia'),
 ('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','Giraffe','សត្វស្តោក','Giraffa camelopardalis','Vulnerable',null,null),
 ('20000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001','Red Panda','ប៉ាண្តាក្រហម','Ailurus fulgens','Endangered',null,null),
 ('20000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000002','Scarlet Macaw','ចាដមមរកតកែវ','Ara macao','Least Concern',null,null),
 ('20000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000002','Greater Flamingo','ក្រៀលធំ','Phoenicopterus roseus','Least Concern',null,null),
 ('20000000-0000-0000-0000-000000000008','10000000-0000-0000-0000-000000000002','Peacock','ក្រែក','Pavo cristatus','Least Concern',null,null),
 ('20000000-0000-0000-0000-000000000009','10000000-0000-0000-0000-000000000003','Saltwater Crocodile','ក្រពើទឹកប្រៃ','Crocodylus porosus','Least Concern',null,null),
 ('20000000-0000-0000-0000-000000000010','10000000-0000-0000-0000-000000000004','Blacktip Reef Shark','ត្រីឆ្លាមថ្មប្រះខ្មៅ','Carcharhinus melanopterus','Near Threatened',null,null)
on conflict (id) do update set
  scientific_name = excluded.scientific_name,
  conservation_status = excluded.conservation_status,
  description = coalesce(excluded.description, species.description),
  habitat_description = coalesce(excluded.habitat_description, species.habitat_description);

-- ---------------------------------------------------------------------------
-- MAP, ZONES, HABITATS, ENCLOSURES
-- ---------------------------------------------------------------------------
insert into zoo_maps (id, name) values
 ('30000000-0000-0000-0000-000000000000','Green Wild Zoo Map')
on conflict (id) do nothing;

-- Coordinates are % of the map box and are placed on dry land / beside the
-- paths of the built-in illustrated map (src/components/visitor/ZooMapArtwork.tsx).
insert into zoo_zones (id, map_id, code, name, khmer_name, color, map_x, map_y) values
 ('31000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000000','A','Zone A - Mammals','តំបន់ A','#F4A340',22,50),
 ('31000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000000','B','Zone B - Birds','តំបន់ B','#3B82F6',67,29),
 ('31000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000000','C','Zone C - Reptiles','តំបន់ C','#EF4444',71,63),
 ('31000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000000','D','Zone D - Aquarium','តំបន់ D','#7C3AED',40,71)
on conflict (id) do update set map_x = excluded.map_x, map_y = excluded.map_y;

insert into habitats (id, zone_id, name, khmer_name, map_x, map_y) values
 ('32000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','Lion Habitat','ទីជម្រកសិង្ហ',27,40),
 ('32000000-0000-0000-0000-000000000002','31000000-0000-0000-0000-000000000001','Tiger Habitat','ទីជម្រកខ្លា',18,58),
 ('32000000-0000-0000-0000-000000000003','31000000-0000-0000-0000-000000000001','Elephant Habitat','ទីជម្រកដំរី',28,62),
 ('32000000-0000-0000-0000-000000000004','31000000-0000-0000-0000-000000000001','Savanna Habitat','ទីជម្រកសាវ៉ាណា',36,24),
 ('32000000-0000-0000-0000-000000000005','31000000-0000-0000-0000-000000000001','Red Panda Grove','ព្រៃប៉ាន់ដា',16,42),
 ('32000000-0000-0000-0000-000000000006','31000000-0000-0000-0000-000000000002','Tropical Aviary','សួនបក្សីត្រូពិច',60,24),
 ('32000000-0000-0000-0000-000000000007','31000000-0000-0000-0000-000000000002','Flamingo Lagoon','ស្រះក្រៀល',59,56),
 ('32000000-0000-0000-0000-000000000008','31000000-0000-0000-0000-000000000003','Reptile House','ផ្ទះសត្វលូន',76,66)
on conflict (id) do update set map_x = excluded.map_x, map_y = excluded.map_y;

insert into enclosures (id, habitat_id, code, name, map_x, map_y) values
 ('33000000-0000-0000-0000-000000000001','32000000-0000-0000-0000-000000000001','A-03','Lion Enclosure',27,40),
 ('33000000-0000-0000-0000-000000000002','32000000-0000-0000-0000-000000000002','A-05','Tiger Enclosure',18,58),
 ('33000000-0000-0000-0000-000000000003','32000000-0000-0000-0000-000000000003','A-01','Elephant Yard',28,62),
 ('33000000-0000-0000-0000-000000000004','32000000-0000-0000-0000-000000000004','A-07','Giraffe Savanna',36,24),
 ('33000000-0000-0000-0000-000000000005','32000000-0000-0000-0000-000000000005','A-09','Red Panda Enclosure',16,42),
 ('33000000-0000-0000-0000-000000000006','32000000-0000-0000-0000-000000000006','B-02','Macaw Aviary',60,24),
 ('33000000-0000-0000-0000-000000000007','32000000-0000-0000-0000-000000000007','B-05','Flamingo Pond',59,56),
 ('33000000-0000-0000-0000-000000000008','32000000-0000-0000-0000-000000000006','B-01','Peacock Garden',74,22),
 ('33000000-0000-0000-0000-000000000009','32000000-0000-0000-0000-000000000008','C-03','Crocodile Pool',76,66),
 ('33000000-0000-0000-0000-000000000010','32000000-0000-0000-0000-000000000008','D-08','Shark Aquarium',46,68)
on conflict (id) do update set map_x = excluded.map_x, map_y = excluded.map_y;

-- ---------------------------------------------------------------------------
-- ANIMALS
-- ---------------------------------------------------------------------------
insert into animals (id, animal_code, name, khmer_name, species_id, category_id, gender, date_of_birth, place_of_birth, arrival_date, biography, personality, favorite_food, favorite_activities, interesting_facts, care_information, main_image_url) values
 ('40000000-0000-0000-0000-000000000001','LION-A-001','KOMA','កូម៉ា','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','male','2020-03-12','Phnom Penh Zoo','2022-06-15',
   'KOMA was born at Phnom Penh Zoo in March 2020 and moved to Green Wild Zoo in June 2022. His thick golden-and-dark mane began growing at around one year old and filled out by age four — a darker mane is a sign of a healthy, mature male. Like wild lions, KOMA spends most of the day resting in the shade and becomes much more active in the cool late afternoon, when he patrols his territory and scent-marks the boundaries of his enclosure.',
   'Calm & confident','Beef, chicken and bones (a lion eats about 5–7 kg of meat a day)','Resting in the shade, patrolling at dusk, roaring in the early morning',
   'Lions are the only cats that live in social groups called prides. A lion''s roar can be heard up to 8 km away. Lions can sleep or rest up to 20 hours a day. Each lion''s whisker-spot pattern is unique, like a fingerprint.',
   'Fed once a day with one fasting day each week, as lions in the wild do not eat every day. Keepers hide food and scent trails to encourage natural hunting behaviour, and a vet checks him every month.',
   '/animals/koma-1.jpg'),
 ('40000000-0000-0000-0000-000000000002','TIGER-A-002','LUNA','លូណា','20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','female','2021-05-02','Green Wild Zoo','2021-05-02',
   'LUNA was born right here at Green Wild Zoo in May 2021. Her white coat with chocolate-brown stripes and ice-blue eyes make her one of the most photographed animals in the park. Like all tigers she loves water — on hot afternoons she can often be found lying in her pool with only her head above the surface. She is most active in the early morning and around feeding time.',
   'Playful & curious','Beef, chicken and rabbit (an adult tiger eats about 5–6 kg of meat a day)','Swimming in her pool, stalking enrichment toys, scratching her log',
   'White tigers are Bengal tigers, not a separate species — the white colour comes from a rare recessive gene. Every tiger has a unique stripe pattern, and the stripes are on its skin as well as its fur. Tigers are strong swimmers and can cross rivers several kilometres wide.',
   'Her enclosure has a deep pool for cooling, climbing logs and dense planting for privacy. Keepers use positive-reinforcement training so she can take part in her own health checks calmly.',
   '/animals/luna-1.jpg'),
 ('40000000-0000-0000-0000-000000000003','ELEP-A-003','MILO','មីឡូ','20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','male','2014-01-20','Mondulkiri Sanctuary','2018-09-10',
   'MILO came to us in 2018 from a wildlife sanctuary in Mondulkiri, the province in eastern Cambodia that is home to one of the country''s last wild elephant herds. He is the gentle giant of Zone A. MILO spends up to 16 hours a day eating, and his favourite part of the day is his afternoon bath, when he sprays water — and then dust — over his back to protect his skin from the sun and insects.',
   'Gentle & social','Grass, hay, banana plants, sugarcane and fruit (up to 150 kg of food and about 100 litres of water a day)','Bathing, dust-bathing, foraging with his trunk',
   'An elephant''s trunk has about 40,000 muscles and can pick up something as small as a peanut. Elephants can recognise themselves in a mirror, a sign of self-awareness shared by very few animals. They talk to each other with low rumbles that can travel several kilometres.',
   'Keepers check and trim MILO''s feet every day, as foot health is very important for elephants. Protected-contact training lets keepers care for him safely without riding or chains.',
   '/animals/milo-1.jpg'),
 ('40000000-0000-0000-0000-000000000004','GIRA-A-004','NALA','ណាឡា','20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','female','2019-07-08','Green Wild Zoo','2019-07-08',
   'NALA was born at Green Wild Zoo and is the tallest animal in our savanna habitat, often seen reaching for leaves at the top of her feeding station.',
   'Gentle & alert','Acacia leaves, carrots','Browsing tall feeders, standing near the savanna fence line',
   'A giraffe''s tongue can be up to 50cm long and is dark blue-black to prevent sunburn while browsing.',
   'Specialized tall feeding stations replicate natural browsing height.',
   null),
 ('40000000-0000-0000-0000-000000000005','PAND-A-005','TIKO','ទីកូ','20000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001','male','2022-04-14','Chengdu Base','2023-02-01',
   'TIKO joined us as part of a regional conservation exchange program and has settled well into his forested enclosure.',
   'Shy & independent','Bamboo shoots, apples','Resting in trees, foraging in the afternoon',
   'Despite the name, red pandas are not closely related to giant pandas — they belong to their own unique family.',
   'Enclosure temperature is monitored closely as red pandas are sensitive to heat.',
   null),
 ('40000000-0000-0000-0000-000000000006','MACW-B-006','RIO','រីអូ','20000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000002','male','2019-11-30','Green Wild Zoo','2019-11-30',
   'RIO is one of the most talkative residents of the Tropical Aviary and loves greeting visitors with a squawk.',
   'Chatty & bold','Seeds, tropical fruit','Flying between perches, mimicking sounds',
   'Scarlet macaws can live over 50 years and mate for life.',
   'Daily flight enrichment in the aviary''s open airspace.',
   null),
 ('40000000-0000-0000-0000-000000000007','FLAM-B-007','MAYA','ម៉ាយ៉ា','20000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000002','female','2020-06-18','Green Wild Zoo','2020-06-18',
   'MAYA leads the flamingo flock at Flamingo Lagoon and is easy to spot thanks to her especially vivid pink plumage.',
   'Social & graceful','Shrimp, algae-based feed','Wading, preening, flock displays at dusk',
   'A flamingo''s pink color comes directly from pigments in the shrimp and algae it eats.',
   'Flock housed together to encourage natural social behavior.',
   null),
 ('40000000-0000-0000-0000-000000000008','PEAC-B-008','SKY','ស្កាយ','20000000-0000-0000-0000-000000000008','10000000-0000-0000-0000-000000000002','male','2021-09-05','Green Wild Zoo','2021-09-05',
   'SKY struts through Peacock Garden and is famous among visitors for his full tail display during the morning hours.',
   'Proud & showy','Grains, insects, greens','Displaying tail feathers, foraging in the garden',
   'A peacock''s train contains over 150 feathers and can be fanned into a half-circle for courtship displays.',
   'Free-roaming within the garden''s secured perimeter.',
   null),
 ('40000000-0000-0000-0000-000000000009','CROC-C-009','COCO','កូកូ','20000000-0000-0000-0000-000000000009','10000000-0000-0000-0000-000000000003','female','2010-02-14','Tonle Sap Region','2015-03-20',
   'COCO is one of the oldest residents at Green Wild Zoo and rules the Crocodile Pool with quiet confidence.',
   'Calm & patient','Whole fish','Basking on the platform, submerging for long periods',
   'Crocodiles can hold their breath underwater for over an hour when resting.',
   'Water quality and basking temperature are monitored around the clock.',
   null),
 ('40000000-0000-0000-0000-000000000010','SHRK-D-010','FINN','ហ្វិន','20000000-0000-0000-0000-000000000010','10000000-0000-0000-0000-000000000004','male','2017-08-22','Marine Conservation Center','2020-01-11',
   'FINN glides through the Shark Aquarium and is a highlight of the aquatic zone, especially during feeding demonstrations.',
   'Alert & fast','Small fish','Circling the reef structure, feeding demonstrations',
   'Blacktip reef sharks are usually harmless to humans and prefer shallow coastal reefs.',
   'Water salinity and temperature closely replicate natural reef conditions.',
   null)
on conflict (id) do update set
  biography = excluded.biography,
  favorite_food = excluded.favorite_food,
  favorite_activities = excluded.favorite_activities,
  interesting_facts = excluded.interesting_facts,
  care_information = excluded.care_information,
  main_image_url = coalesce(animals.main_image_url, excluded.main_image_url);

-- Gallery photos (files in public/animals/, credits in public/animals/CREDITS.json
-- and shown on the /credits page — all CC BY / CC BY-SA licensed from Wikimedia Commons)
insert into animal_photos (id, animal_id, image_url, caption, sort_order) values
 ('41000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','/animals/koma-1.jpg','Resting in the golden grass · Photo: Kevin Pluck, CC BY 2.0',1),
 ('41000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001','/animals/koma-2.jpg','Keeping watch · Photo: ragesoss, CC BY-SA 2.0',2),
 ('41000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000001','/animals/koma-3.jpg','Afternoon nap · Photo: rdoroshenko, CC BY 2.0',3),
 ('41000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000002','/animals/luna-1.jpg','On her favourite log · Photo: Basile Morin, CC BY-SA 4.0',1),
 ('41000000-0000-0000-0000-000000000005','40000000-0000-0000-0000-000000000002','/animals/luna-2.jpg','Tigers love to swim · Photo: Basile Morin, CC BY-SA 4.0',2),
 ('41000000-0000-0000-0000-000000000006','40000000-0000-0000-0000-000000000002','/animals/luna-3.jpg','A big yawn · Photo: Basile Morin, CC BY-SA 4.0',3),
 ('41000000-0000-0000-0000-000000000007','40000000-0000-0000-0000-000000000003','/animals/milo-1.jpg','An adult male Asian elephant · Photo: Yathin S Krishnappa, CC BY-SA 3.0',1),
 ('41000000-0000-0000-0000-000000000008','40000000-0000-0000-0000-000000000003','/animals/milo-2.jpg','Dust-bathing time · Photo: Mike Peel, CC BY-SA 4.0',2)
on conflict (id) do update set image_url = excluded.image_url, caption = excluded.caption, sort_order = excluded.sort_order;

-- Family relationships (NALA's example family tree used in mockups)
insert into animal_relationships (animal_id, related_animal_id, relationship_type) values
 ('40000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000001','sibling')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- CURRENT LOCATIONS
-- ---------------------------------------------------------------------------
insert into animal_locations (animal_id, zone_id, habitat_id, enclosure_id, map_x, map_y, is_current) values
 ('40000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','32000000-0000-0000-0000-000000000001','33000000-0000-0000-0000-000000000001',27,40,true),
 ('40000000-0000-0000-0000-000000000002','31000000-0000-0000-0000-000000000001','32000000-0000-0000-0000-000000000002','33000000-0000-0000-0000-000000000002',18,58,true),
 ('40000000-0000-0000-0000-000000000003','31000000-0000-0000-0000-000000000001','32000000-0000-0000-0000-000000000003','33000000-0000-0000-0000-000000000003',28,62,true),
 ('40000000-0000-0000-0000-000000000004','31000000-0000-0000-0000-000000000001','32000000-0000-0000-0000-000000000004','33000000-0000-0000-0000-000000000004',36,24,true),
 ('40000000-0000-0000-0000-000000000005','31000000-0000-0000-0000-000000000001','32000000-0000-0000-0000-000000000005','33000000-0000-0000-0000-000000000005',16,42,true),
 ('40000000-0000-0000-0000-000000000006','31000000-0000-0000-0000-000000000002','32000000-0000-0000-0000-000000000006','33000000-0000-0000-0000-000000000006',60,24,true),
 ('40000000-0000-0000-0000-000000000007','31000000-0000-0000-0000-000000000002','32000000-0000-0000-0000-000000000007','33000000-0000-0000-0000-000000000007',59,56,true),
 ('40000000-0000-0000-0000-000000000008','31000000-0000-0000-0000-000000000002','32000000-0000-0000-0000-000000000006','33000000-0000-0000-0000-000000000008',74,22,true),
 ('40000000-0000-0000-0000-000000000009','31000000-0000-0000-0000-000000000003','32000000-0000-0000-0000-000000000008','33000000-0000-0000-0000-000000000009',76,66,true),
 ('40000000-0000-0000-0000-000000000010','31000000-0000-0000-0000-000000000004','32000000-0000-0000-0000-000000000008','33000000-0000-0000-0000-000000000010',46,68,true)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- STORYBOOK (KOMA as the flagship example)
-- ---------------------------------------------------------------------------
insert into animal_stories (id, animal_id, title, description, is_published) values
 ('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','KOMA''s Story','The story of our African Lion, KOMA', true)
on conflict (id) do nothing;

insert into story_pages (story_id, page_number, title, content) values
 ('50000000-0000-0000-0000-000000000001',1,'Meet KOMA','KOMA is a proud African Lion who calls Green Wild Zoo home. With his golden mane and calm gaze, he is one of the most beloved animals in Zone A.'),
 ('50000000-0000-0000-0000-000000000001',2,'KOMA''s Birth','KOMA was born on 12 March 2020 at Phnom Penh Zoo, the first cub of his pride that year.'),
 ('50000000-0000-0000-0000-000000000001',3,'Growing Up','As a young cub, KOMA loved to play with his littermates and practice his roar, though it took time to sound as mighty as it does today.'),
 ('50000000-0000-0000-0000-000000000001',4,'Life at the Zoo','KOMA arrived at Green Wild Zoo in June 2022. He quickly settled into the Lion Habitat, where keepers noticed his calm and confident personality.'),
 ('50000000-0000-0000-0000-000000000001',5,'Food & Activities','Each day, KOMA enjoys a diet of beef and enrichment feeding sessions that encourage his natural hunting instincts.'),
 ('50000000-0000-0000-0000-000000000001',6,'Interesting Facts','Did you know a lion''s roar can be heard up to 8 kilometers away? KOMA''s roar can be heard across most of Zone A!')
on conflict (story_id, page_number) do nothing;

-- ---------------------------------------------------------------------------
-- AUDIO GUIDES (metadata; audio_url left null until real files are uploaded
-- via Admin > Audio Management or a TTS provider is configured)
-- ---------------------------------------------------------------------------
insert into audio_guides (animal_id, language, voice_type, duration_seconds, transcript, is_active) values
 ('40000000-0000-0000-0000-000000000001','km','female',200,'កូម៉ាគឺជាសិង្ហអាហ្រ្វិកមួយក្បាល...', true),
 ('40000000-0000-0000-0000-000000000001','en','female',185,'KOMA is a proud African Lion who calls Green Wild Zoo home...', true),
 ('40000000-0000-0000-0000-000000000001','zh','female',195,'科马是一只自豪的非洲狮子...', true)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- FACILITIES
-- ---------------------------------------------------------------------------
insert into facilities (map_id, type, name, khmer_name, map_x, map_y, icon) values
 ('30000000-0000-0000-0000-000000000000','entrance','Main Entrance','ច្រកចូលសំខាន់',50,93,'🚪'),
 ('30000000-0000-0000-0000-000000000000','restaurant','Savanna Restaurant','ភោជនីយដ្ឋាន',58,84,'🍔'),
 ('30000000-0000-0000-0000-000000000000','restroom','Restroom','បង្គន់',41,85,'🚻'),
 ('30000000-0000-0000-0000-000000000000','parking','Main Parking','ចំណតរថយន្ត',36,95,'🅿️'),
 ('30000000-0000-0000-0000-000000000000','first_aid','First Aid Station','ចំណុចបឋមសង្គ្រោះ',70,79,'🏥'),
 ('30000000-0000-0000-0000-000000000000','gift_shop','Gift Shop','ហាងអនុស្សាវរីយ៍',30,79,'🎁'),
 ('30000000-0000-0000-0000-000000000000','rest_area','Shaded Rest Area','កន្លែងសម្រាក',63,73,'🪑'),
 ('30000000-0000-0000-0000-000000000000','photo_spot','Lake Photo Spot','ចំណុចថតរូប',38,58,'📷')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- TICKET TYPES
-- ---------------------------------------------------------------------------
insert into ticket_types (name, khmer_name, price_usd, min_age, max_age, sort_order) values
 ('Adult','មនុស្សពេញវ័យ',10.00,12,null,1),
 ('Child','កុមារ',6.00,3,11,2),
 ('Under 3','កុមារតូច',0.00,0,2,3),
 ('VIP','វីអាយភី',25.00,null,null,4),
 ('Group (10+)','ក្រុម',8.00,null,null,5)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- APP SETTINGS
-- ---------------------------------------------------------------------------
insert into app_settings (key, value) values
 ('zoo_profile', '{"name":"Green Wild Zoo","tagline":"Discover the Wild. Learn. Explore. Protect.","opening_time":"08:00","closing_time":"18:00","last_entry":"17:00","address":"123 Zoo Road, Phnom Penh, Cambodia","currency":"USD"}'),
 ('birthday_settings', '{"public_display_enabled": true}'),
 ('quest_settings', '{"points_per_discovery": 10, "completion_badge": "Zoo Explorer"}'),
 ('branding', '{"login_hero_image_url": "/animals/koma-1.jpg", "login_hero_video_url": null, "map_image_url": null}'),
 -- PLACEHOLDER ONLY — a made-up ~150m box near central Phnom Penh, purely so
 -- the "Use My GPS" feature has something to demo out of the box. Replace
 -- with your real venue's corner coordinates in Admin → Settings before
 -- relying on this for anything real.
 ('map_calibration', '{"nwLat": 11.5700, "nwLng": 104.9200, "seLat": 11.5686, "seLng": 104.9218}')
on conflict (key) do update set value = excluded.value;
