// Friendly "come and visit us" lines for the homepage, one per day.
// The day number picks the line, so it changes every day and the same
// line only comes back after the whole list has been used (3 weeks).
// `animal` is the animal_code whose real photo is shown next to the line
// (lines without one show that day's animal).
export const INVITES: { animal?: string; en: string; km: string }[] = [
  { animal: "GIRA-A-004", en: "Nala has been stretching her neck all morning, looking out for you. When are you coming?", km: "ណាឡាលូកកវែងៗ រកមើលអ្នកតាំងពីព្រឹក។ តើពេលណាអ្នកនឹងមកលេង?" },
  { animal: "LION-A-001", en: "Koma has practised his best roar just for you. Come and hear it for yourself!", km: "កូម៉ាបានហាត់គ្រហឹមយ៉ាងខ្លាំង សម្រាប់តែអ្នកប៉ុណ្ណោះ។ មកស្តាប់ផ្ទាល់ផង!" },
  { animal: "ELEP-A-003", en: "They say an elephant never forgets. Milo still remembers every friend who visits.", km: "គេនិយាយថាដំរីមិនដែលភ្លេចទេ។ មីឡូនៅចាំមិត្តគ្រប់រូបដែលមកលេង។" },
  { animal: "MACW-B-006", en: "Rio has been learning new words and would love to say hello to you.", km: "រីយ៉ូកំពុងរៀនពាក្យថ្មីៗ ហើយចង់ជម្រាបសួរអ្នកណាស់។" },
  { animal: "TIGER-A-002", en: "Soft stripes, long whiskers and a warm welcome are waiting for you.", km: "ឆ្នូតស្អាតៗ ពុកមាត់វែងៗ និងការស្វាគមន៍ដ៏កក់ក្តៅ កំពុងរង់ចាំអ្នក។" },
  { animal: "FLAM-B-007", en: "Maya is standing on one leg until you arrive, so please don't keep her waiting too long.", km: "ម៉ាយ៉ាឈរជើងម្ខាងរង់ចាំអ្នក។ សូមកុំឲ្យនាងរង់ចាំយូរពេកណា។" },
  { animal: "PAND-A-005", en: "Tiko has saved you the comfiest spot under the big tree.", km: "ទីកូបានទុកកន្លែងក្រោមដើមឈើធំដ៏ស្រួលបំផុត សម្រាប់អ្នក។" },
  { animal: "CROC-C-009", en: "Coco promises his friendliest smile, from a safe distance of course.", km: "កូកូសន្យាថានឹងញញឹមយ៉ាងរួសរាយ តែពីចម្ងាយសុវត្ថិភាពណា។" },
  { animal: "PEAC-B-008", en: "Sky is ready to open all his colourful feathers. It is a show made just for you.", km: "ស្កាយត្រៀមលាតស្លាបពណ៌ចម្រុះរបស់វា។ ជាការសម្តែងសម្រាប់តែអ្នក។" },
  { animal: "SHRK-D-010", en: "The water is calm and clear, and Finn is swimming by to say hello.", km: "ទឹកស្ងប់ និងថ្លាល្អ ហើយហ្វីនកំពុងហែលមកជម្រាបសួរអ្នក។" },
  { en: "Fresh air, green trees and happy animals. Your perfect day out is right here.", km: "ខ្យល់បរិសុទ្ធ ដើមឈើខៀវស្រងាត់ និងសត្វរីករាយ។ ថ្ងៃកម្សាន្តដ៏ល្អរបស់អ្នកនៅទីនេះ។" },
  { en: "Your next favourite photo is waiting for you at Green Wild Zoo.", km: "រូបថតដែលអ្នកនឹងចូលចិត្តបំផុត កំពុងរង់ចាំអ្នកនៅ Green Wild Zoo។" },
  { en: "Little explorers are always welcome here. Big smiles are guaranteed.", km: "អ្នករុករកតូចៗ តែងតែត្រូវបានស្វាគមន៍នៅទីនេះ។ ធានាថាមានតែស្នាមញញឹម។" },
  { en: "The best family memories often begin with a slow walk among the animals.", km: "អនុស្សាវរីយ៍គ្រួសារដ៏ល្អបំផុត តែងចាប់ផ្តើមពីការដើរលេងយឺតៗជាមួយសត្វ។" },
  { en: "Mornings are when we are most awake. Come early and say good morning to us.", km: "ពេលព្រឹកជាពេលដែលពួកយើងសកម្មបំផុត។ មកឲ្យព្រលឹម ហើយជម្រាបសួរពួកយើងផង។" },
  { en: "We have cool shade, tasty snacks and a little monkey who can't wait to meet you.", km: "យើងមានម្លប់ត្រជាក់ អាហារសម្រន់ឆ្ងាញ់ និងស្វាតូចមួយដែលចង់ជួបអ្នកខ្លាំងណាស់។" },
  { en: "Every visit helps us care for the animals. Thank you for being part of our family.", km: "រាល់ការមកលេងរបស់អ្នក ជួយយើងថែរក្សាសត្វ។ អរគុណដែលបានក្លាយជាផ្នែកមួយនៃគ្រួសារយើង។" },
  { en: "Butterflies, colourful birds and big cats. There is so much to discover in one day.", km: "មេអំបៅ បក្សីពណ៌ចម្រុះ និងសត្វខ្លាធំៗ។ មានរឿងច្រើនណាស់ដែលត្រូវស្វែងយល់ក្នុងមួយថ្ងៃ។" },
  { en: "Bring a hat and your curiosity. We will take care of the wonder.", km: "យកមួក និងចិត្តចង់ដឹងរបស់អ្នកមក។ ចំណែកភាពអស្ចារ្យ ទុកឲ្យពួកយើង។" },
  { en: "Scan the QR sign at each animal, collect points and become a true Zoo Explorer.", km: "ស្កេនផ្លាក QR របស់សត្វនីមួយៗ ប្រមូលពិន្ទុ ហើយក្លាយជាអ្នករុករកសួនសត្វពិតប្រាកដ។" },
  { en: "Rain or shine, the animals are always happy to see a friendly face.", km: "ភ្លៀងក្តី ថ្ងៃក្តី សត្វៗតែងរីករាយពេលបានឃើញមុខមិត្តភក្តិ។" },
];

/** Days since 1970 for a YYYY-MM-DD date (zoo time zone date string). */
export function dayNumber(date: string) {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
}
