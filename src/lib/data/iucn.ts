// IUCN Red List levels, most at risk first, in the Red List's own colours.
export const IUCN = [
  { key: "Critically Endangered", code: "CR", en: "Critically endangered", km: "ជិតផុតពូជបំផុត", color: "#D81E05", text: "text-white", enNote: "Could vanish from the wild very soon.", kmNote: "អាចបាត់ពីធម្មជាតិក្នុងពេលឆាប់ៗ។" },
  { key: "Endangered", code: "EN", en: "Endangered", km: "ជិតផុតពូជ", color: "#FC7F3F", text: "text-white", enNote: "Very few are left in the wild.", kmNote: "នៅសល់តិចតួចណាស់ក្នុងធម្មជាតិ។" },
  { key: "Vulnerable", code: "VU", en: "Vulnerable", km: "ងាយរងគ្រោះ", color: "#F9E814", text: "text-ink", enNote: "Numbers are falling fast.", kmNote: "ចំនួនកំពុងថយចុះលឿន។" },
  { key: "Near Threatened", code: "NT", en: "Near threatened", km: "ជិតរងគ្រោះ", color: "#CCE226", text: "text-ink", enNote: "Could be at risk soon.", kmNote: "អាចប្រឈមហានិភ័យឆាប់ៗ។" },
  { key: "Least Concern", code: "LC", en: "Least concern", km: "មិនសូវគួរឱ្យព្រួយបារម្ភ", color: "#60C659", text: "text-white", enNote: "Doing well in the wild for now.", kmNote: "សព្វថ្ងៃនៅមានច្រើនក្នុងធម្មជាតិ។" },
] as const;
