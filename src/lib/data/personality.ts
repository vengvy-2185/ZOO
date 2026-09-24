// "Which zoo animal are you?" — each answer gives points to one or two
// personalities; the winner is matched to the real resident of that species.
export type PersonalityKey = "lion" | "tiger" | "elephant" | "giraffe" | "redpanda" | "macaw" | "flamingo" | "peacock" | "crocodile" | "shark";

type L = { en: string; km: string };

/** Keyword found in the species' common name (lower case) → personality. */
export const SPECIES_MATCH: Record<PersonalityKey, string> = {
  lion: "lion",
  tiger: "tiger",
  elephant: "elephant",
  giraffe: "giraffe",
  redpanda: "red panda",
  macaw: "macaw",
  flamingo: "flamingo",
  peacock: "peacock",
  crocodile: "crocodile",
  shark: "shark",
};

export const PERSONALITIES: Record<PersonalityKey, { title: L; text: L; traits: L[]; color: string }> = {
  lion: {
    title: { en: "The Natural Leader", km: "អ្នកដឹកនាំពីកំណើត" },
    text: { en: "Confident and warm, you look after your people and everyone feels safe around you.", km: "អ្នកមានទំនុកចិត្ត និងកក់ក្តៅ ចេះមើលថែមនុស្សជុំវិញខ្លួន ហើយគ្រប់គ្នាមានអារម្មណ៍សុវត្ថិភាពពេលនៅជាមួយអ្នក។" },
    traits: [{ en: "Brave", km: "ក្លាហាន" }, { en: "Protective", km: "ការពារគេ" }, { en: "Proud", km: "មានមោទនភាព" }],
    color: "#D97706",
  },
  tiger: {
    title: { en: "The Quiet Powerhouse", km: "អ្នកមានកម្លាំងដ៏ស្ងប់ស្ងាត់" },
    text: { en: "Independent and focused, you prefer doing to talking, and you get things done beautifully.", km: "អ្នកឯករាជ្យ និងផ្តោតអារម្មណ៍ ចូលចិត្តធ្វើជាងនិយាយ ហើយធ្វើការងារបានស្អាតល្អ។" },
    traits: [{ en: "Focused", km: "ផ្តោតអារម្មណ៍" }, { en: "Independent", km: "ឯករាជ្យ" }, { en: "Graceful", km: "ស្រស់ស្អាត" }],
    color: "#475569",
  },
  elephant: {
    title: { en: "The Wise Heart", km: "បេះដូងដ៏ឆ្លាតវៃ" },
    text: { en: "Loyal and kind, you never forget a friend and you are the one everyone calls for advice.", km: "អ្នកស្មោះត្រង់ និងចិត្តល្អ មិនដែលភ្លេចមិត្តភក្តិ ហើយជាមនុស្សដែលគ្រប់គ្នាតែងសុំយោបល់។" },
    traits: [{ en: "Loyal", km: "ស្មោះត្រង់" }, { en: "Wise", km: "ឆ្លាតវៃ" }, { en: "Caring", km: "យកចិត្តទុកដាក់" }],
    color: "#64748B",
  },
  giraffe: {
    title: { en: "The Big-Picture Dreamer", km: "អ្នកស្រមៃមើលឆ្ងាយ" },
    text: { en: "Calm and curious, you see further than others and stay gentle even when things get busy.", km: "អ្នកស្ងប់ស្ងាត់ និងចង់ដឹងចង់ឃើញ មើលឃើញឆ្ងាយជាងគេ ហើយនៅតែទន់ភ្លន់ទោះរវល់ប៉ុណ្ណាក៏ដោយ។" },
    traits: [{ en: "Calm", km: "ស្ងប់ស្ងាត់" }, { en: "Curious", km: "ចង់ដឹង" }, { en: "Gentle", km: "ទន់ភ្លន់" }],
    color: "#F59E0B",
  },
  redpanda: {
    title: { en: "The Cosy Charmer", km: "អ្នកគួរឲ្យស្រឡាញ់" },
    text: { en: "Playful and a little shy, you love snacks, naps and small adventures with close friends.", km: "អ្នកចូលចិត្តលេង និងខ្មាស់បន្តិច ស្រឡាញ់អាហារសម្រន់ ការដេកលក់ និងដំណើរកម្សាន្តតូចៗជាមួយមិត្តជិតស្និទ្ធ។" },
    traits: [{ en: "Playful", km: "ចូលចិត្តលេង" }, { en: "Sweet", km: "ផ្អែមល្ហែម" }, { en: "Relaxed", km: "សប្បាយស្រួល" }],
    color: "#C2410C",
  },
  macaw: {
    title: { en: "The Life of the Party", km: "ពន្លឺនៃពិធីជប់លៀង" },
    text: { en: "Chatty and colourful, you bring energy to every room and love meeting new people.", km: "អ្នកចូលចិត្តនិយាយ និងមានពណ៌ចម្រុះ នាំថាមពលទៅគ្រប់កន្លែង ហើយចូលចិត្តជួបមនុស្សថ្មីៗ។" },
    traits: [{ en: "Social", km: "រួសរាយ" }, { en: "Funny", km: "កំប្លែង" }, { en: "Bright", km: "ភ្លឺស្វាង" }],
    color: "#DC2626",
  },
  flamingo: {
    title: { en: "The Graceful Team Player", km: "អ្នកស្រស់ស្អាតដែលចូលចិត្តក្រុម" },
    text: { en: "Elegant and friendly, you do your best when you are together with the people you love.", km: "អ្នកឆើតឆាយ និងរួសរាយ ធ្វើបានល្អបំផុតពេលនៅជាមួយមនុស្សដែលអ្នកស្រឡាញ់។" },
    traits: [{ en: "Elegant", km: "ឆើតឆាយ" }, { en: "Friendly", km: "រួសរាយ" }, { en: "Balanced", km: "មានតុល្យភាព" }],
    color: "#EC4899",
  },
  peacock: {
    title: { en: "The Creative Star", km: "តារាច្នៃប្រឌិត" },
    text: { en: "Artistic and bold, you love beautiful things and you are not afraid to shine.", km: "អ្នកមានសិល្បៈ និងហ៊ានបង្ហាញខ្លួន ស្រឡាញ់របស់ស្អាតៗ ហើយមិនខ្លាចភ្លឺស្វាងទេ។" },
    traits: [{ en: "Creative", km: "ច្នៃប្រឌិត" }, { en: "Confident", km: "ជឿជាក់លើខ្លួនឯង" }, { en: "Stylish", km: "ទាន់សម័យ" }],
    color: "#0891B2",
  },
  crocodile: {
    title: { en: "The Patient Planner", km: "អ្នករៀបចំផែនការដោយអត់ធ្មត់" },
    text: { en: "Patient and steady, you wait for the right moment and then act with total confidence.", km: "អ្នកអត់ធ្មត់ និងនឹងនរ រង់ចាំពេលវេលាត្រឹមត្រូវ ហើយធ្វើសកម្មភាពដោយទំនុកចិត្តពេញលេញ។" },
    traits: [{ en: "Patient", km: "អត់ធ្មត់" }, { en: "Strong", km: "រឹងមាំ" }, { en: "Calm", km: "ស្ងប់" }],
    color: "#15803D",
  },
  shark: {
    title: { en: "The Fearless Explorer", km: "អ្នករុករកដែលមិនខ្លាចអ្វីទាំងអស់" },
    text: { en: "Always moving and always curious, you love new places and big challenges.", km: "អ្នកតែងតែធ្វើដំណើរ និងចង់ដឹងជានិច្ច ចូលចិត្តកន្លែងថ្មីៗ និងបញ្ហាប្រឈមធំៗ។" },
    traits: [{ en: "Adventurous", km: "ចូលចិត្តផ្សងព្រេង" }, { en: "Energetic", km: "ពោរពេញថាមពល" }, { en: "Sharp", km: "ឆ្លាតរហ័ស" }],
    color: "#0369A1",
  },
};

