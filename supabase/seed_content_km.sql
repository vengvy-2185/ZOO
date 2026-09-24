-- ============================================================================
-- GREEN WILD ZOO — KHMER CONTENT + REAL PHOTOS FOR THE SAMPLE DATA
-- Run AFTER seed.sql and migration 0008. Only UPDATEs/UPSERTs, so it is safe
-- to run again at any time.
-- Photos live in public/animals/ (credits: public/animals/CREDITS.json, /credits).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- CATEGORIES: photo + description (EN/KM) + corrected Khmer names
-- ---------------------------------------------------------------------------
update animal_categories set image_url = '/animals/milo-1.jpg', khmer_name = 'ថនិកសត្វ',
  description = 'Warm-blooded animals with hair or fur that feed their babies milk — from giant elephants to tiny red pandas.',
  description_km = 'សត្វឈាមក្តៅ មានរោម និងបំបៅកូនដោយទឹកដោះ — ចាប់ពីដំរីដ៏ធំ រហូតដល់ផេនដាក្រហមតូចៗ។'
  where slug = 'mammals';
update animal_categories set image_url = '/animals/rio-1.jpg', khmer_name = 'បក្សី',
  description = 'Feathered animals that lay eggs — most can fly, and many are brilliantly coloured.',
  description_km = 'សត្វមានរោមស្លាប និងពងកូន — ភាគច្រើនអាចហើរបាន ហើយខ្លះមានពណ៌ស្រស់ស្អាតខ្លាំង។'
  where slug = 'birds';
update animal_categories set image_url = '/animals/coco-1.jpg', khmer_name = 'សត្វល្មូន',
  description = 'Cold-blooded animals with dry, scaly skin, such as crocodiles, snakes, lizards and turtles.',
  description_km = 'សត្វឈាមត្រជាក់ មានស្បែកស្ងួត និងស្រកា ដូចជា ក្រពើ ពស់ តុកកែ និងអណ្តើក។'
  where slug = 'reptiles';
update animal_categories set image_url = '/animals/finn-1.jpg', khmer_name = 'សត្វទឹក',
  description = 'Animals that live in rivers, lakes and the ocean — from colourful reef fish to sharks.',
  description_km = 'សត្វដែលរស់នៅក្នុងទន្លេ បឹង និងសមុទ្រ — ចាប់ពីត្រីផ្កាថ្មចម្រុះពណ៌ រហូតដល់ត្រីឆ្លាម។'
  where slug = 'aquatic';
update animal_categories set image_url = '/animals/cat-insects.jpg', khmer_name = 'សត្វល្អិត',
  description = 'Small animals with six legs and three body parts, like butterflies, beetles and bees.',
  description_km = 'សត្វតូចៗ មានជើងប្រាំមួយ និងខ្លួនបីផ្នែក ដូចជា មេអំបៅ កន្ធាយ និងឃ្មុំ។'
  where slug = 'insects';
update animal_categories set image_url = '/animals/cat-amphibians.jpg', khmer_name = 'សត្វរស់លើគោកនិងក្នុងទឹក',
  description = 'Animals such as frogs and toads that begin life in water and later live on land too.',
  description_km = 'សត្វដូចជា កង្កែប និងកង្កែបហ្លួង ដែលចាប់ផ្តើមជីវិតក្នុងទឹក ហើយក្រោយមករស់នៅលើគោកផងដែរ។'
  where slug = 'amphibians';

-- ---------------------------------------------------------------------------
-- SPECIES: corrected Khmer names + descriptions (EN for the 7 that had none) + KM
-- ---------------------------------------------------------------------------
update species set khmer_name = 'សិង្ហអាហ្វ្រិក', conservation_status_km = 'ងាយរងគ្រោះ',
  habitat_description_km = 'វាលស្មៅ និងវាលសាវ៉ាណានៃទ្វីបអាហ្វ្រិកភាគខាងត្បូងវាលខ្សាច់សាហារ៉ា',
  description_km = 'សិង្ហជាសត្វឆ្មាព្រៃតែមួយគត់ដែលរស់នៅជាក្រុមពិតប្រាកដ។ វារស់នៅជាក្រុមគ្រួសារហៅថា «ហ្វូង» ដែលមានសិង្ហញីជាញាតិគ្នា កូនៗ និងសិង្ហឈ្មោលមួយចំនួនតូច។ សិង្ហឈ្មោលពេញវ័យមានទម្ងន់ប្រហែល 150–250 គីឡូក្រាម ហើយសិង្ហញី 110–180 គីឡូក្រាម។ សិង្ហសម្រាកបានរហូតដល់ 20 ម៉ោងក្នុងមួយថ្ងៃ ហើយប្រមាញ់ភាគច្រើននៅពេលល្ងាច និងពេលយប់ ដោយធ្វើការជាក្រុម។ នៅក្នុងព្រៃ វារស់បាន 10–14 ឆ្នាំ ហើយច្រើនតែលើសពី 20 ឆ្នាំនៅក្នុងការថែទាំរបស់មនុស្ស។ ចំនួនសិង្ហបានធ្លាក់ចុះយ៉ាងខ្លាំងក្នុងរយៈពេលមួយសតវត្សចុងក្រោយ ដោយសារការបាត់បង់ទីជម្រក និងជម្លោះជាមួយមនុស្ស ហើយ IUCN បានចាត់ទុកប្រភេទនេះថា «ងាយរងគ្រោះ»។'
  where id = '20000000-0000-0000-0000-000000000001';

update species set khmer_name = 'ខ្លាស', conservation_status_km = 'ជិតផុតពូជ',
  habitat_description_km = 'ព្រៃត្រូពិច និងវាលស្មៅនៃអាស៊ីខាងត្បូង និងអាស៊ីអាគ្នេយ៍',
  description_km = 'ខ្លាសគឺជាខ្លាបេងហ្គាល់ មិនមែនជាប្រភេទដាច់ដោយឡែកទេ។ រោមពណ៌ស និងភ្នែកពណ៌ខៀវរបស់វា កើតចេញពីហ្សែនកម្រមួយ (SLC45A2) ដែលកាត់បន្ថយសារធាតុពណ៌ទឹកក្រូច ហើយឪពុកម្តាយទាំងពីរត្រូវតែមានហ្សែននេះ។ បច្ចុប្បន្នមិនមានខ្លាសរស់នៅក្នុងព្រៃទៀតទេ — ការឃើញចុងក្រោយនៅក្នុងព្រៃនៃប្រទេសឥណ្ឌាគឺនៅឆ្នាំ 1958។ ខ្លាជាសត្វឆ្មាធំជាងគេបំផុតលើពិភពលោក — ខ្លាញីមានទម្ងន់ប្រហែល 100–160 គីឡូក្រាម ហើយខ្លាឈ្មោល 180–260 គីឡូក្រាម។ ខុសពីឆ្មាភាគច្រើន ខ្លាចូលចិត្តទឹក និងហែលទឹកពូកែ។ ខ្លានីមួយៗមានឆ្នូតខុសៗគ្នា។ ខ្លាព្រៃនៅសល់តែប្រហែល 3.700–5.600 ក្បាលប៉ុណ្ណោះ ហើយ IUCN ចាត់ទុកប្រភេទនេះថា «ជិតផុតពូជ»។'
  where id = '20000000-0000-0000-0000-000000000002';

update species set khmer_name = 'ដំរីអាស៊ី', conservation_status_km = 'ជិតផុតពូជ',
  habitat_description_km = 'ព្រៃឈើ និងវាលស្មៅនៃអាស៊ីខាងត្បូង និងអាស៊ីអាគ្នេយ៍ រួមទាំងប្រទេសកម្ពុជា',
  description_km = 'ដំរីអាស៊ីជាសត្វគោកធំជាងគេបំផុតនៅទ្វីបអាស៊ី មានទម្ងន់ប្រហែល 3.000–5.000 គីឡូក្រាម និងកម្ពស់រហូតដល់ 3 ម៉ែត្រ។ វាមានត្រចៀកតូច និងមូលជាងដំរីអាហ្វ្រិក ហើយមានតែដំរីឈ្មោលខ្លះប៉ុណ្ណោះដែលមានភ្លុក។ ដំរីពេញវ័យស៊ីស្មៅ ស្លឹកឈើ សំបកឈើ និងផ្លែឈើរហូតដល់ 150 គីឡូក្រាមក្នុងមួយថ្ងៃ និងផឹកទឹកប្រហែល 100 លីត្រ។ ដំរីមានផ្ទៃពោះយូរជាងគេក្នុងចំណោមថនិកសត្វទាំងអស់ — ប្រហែល 22 ខែ — ហើយរស់បានប្រហែល 60 ឆ្នាំ។ ប្រទេសកម្ពុជាមានដំរីព្រៃមួយចំនួនតូចនៅជួរភ្នំក្រវាញ និងវាលទំនាបភាគខាងកើត រួមទាំងខេត្តមណ្ឌលគិរី។ ប្រភេទនេះ «ជិតផុតពូជ» ភាគច្រើនដោយសារការបាត់បង់ទីជម្រក និងជម្លោះជាមួយមនុស្ស។'
  where id = '20000000-0000-0000-0000-000000000003';

update species set khmer_name = 'សត្វហ្សីរ៉ាហ្វ', conservation_status_km = 'ងាយរងគ្រោះ',
  habitat_description = 'Savannas and open woodlands of Africa',
  habitat_description_km = 'វាលសាវ៉ាណា និងព្រៃស្រឡះនៃទ្វីបអាហ្វ្រិក',
  description = 'The giraffe is the tallest animal on Earth — adult males can reach 5.5 m. Its long neck has the same number of bones as ours (seven), each up to 25 cm long. Giraffes browse on the leaves of tall trees, especially acacias, and need only 5–30 minutes of sleep a day. Every giraffe has its own unique coat pattern.',
  description_km = 'ហ្សីរ៉ាហ្វជាសត្វខ្ពស់ជាងគេបំផុតលើផែនដី — ហ្សីរ៉ាហ្វឈ្មោលពេញវ័យអាចខ្ពស់ដល់ 5,5 ម៉ែត្រ។ កដ៏វែងរបស់វាមានឆ្អឹងចំនួនប្រាំពីរដូចមនុស្សយើងដែរ ប៉ុន្តែឆ្អឹងនីមួយៗវែងរហូតដល់ 25 សង់ទីម៉ែត្រ។ ហ្សីរ៉ាហ្វស៊ីស្លឹកឈើខ្ពស់ៗ ជាពិសេសដើមអាកាស្យា ហើយត្រូវការគេងតែ 5–30 នាទីក្នុងមួយថ្ងៃប៉ុណ្ណោះ។ ហ្សីរ៉ាហ្វនីមួយៗមានលំនាំស្បែកខុសៗគ្នា។'
  where id = '20000000-0000-0000-0000-000000000004';

update species set khmer_name = 'ផេនដាក្រហម', conservation_status_km = 'ជិតផុតពូជ',
  habitat_description = 'Cool mountain forests of the Himalayas and southern China',
  habitat_description_km = 'ព្រៃភ្នំត្រជាក់នៃភ្នំហិមាល័យ និងភាគខាងត្បូងប្រទេសចិន',
  description = 'The red panda is about the size of a house cat and spends most of its life in trees. It eats mostly bamboo, and uses a special wrist bone like a "false thumb" to grip the stems. Its thick ringed tail helps it balance and keeps it warm like a blanket. Fewer than 10,000 remain in the wild.',
  description_km = 'ផេនដាក្រហមមានទំហំប្រហែលឆ្មាផ្ទះ ហើយរស់នៅលើដើមឈើស្ទើរតែពេញមួយជីវិត។ វាស៊ីឫស្សីជាចម្បង ហើយប្រើឆ្អឹងកដៃពិសេសមួយដូច «មេដៃក្លែងក្លាយ» ដើម្បីក្តាប់ដើមឫស្សី។ កន្ទុយក្រាស់មានរង្វង់របស់វាជួយឲ្យវាមានលំនឹង និងរក្សាកម្តៅដូចភួយ។ ផេនដាក្រហមនៅក្នុងព្រៃមានតិចជាង 10.000 ក្បាល។'
  where id = '20000000-0000-0000-0000-000000000005';