export const MATCH_QUESTIONS: { q: L; answers: { a: L; points: PersonalityKey[] }[] }[] = [
  {
    q: { en: "Your perfect weekend looks like", km: "ចុងសប្តាហ៍ដ៏ល្អបំផុតរបស់អ្នក គឺ" },
    answers: [
      { a: { en: "A big party with all my friends", km: "ជប់លៀងធំជាមួយមិត្តទាំងអស់" }, points: ["macaw", "flamingo"] },
      { a: { en: "A quiet nap and good snacks", km: "ដេកលក់ស្ងាត់ៗ និងអាហារសម្រន់ឆ្ងាញ់ៗ" }, points: ["redpanda", "crocodile"] },
      { a: { en: "Exploring somewhere new", km: "ទៅរុករកកន្លែងថ្មី" }, points: ["shark", "giraffe"] },
      { a: { en: "Looking after my family", km: "មើលថែក្រុមគ្រួសារ" }, points: ["elephant", "lion"] },
    ],
  },
  {
    q: { en: "In a group project you are the one who", km: "ពេលធ្វើការជាក្រុម អ្នកជាមនុស្សដែល" },
    answers: [
      { a: { en: "Takes the lead", km: "ដឹកនាំក្រុម" }, points: ["lion"] },
      { a: { en: "Makes it look amazing", km: "ធ្វើឲ្យវាស្អាតអស្ចារ្យ" }, points: ["peacock", "flamingo"] },
      { a: { en: "Quietly does the hardest part", km: "ធ្វើផ្នែកពិបាកជាងគេដោយស្ងាត់ៗ" }, points: ["tiger", "crocodile"] },
      { a: { en: "Keeps everyone smiling", km: "ធ្វើឲ្យគ្រប់គ្នាញញឹម" }, points: ["macaw", "redpanda"] },
    ],
  },
  {
    q: { en: "Pick a place to relax", km: "ជ្រើសកន្លែងសម្រាក" },
    answers: [
      { a: { en: "A cool river or the sea", km: "ទន្លេត្រជាក់ ឬសមុទ្រ" }, points: ["shark", "crocodile"] },
      { a: { en: "A tall tree with a view", km: "ដើមឈើខ្ពស់ដែលមើលឃើញឆ្ងាយ" }, points: ["giraffe", "redpanda"] },
      { a: { en: "A sunny open field", km: "វាលស្មៅធំមានពន្លឺថ្ងៃ" }, points: ["lion", "elephant"] },
      { a: { en: "A colourful garden", km: "សួនផ្កាពណ៌ចម្រុះ" }, points: ["peacock", "macaw"] },
    ],
  },
  {
    q: { en: "Your friends would describe you as", km: "មិត្តភក្តិនឹងពណ៌នាអំពីអ្នកថា" },
    answers: [
      { a: { en: "Loyal and wise", km: "ស្មោះត្រង់ និងឆ្លាតវៃ" }, points: ["elephant"] },
      { a: { en: "Calm and patient", km: "ស្ងប់ស្ងាត់ និងអត់ធ្មត់" }, points: ["crocodile", "giraffe"] },
      { a: { en: "Bold and full of energy", km: "ក្លាហាន និងពោរពេញថាមពល" }, points: ["shark", "tiger"] },
      { a: { en: "Stylish and friendly", km: "ទាន់សម័យ និងរួសរាយ" }, points: ["flamingo", "peacock"] },
    ],
  },
  {
    q: { en: "Choose a snack", km: "ជ្រើសអាហារសម្រន់" },
    answers: [
      { a: { en: "Fresh fruit", km: "ផ្លែឈើស្រស់" }, points: ["macaw", "elephant"] },
      { a: { en: "Grilled meat", km: "សាច់អាំង" }, points: ["lion", "tiger"] },
      { a: { en: "Seafood", km: "អាហារសមុទ្រ" }, points: ["shark", "flamingo"] },
      { a: { en: "Something sweet, then a nap", km: "បង្អែមផ្អែម រួចដេកលក់" }, points: ["redpanda", "peacock"] },
    ],
  },
  {
    q: { en: "When something goes wrong you", km: "ពេលមានរឿងមិនល្អកើតឡើង អ្នក" },
    answers: [
      { a: { en: "Stay calm and wait for the right moment", km: "នៅស្ងប់ ហើយរង់ចាំពេលត្រឹមត្រូវ" }, points: ["crocodile", "giraffe"] },
      { a: { en: "Protect the people around me", km: "ការពារមនុស្សនៅជុំវិញ" }, points: ["lion", "elephant"] },
      { a: { en: "Try something new right away", km: "សាកល្បងវិធីថ្មីភ្លាមៗ" }, points: ["shark", "macaw"] },
      { a: { en: "Handle it alone, quietly", km: "ដោះស្រាយតែម្នាក់ឯងដោយស្ងាត់ៗ" }, points: ["tiger", "peacock"] },
    ],
  },
];