update species set khmer_name = 'សេកម៉ាកាវក្រហម', conservation_status_km = 'មិនសូវគួរឲ្យព្រួយបារម្ភ',
  habitat_description = 'Humid tropical forests of Central and South America',
  habitat_description_km = 'ព្រៃត្រូពិចសើមនៃអាមេរិកកណ្តាល និងអាមេរិកខាងត្បូង',
  description = 'The scarlet macaw is one of the largest parrots in the world, with bright red, yellow and blue feathers. Its powerful curved beak can crack hard nuts, and it can live for more than 50 years. Macaws usually pair for life and are very social, flying and feeding in noisy groups.',
  description_km = 'សេកម៉ាកាវក្រហមជាសត្វសេកធំជាងគេមួយលើពិភពលោក មានរោមពណ៌ក្រហម លឿង និងខៀវស្រស់។ ចំពុះកោងដ៏រឹងមាំរបស់វាអាចបំបែកគ្រាប់រឹងៗបាន ហើយវាអាចរស់បានលើសពី 50 ឆ្នាំ។ សេកម៉ាកាវជាធម្មតារស់នៅជាគូរហូតមួយជីវិត ហើយចូលចិត្តហើរ និងស៊ីចំណីជាក្រុមយ៉ាងអ៊ូអរ។'
  where id = '20000000-0000-0000-0000-000000000006';

update species set khmer_name = 'ក្រៀលផ្កាឈូកធំ', conservation_status_km = 'មិនសូវគួរឲ្យព្រួយបារម្ភ',
  habitat_description = 'Salt lakes, lagoons and wetlands of Africa, southern Europe and southern Asia',
  habitat_description_km = 'បឹងទឹកប្រៃ ឡាហ្គូន និងតំបន់ដីសើមនៃអាហ្វ្រិក អឺរ៉ុបខាងត្បូង និងអាស៊ីខាងត្បូង',
  description = 'The greater flamingo is the largest flamingo species, standing up to 1.5 m tall. It feeds with its head upside down, filtering tiny shrimp and algae from the water with its beak. Its pink colour comes from pigments in this food. Flamingos often rest standing on one leg and live in large, noisy colonies.',
  description_km = 'ក្រៀលផ្កាឈូកធំជាប្រភេទក្រៀលផ្កាឈូកធំជាងគេ កម្ពស់រហូតដល់ 1,5 ម៉ែត្រ។ វាស៊ីចំណីដោយបញ្ច្រាសក្បាលចុះក្រោម ហើយច្រោះបង្កងតូចៗ និងសារាយចេញពីទឹកដោយចំពុះរបស់វា។ ពណ៌ផ្កាឈូករបស់វាកើតចេញពីសារធាតុពណ៌ក្នុងចំណីនេះ។ ក្រៀលផ្កាឈូកច្រើនតែឈរសម្រាកលើជើងតែមួយ ហើយរស់នៅជាហ្វូងធំៗ។'
  where id = '20000000-0000-0000-0000-000000000007';

update species set khmer_name = 'ក្ងោក', conservation_status_km = 'មិនសូវគួរឲ្យព្រួយបារម្ភ',
  habitat_description = 'Forests and farmland of India and Sri Lanka',
  habitat_description_km = 'ព្រៃឈើ និងដីកសិកម្មនៃប្រទេសឥណ្ឌា និងស្រីលង្កា',
  description = 'The Indian peafowl is famous for the male''s long train of shimmering feathers decorated with "eye" spots, which he fans out to impress females. Only males (peacocks) have the train; females (peahens) are brown and grey. Peafowl can fly short distances and roost in tall trees at night.',
  description_km = 'ក្ងោកឥណ្ឌាល្បីដោយសារកន្ទុយវែងរលោងរបស់ក្ងោកឈ្មោល ដែលមានចំណុចដូច «ភ្នែក» ហើយវាលាតកន្ទុយនេះដើម្បីទាក់ទាញញី។ មានតែក្ងោកឈ្មោលប៉ុណ្ណោះដែលមានកន្ទុយបែបនេះ ចំណែកក្ងោកញីមានពណ៌ត្នោត និងប្រផេះ។ ក្ងោកអាចហើរបានចម្ងាយខ្លី ហើយទំលើដើមឈើខ្ពស់ៗនៅពេលយប់។'
  where id = '20000000-0000-0000-0000-000000000008';

update species set khmer_name = 'ក្រពើទឹកប្រៃ', conservation_status_km = 'មិនសូវគួរឲ្យព្រួយបារម្ភ',
  habitat_description = 'Coastal rivers, mangroves and estuaries from India to northern Australia',
  habitat_description_km = 'ទន្លេតាមឆ្នេរ ព្រៃកោងកាង និងមាត់ទន្លេ ពីប្រទេសឥណ្ឌារហូតដល់ភាគខាងជើងអូស្ត្រាលី',
  description = 'The saltwater crocodile is the largest living reptile — big males can be over 6 m long and weigh more than 1,000 kg. It has the strongest bite ever measured in an animal. Despite its name it lives in both fresh and salt water, and it can stay underwater for over an hour while resting.',
  description_km = 'ក្រពើទឹកប្រៃជាសត្វល្មូនធំជាងគេបំផុតដែលនៅរស់ — ក្រពើឈ្មោលធំៗអាចវែងជាង 6 ម៉ែត្រ និងធ្ងន់ជាង 1.000 គីឡូក្រាម។ វាមានកម្លាំងខាំខ្លាំងជាងគេបំផុតដែលធ្លាប់វាស់បានក្នុងចំណោមសត្វ។ ទោះបីឈ្មោះថា «ទឹកប្រៃ» ក៏ដោយ វារស់នៅទាំងក្នុងទឹកសាប និងទឹកប្រៃ ហើយអាចនៅក្រោមទឹកបានជាងមួយម៉ោងពេលសម្រាក។'
  where id = '20000000-0000-0000-0000-000000000009';

update species set khmer_name = 'ត្រីឆ្លាមចុងព្រុយខ្មៅ', conservation_status_km = 'ងាយរងគ្រោះ',
  habitat_description = 'Shallow coral reefs of the Indian and Pacific Oceans',
  habitat_description_km = 'ផ្កាថ្មរាក់ៗនៃមហាសមុទ្រឥណ្ឌា និងប៉ាស៊ីហ្វិក',
  description = 'The blacktip reef shark is easy to recognise by the black tips on its fins. It grows to about 1.6 m and prefers shallow, warm reefs, where it hunts small fish. It is usually shy and harmless to people. Like many sharks, its numbers are falling because of overfishing.',
  description_km = 'ត្រីឆ្លាមចុងព្រុយខ្មៅងាយស្គាល់ដោយសារចុងព្រុយពណ៌ខ្មៅរបស់វា។ វាធំរហូតដល់ប្រហែល 1,6 ម៉ែត្រ ហើយចូលចិត្តផ្កាថ្មរាក់ៗ និងក្តៅ ដែលវាប្រមាញ់ត្រីតូចៗ។ ជាធម្មតាវាខ្មាស់អៀន និងមិនមានគ្រោះថ្នាក់ដល់មនុស្សទេ។ ដូចត្រីឆ្លាមជាច្រើនដែរ ចំនួនរបស់វាកំពុងថយចុះដោយសារការនេសាទហួសកម្រិត។'
  where id = '20000000-0000-0000-0000-000000000010';

update species set conservation_status = 'Vulnerable' where id = '20000000-0000-0000-0000-000000000010';

-- ---------------------------------------------------------------------------
-- ANIMALS: real photos for all + Khmer versions of every profile field
-- ---------------------------------------------------------------------------
update animals set place_of_birth_km = 'សួនសត្វភ្នំពេញ',
  biography_km = 'កូម៉ាកើតនៅសួនសត្វភ្នំពេញ នៅខែមីនា ឆ្នាំ 2020 ហើយបានផ្លាស់មកសួនសត្វ Green Wild នៅខែមិថុនា ឆ្នាំ 2022។ សក់ក (រោមក) ក្រាស់ពណ៌មាស និងខ្មៅរបស់វាចាប់ផ្តើមដុះនៅអាយុប្រហែលមួយឆ្នាំ ហើយពេញលេញនៅអាយុបួនឆ្នាំ — សក់កពណ៌ចាស់ជាសញ្ញានៃសិង្ហឈ្មោលពេញវ័យ និងមានសុខភាពល្អ។ ដូចសិង្ហព្រៃដែរ កូម៉ាសម្រាកក្នុងម្លប់ស្ទើរតែពេញមួយថ្ងៃ ហើយសកម្មខ្លាំងនៅពេលរសៀលត្រជាក់ ពេលដែលវាដើរល្បាតទឹកដី និងដាក់ក្លិនសម្គាល់ព្រំដែនទីជម្រករបស់វា។',
  personality_km = 'ស្ងប់ស្ងាត់ និងមានទំនុកចិត្ត',
  favorite_food_km = 'សាច់គោ សាច់មាន់ និងឆ្អឹង (សិង្ហមួយក្បាលស៊ីសាច់ប្រហែល 5–7 គីឡូក្រាមក្នុងមួយថ្ងៃ)',
  favorite_activities_km = 'សម្រាកក្នុងម្លប់ ដើរល្បាតពេលល្ងាច និងគ្រហឹមនៅពេលព្រឹកព្រលឹម',
  interesting_facts_km = 'សិង្ហជាសត្វឆ្មាតែមួយគត់ដែលរស់នៅជាក្រុមហៅថា «ហ្វូង»។ សំឡេងគ្រហឹមរបស់សិង្ហអាចឮបានឆ្ងាយរហូតដល់ 8 គីឡូម៉ែត្រ។ សិង្ហអាចគេង ឬសម្រាកបានរហូតដល់ 20 ម៉ោងក្នុងមួយថ្ងៃ។ លំនាំចំណុចពុកមាត់របស់សិង្ហនីមួយៗខុសៗគ្នា ដូចស្នាមម្រាមដៃមនុស្ស។',
  care_information_km = 'ផ្តល់ចំណីម្តងក្នុងមួយថ្ងៃ និងតមអាហារមួយថ្ងៃក្នុងមួយសប្តាហ៍ ព្រោះសិង្ហព្រៃមិនបានស៊ីរាល់ថ្ងៃទេ។ អ្នកថែទាំលាក់ចំណី និងធ្វើផ្លូវក្លិន ដើម្បីជំរុញឥរិយាបថប្រមាញ់តាមធម្មជាតិ ហើយពេទ្យសត្វពិនិត្យវារៀងរាល់ខែ។'
  where animal_code = 'LION-A-001';

update animals set place_of_birth_km = 'សួនសត្វ Green Wild',
  biography_km = 'លូណាកើតនៅទីនេះ ក្នុងសួនសត្វ Green Wild នៅខែឧសភា ឆ្នាំ 2021។ រោមពណ៌សមានឆ្នូតពណ៌សូកូឡា និងភ្នែកពណ៌ខៀវស្រឡះ ធ្វើឲ្យវាក្លាយជាសត្វដែលគេថតរូបច្រើនជាងគេមួយនៅក្នុងសួន។ ដូចខ្លាទាំងអស់ដែរ វាចូលចិត្តទឹក — នៅពេលរសៀលក្តៅ គេតែងឃើញវាដេកក្នុងស្រះ ដោយលយតែក្បាលលើទឹក។ វាសកម្មខ្លាំងបំផុតនៅពេលព្រឹកព្រលឹម និងជុំវិញម៉ោងផ្តល់ចំណី។',
  personality_km = 'ចូលចិត្តលេង និងចង់ដឹងចង់ឃើញ',
  favorite_food_km = 'សាច់គោ សាច់មាន់ និងសាច់ទន្សាយ (ខ្លាពេញវ័យស៊ីសាច់ប្រហែល 5–6 គីឡូក្រាមក្នុងមួយថ្ងៃ)',
  favorite_activities_km = 'ហែលទឹកក្នុងស្រះ លបចាប់ប្រដាប់ក្មេងលេង និងកោសដើមឈើ',
  interesting_facts_km = 'ខ្លាសគឺជាខ្លាបេងហ្គាល់ មិនមែនជាប្រភេទដាច់ដោយឡែកទេ — ពណ៌សកើតចេញពីហ្សែនកម្រមួយ។ ខ្លានីមួយៗមានឆ្នូតខុសៗគ្នា ហើយឆ្នូតនោះមាននៅលើស្បែក ក៏ដូចជានៅលើរោមផងដែរ។ ខ្លាហែលទឹកពូកែ ហើយអាចឆ្លងទន្លេដែលធំទូលាយរាប់គីឡូម៉ែត្របាន។',
  care_information_km = 'ទីជម្រករបស់វាមានស្រះទឹកជ្រៅសម្រាប់ធ្វើឲ្យត្រជាក់ មានគល់ឈើសម្រាប់ឡើង និងដើមឈើក្រាស់សម្រាប់ភាពឯកជន។ អ្នកថែទាំប្រើការបង្ហាត់ដោយរង្វាន់ ដើម្បីឲ្យវាចូលរួមក្នុងការពិនិត្យសុខភាពដោយស្ងប់ស្ងាត់។'
  where animal_code = 'TIGER-A-002';

update animals set place_of_birth_km = 'មជ្ឈមណ្ឌលសង្គ្រោះសត្វព្រៃមណ្ឌលគិរី',
  biography_km = 'មីឡូបានមកដល់សួនសត្វយើងក្នុងឆ្នាំ 2018 ពីមជ្ឈមណ្ឌលសង្គ្រោះសត្វព្រៃមួយនៅខេត្តមណ្ឌលគិរី ដែលជាខេត្តនៅភាគខាងកើតប្រទេសកម្ពុជា និងជាទីជម្រករបស់ហ្វូងដំរីព្រៃចុងក្រោយមួយរបស់ប្រទេស។ វាជាយក្សចិត្តល្អនៃតំបន់ A។ មីឡូចំណាយពេលរហូតដល់ 16 ម៉ោងក្នុងមួយថ្ងៃដើម្បីស៊ីចំណី ហើយពេលដែលវាចូលចិត្តជាងគេគឺការងូតទឹកពេលរសៀល ពេលដែលវាបាញ់ទឹក — ហើយបន្ទាប់មកដី — លើខ្នងរបស់វា ដើម្បីការពារស្បែកពីកម្តៅថ្ងៃ និងសត្វល្អិត។',
  personality_km = 'ស្លូតបូត និងចូលចិត្តសង្គម',
  favorite_food_km = 'ស្មៅ ចំបើង ដើមចេក អំពៅ និងផ្លែឈើ (ស៊ីចំណីរហូតដល់ 150 គីឡូក្រាម និងផឹកទឹកប្រហែល 100 លីត្រក្នុងមួយថ្ងៃ)',
  favorite_activities_km = 'ងូតទឹក ងូតដី និងរកចំណីដោយប្រមោយ',
  interesting_facts_km = 'ប្រមោយដំរីមានសាច់ដុំប្រហែល 40.000 ហើយអាចរើសវត្ថុតូចប៉ុនសណ្តែកដីបាន។ ដំរីអាចស្គាល់ខ្លួនឯងក្នុងកញ្ចក់ ដែលជាសញ្ញានៃការយល់ដឹងពីខ្លួនឯង ដែលមានតែសត្វតិចតួចប៉ុណ្ណោះមាន។ ដំរីនិយាយគ្នាដោយសំឡេងគ្រហឹមទាប ដែលអាចឮបានឆ្ងាយរាប់គីឡូម៉ែត្រ។',
  care_information_km = 'អ្នកថែទាំពិនិត្យ និងកាត់ក្រចកជើងមីឡូរៀងរាល់ថ្ងៃ ព្រោះសុខភាពជើងសំខាន់ខ្លាំងណាស់សម្រាប់ដំរី។ ការបង្ហាត់ដោយមានរបាំងការពារ អនុញ្ញាតឲ្យអ្នកថែទាំមើលថែវាដោយសុវត្ថិភាព ដោយមិនជិះ ឬប្រើច្រវាក់។'
  where animal_code = 'ELEP-A-003';

update animals set main_image_url = coalesce(main_image_url, '/animals/nala-1.jpg'), place_of_birth_km = 'សួនសត្វ Green Wild',
  biography_km = 'ណាឡាកើតនៅសួនសត្វ Green Wild ហើយជាសត្វខ្ពស់ជាងគេនៅក្នុងទីជម្រកសាវ៉ាណារបស់យើង។ គេតែងឃើញវាលូកយកស្លឹកឈើនៅកំពូលកន្លែងផ្តល់ចំណីរបស់វា។',
  personality_km = 'ស្លូតបូត និងប្រុងប្រយ័ត្ន',
  favorite_food_km = 'ស្លឹកអាកាស្យា និងការ៉ុត',
  favorite_activities_km = 'ស៊ីស្លឹកឈើពីកន្លែងផ្តល់ចំណីខ្ពស់ៗ និងឈរក្បែររបងវាលសាវ៉ាណា',
  interesting_facts_km = 'អណ្តាតហ្សីរ៉ាហ្វអាចវែងរហូតដល់ 50 សង់ទីម៉ែត្រ ហើយមានពណ៌ខៀវខ្មៅ ដើម្បីការពារកុំឲ្យរលាកថ្ងៃពេលវាស៊ីស្លឹកឈើ។',
  care_information_km = 'កន្លែងផ្តល់ចំណីខ្ពស់ពិសេស ត្រូវបានរៀបចំឲ្យមានកម្ពស់ដូចដើមឈើក្នុងធម្មជាតិ។'
  where animal_code = 'GIRA-A-004';

update animals set main_image_url = coalesce(main_image_url, '/animals/tiko-1.jpg'), place_of_birth_km = 'មូលដ្ឋានចេងទូ',
  biography_km = 'ទីកូបានមកដល់សួនសត្វយើងតាមរយៈកម្មវិធីផ្លាស់ប្តូរដើម្បីអភិរក្សក្នុងតំបន់ ហើយបានសម្របខ្លួនយ៉ាងល្អនៅក្នុងទីជម្រកព្រៃឈើរបស់វា។',
  personality_km = 'ខ្មាស់អៀន និងចូលចិត្តនៅម្នាក់ឯង',
  favorite_food_km = 'ពន្លកឫស្សី និងផ្លែប៉ោម',
  favorite_activities_km = 'សម្រាកលើដើមឈើ និងរកចំណីនៅពេលរសៀល',
  interesting_facts_km = 'ទោះបីមានឈ្មោះថាផេនដាក៏ដោយ ផេនដាក្រហមមិនមែនជាញាតិជិតរបស់ផេនដាយក្សទេ — វាជាក្រុមគ្រួសារពិសេសដាច់ដោយឡែកមួយ។',
  care_information_km = 'សីតុណ្ហភាពក្នុងទីជម្រកត្រូវបានតាមដានយ៉ាងដិតដល់ ព្រោះផេនដាក្រហមងាយរងឥទ្ធិពលពីកម្តៅ។'
  where animal_code = 'PAND-A-005';

update animals set main_image_url = coalesce(main_image_url, '/animals/rio-1.jpg'), place_of_birth_km = 'សួនសត្វ Green Wild',
  biography_km = 'រីអូជាសត្វដែលនិយាយច្រើនជាងគេមួយនៅក្នុងទ្រុងបក្សីត្រូពិច ហើយចូលចិត្តស្វាគមន៍ភ្ញៀវដោយសំឡេងស្រែក។',
  personality_km = 'និយាយច្រើន និងក្លាហាន',
  favorite_food_km = 'គ្រាប់ពូជ និងផ្លែឈើត្រូពិច',
  favorite_activities_km = 'ហើរពីមែកមួយទៅមែកមួយ និងធ្វើត្រាប់តាមសំឡេង',
  interesting_facts_km = 'សេកម៉ាកាវក្រហមអាចរស់បានលើសពី 50 ឆ្នាំ ហើយរស់នៅជាគូរហូតមួយជីវិត។',
  care_information_km = 'ផ្តល់សកម្មភាពហោះហើររៀងរាល់ថ្ងៃ នៅក្នុងលំហរបើកចំហរបស់ទ្រុងបក្សី។'
  where animal_code = 'MACW-B-006';

update animals set main_image_url = coalesce(main_image_url, '/animals/maya-1.jpg'), place_of_birth_km = 'សួនសត្វ Green Wild',
  biography_km = 'ម៉ាយ៉ាដឹកនាំហ្វូងក្រៀលផ្កាឈូកនៅបឹងក្រៀលផ្កាឈូក ហើយងាយមើលឃើញដោយសាររោមពណ៌ផ្កាឈូកដ៏ស្រស់របស់វា។',
  personality_km = 'ចូលចិត្តសង្គម និងមានភាពថ្លៃថ្នូរ',
  favorite_food_km = 'បង្កងតូចៗ និងចំណីផ្សំពីសារាយ',
  favorite_activities_km = 'ដើរក្នុងទឹករាក់ តុបតែងរោម និងសម្តែងជាហ្វូងពេលល្ងាច',
  interesting_facts_km = 'ពណ៌ផ្កាឈូករបស់ក្រៀលផ្កាឈូក កើតចេញដោយផ្ទាល់ពីសារធាតុពណ៌ក្នុងបង្កង និងសារាយដែលវាស៊ី។',
  care_information_km = 'ហ្វូងត្រូវបានចិញ្ចឹមជាមួយគ្នា ដើម្បីលើកទឹកចិត្តឲ្យមានឥរិយាបថសង្គមតាមធម្មជាតិ។'
  where animal_code = 'FLAM-B-007';

update animals set main_image_url = coalesce(main_image_url, '/animals/sky-1.jpg'), place_of_birth_km = 'សួនសត្វ Green Wild',
  biography_km = 'ស្កាយដើរយ៉ាងក្រអឺតក្រទមនៅក្នុងសួនក្ងោក ហើយល្បីក្នុងចំណោមភ្ញៀវ ដោយសារការលាតកន្ទុយពេញលេញរបស់វានៅពេលព្រឹក។',
  personality_km = 'អួតខ្លួន និងចូលចិត្តបង្ហាញ',
  favorite_food_km = 'គ្រាប់ធញ្ញជាតិ សត្វល្អិត និងបន្លែ',
  favorite_activities_km = 'លាតរោមកន្ទុយ និងរកចំណីក្នុងសួន',
  interesting_facts_km = 'កន្ទុយក្ងោកមានរោមជាង 150 សរសៃ ហើយអាចលាតចេញជាពាក់កណ្តាលរង្វង់ ដើម្បីទាក់ទាញញី។',
  care_information_km = 'អាចដើរដោយសេរីនៅក្នុងព្រំដែនដែលមានសុវត្ថិភាពរបស់សួន។'
  where animal_code = 'PEAC-B-008';

update animals set main_image_url = coalesce(main_image_url, '/animals/coco-1.jpg'), place_of_birth_km = 'តំបន់បឹងទន្លេសាប',
  biography_km = 'កូកូជាសត្វចាស់ជាងគេមួយនៅសួនសត្វ Green Wild ហើយគ្រប់គ្រងស្រះក្រពើដោយភាពស្ងប់ស្ងាត់ និងទំនុកចិត្ត។',
  personality_km = 'ស្ងប់ស្ងាត់ និងអត់ធ្មត់',
  favorite_food_km = 'ត្រីទាំងមូល',
  favorite_activities_km = 'ហាលថ្ងៃលើវេទិកា និងមុជទឹកយូរៗ',
  interesting_facts_km = 'ក្រពើអាចទប់ដង្ហើមនៅក្រោមទឹកបានជាងមួយម៉ោង នៅពេលវាសម្រាក។',
  care_information_km = 'គុណភាពទឹក និងសីតុណ្ហភាពកន្លែងហាលថ្ងៃ ត្រូវបានតាមដានពេញ 24 ម៉ោង។'
  where animal_code = 'CROC-C-009';

update animals set main_image_url = coalesce(main_image_url, '/animals/finn-1.jpg'), place_of_birth_km = 'មជ្ឈមណ្ឌលអភិរក្សសមុទ្រ',
  biography_km = 'ហ្វិនហែលយ៉ាងរលូននៅក្នុងអាងត្រីឆ្លាម ហើយជាចំណុចទាក់ទាញនៃតំបន់សត្វទឹក ជាពិសេសពេលបង្ហាញការផ្តល់ចំណី។',
  personality_km = 'ប្រុងប្រយ័ត្ន និងរហ័ស',
  favorite_food_km = 'ត្រីតូចៗ',
  favorite_activities_km = 'ហែលជុំវិញផ្កាថ្ម និងការបង្ហាញការផ្តល់ចំណី',
  interesting_facts_km = 'ត្រីឆ្លាមចុងព្រុយខ្មៅជាធម្មតាមិនមានគ្រោះថ្នាក់ដល់មនុស្សទេ ហើយចូលចិត្តផ្កាថ្មរាក់ៗតាមឆ្នេរ។',
  care_information_km = 'ជាតិប្រៃ និងសីតុណ្ហភាពទឹក ត្រូវបានរៀបចំឲ្យដូចលក្ខខណ្ឌផ្កាថ្មក្នុងធម្មជាតិ។'
  where animal_code = 'SHRK-D-010';

-- Gallery captions in Khmer + a gallery photo for the animals that only had a main photo
update animal_photos set caption_km = 'កំពុងសម្រាកក្នុងវាលស្មៅពណ៌មាស · រូបថត៖ Kevin Pluck, CC BY 2.0' where id = '41000000-0000-0000-0000-000000000001';
update animal_photos set caption_km = 'កំពុងយាមល្បាត · រូបថត៖ ragesoss, CC BY-SA 2.0' where id = '41000000-0000-0000-0000-000000000002';
update animal_photos set caption_km = 'គេងពេលរសៀល · រូបថត៖ rdoroshenko, CC BY 2.0' where id = '41000000-0000-0000-0000-000000000003';
update animal_photos set caption_km = 'លើគល់ឈើដែលវាចូលចិត្ត · រូបថត៖ Basile Morin, CC BY-SA 4.0' where id = '41000000-0000-0000-0000-000000000004';
update animal_photos set caption_km = 'ខ្លាចូលចិត្តហែលទឹក · រូបថត៖ Basile Morin, CC BY-SA 4.0' where id = '41000000-0000-0000-0000-000000000005';
update animal_photos set caption_km = 'ស្ងាបយ៉ាងធំ · រូបថត៖ Basile Morin, CC BY-SA 4.0' where id = '41000000-0000-0000-0000-000000000006';
update animal_photos set caption_km = 'ដំរីអាស៊ីឈ្មោលពេញវ័យ · រូបថត៖ Yathin S Krishnappa, CC BY-SA 3.0' where id = '41000000-0000-0000-0000-000000000007';
update animal_photos set caption_km = 'ពេលងូតដី · រូបថត៖ Mike Peel, CC BY-SA 4.0' where id = '41000000-0000-0000-0000-000000000008';

insert into animal_photos (id, animal_id, image_url, caption, caption_km, sort_order) values
 ('41000000-0000-0000-0000-000000000009','40000000-0000-0000-0000-000000000004','/animals/nala-1.jpg','Standing tall · Photo: Plasticdying, CC BY-SA 4.0','ឈរយ៉ាងខ្ពស់ · រូបថត៖ Plasticdying, CC BY-SA 4.0',1),
 ('41000000-0000-0000-0000-000000000010','40000000-0000-0000-0000-000000000005','/animals/tiko-1.jpg','Up in the branches · Photo: Mathias Appel, CC0','នៅលើមែកឈើ · រូបថត៖ Mathias Appel, CC0',1),
 ('41000000-0000-0000-0000-000000000011','40000000-0000-0000-0000-000000000006','/animals/rio-1.jpg','Bright scarlet feathers · Photo: Charles J. Sharp, CC BY-SA 4.0','រោមពណ៌ក្រហមស្រស់ · រូបថត៖ Charles J. Sharp, CC BY-SA 4.0',1),
 ('41000000-0000-0000-0000-000000000012','40000000-0000-0000-0000-000000000007','/animals/maya-1.jpg','Wings open wide · Photo: Giles Laurent, CC BY-SA 4.0','លាតស្លាបយ៉ាងធំ · រូបថត៖ Giles Laurent, CC BY-SA 4.0',1),
 ('41000000-0000-0000-0000-000000000013','40000000-0000-0000-0000-000000000008','/animals/sky-1.jpg','Full tail display · Photo: Trey Perry, CC BY 3.0','លាតកន្ទុយពេញលេញ · រូបថត៖ Trey Perry, CC BY 3.0',1),
 ('41000000-0000-0000-0000-000000000014','40000000-0000-0000-0000-000000000009','/animals/coco-1.jpg','Basking on the bank · Photo: Bernard Dupont, CC BY-SA 2.0','ហាលថ្ងៃលើច្រាំង · រូបថត៖ Bernard Dupont, CC BY-SA 2.0',1),
 ('41000000-0000-0000-0000-000000000015','40000000-0000-0000-0000-000000000010','/animals/finn-1.jpg','Gliding near the surface · Photo: Charles J. Sharp, CC BY-SA 4.0','ហែលក្បែរផ្ទៃទឹក · រូបថត៖ Charles J. Sharp, CC BY-SA 4.0',1)
on conflict (id) do update set image_url = excluded.image_url, caption = excluded.caption, caption_km = excluded.caption_km;

-- ---------------------------------------------------------------------------
-- STORYBOOK (KOMA) in Khmer
-- ---------------------------------------------------------------------------
update animal_stories set title_km = 'រឿងរបស់កូម៉ា', description_km = 'រឿងរ៉ាវរបស់សិង្ហអាហ្វ្រិករបស់យើង ឈ្មោះកូម៉ា'
  where id = '50000000-0000-0000-0000-000000000001';
update story_pages set title_km = 'ស្គាល់កូម៉ា', content_km = 'កូម៉ាជាសិង្ហអាហ្វ្រិកដ៏មានមោទនភាព ដែលរស់នៅសួនសត្វ Green Wild។ ដោយមានសក់កពណ៌មាស និងក្រសែភ្នែកស្ងប់ស្ងាត់ វាជាសត្វមួយដែលគេស្រឡាញ់ជាងគេនៅតំបន់ A។'
  where story_id = '50000000-0000-0000-0000-000000000001' and page_number = 1;
update story_pages set title_km = 'កំណើតរបស់កូម៉ា', content_km = 'កូម៉ាកើតនៅថ្ងៃទី 12 ខែមីនា ឆ្នាំ 2020 នៅសួនសត្វភ្នំពេញ ជាកូនដំបូងនៃហ្វូងរបស់វានៅឆ្នាំនោះ។'
  where story_id = '50000000-0000-0000-0000-000000000001' and page_number = 2;
update story_pages set title_km = 'ការធំធាត់', content_km = 'កាលនៅជាកូនតូច កូម៉ាចូលចិត្តលេងជាមួយបងប្អូន និងហាត់គ្រហឹម ទោះបីត្រូវចំណាយពេលយូរ ទើបសំឡេងរបស់វាខ្លាំងដូចសព្វថ្ងៃក៏ដោយ។'
  where story_id = '50000000-0000-0000-0000-000000000001' and page_number = 3;
update story_pages set title_km = 'ជីវិតនៅសួនសត្វ', content_km = 'កូម៉ាបានមកដល់សួនសត្វ Green Wild នៅខែមិថុនា ឆ្នាំ 2022។ វាបានសម្របខ្លួនយ៉ាងឆាប់រហ័សនៅទីជម្រកសិង្ហ ហើយអ្នកថែទាំបានកត់សម្គាល់ឃើញចរិតស្ងប់ស្ងាត់ និងមានទំនុកចិត្តរបស់វា។'
  where story_id = '50000000-0000-0000-0000-000000000001' and page_number = 4;
update story_pages set title_km = 'អាហារ និងសកម្មភាព', content_km = 'រៀងរាល់ថ្ងៃ កូម៉ាទទួលទានសាច់ និងចូលរួមកម្មវិធីផ្តល់ចំណីបែបលំហាត់ ដែលជំរុញសភាវគតិប្រមាញ់តាមធម្មជាតិរបស់វា។'
  where story_id = '50000000-0000-0000-0000-000000000001' and page_number = 5;
update story_pages set title_km = 'ចំណេះដឹងគួរឲ្យចាប់អារម្មណ៍', content_km = 'តើអ្នកដឹងទេថា សំឡេងគ្រហឹមរបស់សិង្ហអាចឮបានឆ្ងាយរហូតដល់ 8 គីឡូម៉ែត្រ? សំឡេងគ្រហឹមរបស់កូម៉ាអាចឮពាសពេញតំបន់ A!'
  where story_id = '50000000-0000-0000-0000-000000000001' and page_number = 6;

-- ---------------------------------------------------------------------------
-- ZONES / HABITATS / FACILITIES / TICKETS: fuller Khmer names
-- ---------------------------------------------------------------------------
update zoo_zones set khmer_name = 'តំបន់ A - ថនិកសត្វ' where code = 'A';
update zoo_zones set khmer_name = 'តំបន់ B - បក្សី' where code = 'B';
update zoo_zones set khmer_name = 'តំបន់ C - សត្វល្មូន' where code = 'C';
update zoo_zones set khmer_name = 'តំបន់ D - អាងសត្វទឹក' where code = 'D';
update habitats set khmer_name = 'ទីជម្រកផេនដាក្រហម' where id = '32000000-0000-0000-0000-000000000005';
update habitats set khmer_name = 'ផ្ទះសត្វល្មូន' where id = '32000000-0000-0000-0000-000000000008';
update habitats set khmer_name = 'បឹងក្រៀលផ្កាឈូក' where id = '32000000-0000-0000-0000-000000000007';
update facilities set khmer_name = 'ភោជនីយដ្ឋានសាវ៉ាណា' where type = 'restaurant';
update facilities set khmer_name = 'កន្លែងថតរូបមាត់បឹង' where type = 'photo_spot';
update facilities set khmer_name = 'កន្លែងសម្រាកមានម្លប់' where type = 'rest_area';
update ticket_types set khmer_name = 'កុមារអាយុក្រោម 3 ឆ្នាំ' where name = 'Under 3';
update ticket_types set khmer_name = 'ក្រុម (10 នាក់ឡើង)' where name = 'Group (10+)';

-- Address in Khmer for the Visit page
update app_settings set value = value || '{"address_km": "ផ្លូវសួនសត្វ លេខ 123 រាជធានីភ្នំពេញ ប្រទេសកម្ពុជា"}'::jsonb
  where key = 'zoo_profile';

-- ---------------------------------------------------------------------------
-- AUDIO GUIDE TRANSCRIPTS (KOMA) — full text instead of "..." placeholders.
-- The Listen page reads these aloud until real recordings are uploaded.
-- ---------------------------------------------------------------------------
update audio_guides g set transcript = a.biography
  from animals a where a.id = g.animal_id and a.animal_code = 'LION-A-001' and g.language = 'en';
update audio_guides g set transcript = a.biography_km
  from animals a where a.id = g.animal_id and a.animal_code = 'LION-A-001' and g.language = 'km';
update audio_guides g set transcript = '科马是一只雄性非洲狮，2020年3月出生于金边动物园，2022年6月来到绿野动物园。它性格沉稳而自信，白天大多在树荫下休息，傍晚天气凉爽时会巡视自己的领地。狮子是唯一过群居生活的猫科动物，它们的吼声可以传到8公里之外。'
  from animals a where a.id = g.animal_id and a.animal_code = 'LION-A-001' and g.language = 'zh';
